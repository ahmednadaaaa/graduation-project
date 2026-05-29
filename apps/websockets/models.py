"""
Notification app — stores and broadcasts real-time notifications.

Notification types:
  - bus_near       → sent to student when bus is within 500m
  - bus_delayed    → sent to student when bus is late
  - attendance     → sent to student when their face is recognized (boarding/leaving)
  - new_user       → sent to admin when a new user registers and needs approval
  - route_updated  → sent to driver when their route changes

Each notification is stored in the DB AND pushed via WebSocket.
"""
from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    One notification record per user per event.
    """

    class NotifType(models.TextChoices):
        BUS_NEAR     = 'bus_near',      'Bus Nearby'
        BUS_DELAYED  = 'bus_delayed',   'Bus Delayed'
        ATTENDANCE   = 'attendance',    'Attendance Recorded'
        NEW_USER     = 'new_user',      'New User Registration'
        ROUTE_UPDATE = 'route_updated', 'Route Updated'
        APPROVED     = 'approved',      'Account Approved'
        REJECTED     = 'rejected',      'Account Rejected'
        GENERAL      = 'general',       'General'

    # Who receives this notification
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    # Short title shown in the bell popup
    title = models.CharField(max_length=100)

    # Full message body
    message = models.TextField()

    # Category — used for icon/color on frontend
    notif_type = models.CharField(
        max_length=20,
        choices=NotifType.choices,
        default=NotifType.GENERAL
    )

    # Has the user opened/read this notification?
    is_read = models.BooleanField(default=False)

    # Optional link target (e.g. "/attendance/42/")
    link = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notif_type}] {self.user.email}: {self.title}"

    def mark_read(self):
        """Mark this notification as read."""
        self.is_read = True
        self.save(update_fields=['is_read'])
