"""
apps/ai_service/tasks.py

Async Celery task for face recognition.
Runs in a background worker so the ESP32 HTTP response is instant (202).

Design decisions:
- Accepts image as base64 string (bytes are not JSON-serializable for Celery broker)
- Wraps bytes in BytesIO so face_recognition_service.identify_student() works unchanged
- Uses the exact same models as ScanFaceView (AttendanceLog, DailyAttendance, Bus from apps.bus)
- Does NOT duplicate embedding/matching logic — delegates to face_recognition_service
- Broadcasts WebSocket event using the same group/message format as ScanFaceView
- Sends personal notification via send_user_notification
"""

import base64
import logging
from io import BytesIO

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, soft_time_limit=10, time_limit=15)
def process_face_recognition(self, image_b64: str, bus_number: str, action: str):
    """
    Async face recognition task.
    Runs in Celery worker — keeps API response fast.

    Args:
        image_b64:   Base64-encoded image bytes from ESP32.
        bus_number:  Bus identifier string (e.g. 'BUS-01').
        action:      'boarding' or 'leaving'.

    Returns:
        dict with 'status' key and relevant details.
    """
    try:
        from django.utils import timezone

        from apps.ai.face_recognition_service import face_recognition_service
        from apps.attendance.models import AttendanceLog, DailyAttendance
        from apps.bus.models import Bus

        # ── 1. Decode image ──────────────────────────────────────────────────
        image_bytes = base64.b64decode(image_b64)
        image_file = BytesIO(image_bytes)
        # Give it a name so ImageField-based validators don't choke if needed
        image_file.name = 'scan.jpg'

        # ── 2. Validate bus exists ────────────────────────────────────────────
        try:
            bus = Bus.objects.get(bus_number=bus_number)
        except Bus.DoesNotExist:
            logger.warning(f'Bus not found: {bus_number}')
            return {'status': 'error', 'reason': f'Bus {bus_number} not found'}

        # ── 3. Run face recognition (embedding + matching — no duplication) ──
        recognition_result = face_recognition_service.identify_student(image_file)

        if not recognition_result['found']:
            logger.info(
                f'Face not recognized on bus {bus_number}: '
                f'{recognition_result.get("error", "no match")}'
            )
            # Still save an unrecognized log so operators can review the image
            _save_unrecognized_log(bus, action, image_bytes)
            return {
                'status': 'unrecognized',
                'reason': recognition_result.get('error', 'no match'),
            }

        student = recognition_result['student']
        confidence = recognition_result['confidence']

        # ── 4. Save AttendanceLog ─────────────────────────────────────────────
        current_location = bus.current_location
        log_data = {
            'bus': bus,
            'action': action,
            'student': student,
            'recognition_status': AttendanceLog.Status.RECOGNIZED,
            'confidence_score': confidence,
        }
        if current_location:
            log_data['bus_latitude'] = current_location.latitude
            log_data['bus_longitude'] = current_location.longitude

        attendance_log = AttendanceLog.objects.create(**log_data)
        logger.info(
            f'AttendanceLog created: student={student.user.full_name} '
            f'bus={bus_number} action={action} confidence={confidence:.2f}'
        )

        # ── 5. Update DailyAttendance summary ────────────────────────────────
        _update_daily_attendance(student, action, attendance_log)

        # ── 6. WebSocket broadcast ────────────────────────────────────────────
        _broadcast_attendance(bus_number, student, action, confidence)

        # ── 7. Personal notification to student ──────────────────────────────
        _notify_student(student, action, bus_number)

        return {
            'status': 'recognized',
            'student': student.user.full_name,
            'score': round(confidence, 4),
        }

    except Exception as exc:
        logger.error(f'Face recognition task failed for bus {bus_number}: {exc}', exc_info=True)
        raise self.retry(exc=exc, countdown=2)


# ── Private helpers ───────────────────────────────────────────────────────────

def _save_unrecognized_log(bus, action, image_bytes):
    """Save an AttendanceLog row for unrecognized faces (no student FK)."""
    try:
        from apps.attendance.models import AttendanceLog
        AttendanceLog.objects.create(
            bus=bus,
            action=action,
            student=None,
            recognition_status=AttendanceLog.Status.UNRECOGNIZED,
            confidence_score=0.0,
        )
    except Exception as e:
        logger.warning(f'Could not save unrecognized log: {e}')


def _update_daily_attendance(student, action, log):
    """Mirror of ScanFaceView._update_daily_attendance — kept in sync here."""
    from django.utils import timezone
    from apps.attendance.models import DailyAttendance

    today = timezone.now().date()
    daily, _ = DailyAttendance.objects.get_or_create(
        student=student,
        date=today,
        defaults={'status': DailyAttendance.AttendanceStatus.ABSENT},
    )

    if action == 'boarding':
        daily.status = DailyAttendance.AttendanceStatus.PRESENT
        daily.boarding_time = log.timestamp
    elif action == 'leaving':
        daily.leaving_time = log.timestamp

    daily.save()


def _broadcast_attendance(bus_number, student, action, confidence):
    """Send attendance event to the bus WebSocket group."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'attendance_{bus_number}',
            {
                'type': 'attendance_event',
                'data': {
                    'student_name': student.user.full_name,
                    'university_id': student.university_id,
                    'action': action,
                    'confidence': round(confidence * 100, 1),
                    'bus_number': bus_number,
                },
            },
        )
        logger.info(f'WebSocket broadcast sent for bus {bus_number}')
    except Exception as ws_err:
        logger.warning(f'WebSocket broadcast failed: {ws_err}')


def _notify_student(student, action, bus_number):
    """Send personal in-app notification to the student."""
    try:
        from apps.websockets.utils import send_user_notification
        from apps.websockets.models import Notification

        action_text = 'ركبت الأتوبيس' if action == 'boarding' else 'نزلت من الأتوبيس'
        send_user_notification(
            user=student.user,
            title='تسجيل حضور',
            message=f'تم تسجيل أنك {action_text} رقم {bus_number}',
            notif_type=Notification.NotifType.ATTENDANCE,
            link='/student-dashboard',
        )
    except Exception as e:
        logger.warning(f'Failed to send student notification: {e}')
