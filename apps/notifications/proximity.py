import math
from django.utils import timezone
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS points using Haversine formula.
    Returns distance in kilometers.
    """
    R = 6371  # Earth radius in km

    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (math.sin(dlat / 2) ** 2 +
         math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2)

    c = 2 * math.asin(math.sqrt(a))

    return R * c


def check_bus_approaching_students(bus, latitude: float, longitude: float):
    """
    Called every time bus location updates.
    Checks if bus is within 2km of any student's home location.
    Sends notification only ONCE per hour per student (using Django cache).
    Never raises — bus location update must always succeed.
    """
    try:
        from apps.students.models import StudentProfile
        from apps.notifications.helpers import notify_bus_approaching

        APPROACHING_DISTANCE_KM = 2.0

        # Get all students assigned to this bus who have a home location set.
        # Note: assigned_bus is a CharField (bus_number string), not a ForeignKey.
        students = StudentProfile.objects.filter(
            assigned_bus=bus.bus_number,
            is_face_registered=True,
            home_latitude__isnull=False,
            home_longitude__isnull=False,
        ).select_related('user')

        if not students.exists():
            return

        today = timezone.now().date()

        for student in students:
            # Cache key: one notification per student per bus per day
            cache_key = f'approaching_notified_{bus.bus_number}_{student.id}_{today}'

            # Skip if already notified today
            if cache.get(cache_key):
                continue

            try:
                # Calculate distance between bus and student home
                distance = calculate_distance_km(
                    latitude,
                    longitude,
                    float(student.home_latitude),
                    float(student.home_longitude),
                )
            except (TypeError, ValueError) as e:
                logger.warning(f"Could not calculate distance for student {student.id}: {e}")
                continue

            # Notify if within 2km
            if distance <= APPROACHING_DISTANCE_KM:
                notify_bus_approaching(student, distance, bus.bus_number)
                # Mark as notified — don't notify again for 1 hour
                cache.set(cache_key, True, timeout=3600)
                logger.info(
                    f"Bus approaching notification sent: bus={bus.bus_number}, "
                    f"student={student.id}, distance={distance:.2f}km"
                )

    except Exception as e:
        logger.error(f"check_bus_approaching_students error: {e}")
