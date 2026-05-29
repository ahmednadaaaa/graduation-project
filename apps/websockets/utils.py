from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification
from .serializers import NotificationSerializer

def send_user_notification(user, title, message, notif_type=Notification.NotifType.GENERAL, link=None):
    """
    Creates a notification in the database and broadcasts it via WebSocket.
    """
    # 1. Create in DB
    notif = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notif_type=notif_type,
        link=link
    )

    # 2. Broadcast via WebSocket
    channel_layer = get_channel_layer()
    group_name = f'user_{user.id}_notifications'
    
    serializer = NotificationSerializer(notif)

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type': 'notification',
            'data': serializer.data
        }
    )
    return notif
