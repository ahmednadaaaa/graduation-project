from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)


def notify_student_boarding(student):
    """
    Notify student that their boarding was confirmed.
    Sends both WebSocket + Push Notification.
    Never raises.
    """
    try:
        bus_number = student.assigned_bus or ''
        title = '✅ تم تسجيل حضورك'
        body = f'مرحباً {student.user.full_name}، تم تسجيل صعودك للأتوبيس بنجاح'

        message = {
            'type':       'boarding_confirmed',
            'title':      title,
            'body':       body,
            'bus':        bus_number,
        }

        # WebSocket notification
        _send_websocket_notification(str(student.user.id), message)

        # Push notification
        fcm_token = getattr(student, 'fcm_token', None)
        if fcm_token:
            from apps.notifications.firebase import send_push_notification
            send_push_notification(
                fcm_token=fcm_token,
                title=title,
                body=body,
                data={'type': 'boarding_confirmed', 'bus': bus_number}
            )
        else:
            logger.debug(f"No FCM token for student {student.id} — WebSocket only")
    except Exception as e:
        logger.warning(f"notify_student_boarding failed for student {getattr(student, 'id', '?')}: {e}")


def notify_student_leaving(student):
    """
    Notify student that their leaving was confirmed.
    Never raises.
    """
    try:
        bus_number = student.assigned_bus or ''
        title = '👋 تم تسجيل مغادرتك'
        body = f'مرحباً {student.user.full_name}، تم تسجيل نزولك من الأتوبيس بنجاح'

        message = {
            'type':  'leaving_confirmed',
            'title': title,
            'body':  body,
            'bus':   bus_number,
        }

        _send_websocket_notification(str(student.user.id), message)

        fcm_token = getattr(student, 'fcm_token', None)
        if fcm_token:
            from apps.notifications.firebase import send_push_notification
            send_push_notification(
                fcm_token=fcm_token,
                title=title,
                body=body,
                data={'type': 'leaving_confirmed', 'bus': bus_number}
            )
    except Exception as e:
        logger.warning(f"notify_student_leaving failed for student {getattr(student, 'id', '?')}: {e}")


def notify_bus_approaching(student, distance_km: float, bus_number: str):
    """
    Notify student that their bus is approaching (within 2km).
    Only sends once per trip to avoid spam (controlled by caller via cache).
    Never raises.
    """
    try:
        distance_text = f"{distance_km:.1f} كم"
        title = '🚌 الأتوبيس قريب!'
        body = f'أتوبيسك رقم {bus_number} على بُعد {distance_text} منك، استعد!'

        message = {
            'type':     'bus_approaching',
            'title':    title,
            'body':     body,
            'bus':      bus_number,
            'distance': str(distance_km),
        }

        _send_websocket_notification(str(student.user.id), message)

        fcm_token = getattr(student, 'fcm_token', None)
        if fcm_token:
            from apps.notifications.firebase import send_push_notification
            send_push_notification(
                fcm_token=fcm_token,
                title=title,
                body=body,
                data={
                    'type':     'bus_approaching',
                    'bus':      bus_number,
                    'distance': str(distance_km),
                }
            )
    except Exception as e:
        logger.warning(f"notify_bus_approaching failed for student {getattr(student, 'id', '?')}: {e}")


def _send_websocket_notification(user_id: str, message: dict):
    """
    Internal: send WebSocket notification to a student via their user channel.
    Uses the existing UserNotificationConsumer group: user_<user_id>_notifications
    Never raises.
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{user_id}_notifications',
            {
                'type': 'notification',
                'data': message,
            }
        )
        logger.debug(f"WebSocket notification sent to user_{user_id}")
    except Exception as e:
        logger.warning(f"WebSocket notification failed for user {user_id}: {e}")
