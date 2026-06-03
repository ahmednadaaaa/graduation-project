import firebase_admin
from firebase_admin import credentials, messaging
import os
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase once — lazy init so server starts even without credentials file
_firebase_initialized = False


def _ensure_initialized():
    """Initialize Firebase only once, and only if credentials file exists."""
    global _firebase_initialized
    if _firebase_initialized or firebase_admin._apps:
        _firebase_initialized = True
        return True

    cred_path = os.environ.get('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json')
    if not os.path.exists(cred_path):
        logger.warning(
            f"Firebase credentials file not found at '{cred_path}'. "
            "Push notifications (FCM) will be disabled. "
            "WebSocket notifications will still work normally."
        )
        return False

    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info("Firebase initialized successfully.")
        return True
    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")
        return False


def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None) -> bool:
    """
    Send push notification to a specific device.
    Returns True if successful, False otherwise.
    Never raises — push failures must never break other features.
    """
    if not fcm_token:
        return False

    if not _ensure_initialized():
        return False

    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data={str(k): str(v) for k, v in (data or {}).items()},
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    priority='high',
                )
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound='default')
                )
            )
        )
        messaging.send(message)
        logger.debug(f"FCM push sent: {title}")
        return True
    except Exception as e:
        logger.warning(f"FCM send error: {e}")
        return False


def send_push_to_multiple(fcm_tokens: list, title: str, body: str, data: dict = None):
    """Send same notification to multiple devices."""
    if not fcm_tokens:
        return

    if not _ensure_initialized():
        return

    message = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        data={str(k): str(v) for k, v in (data or {}).items()},
        tokens=fcm_tokens,
    )
    try:
        response = messaging.send_each_for_multicast(message)
        logger.debug(f"FCM multicast sent to {len(fcm_tokens)} devices, success={response.success_count}")
    except Exception as e:
        logger.warning(f"FCM multicast error: {e}")
