import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class BusLocationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket بيبث موقع الأتوبيس live

    الفكرة:
    - كل أتوبيس عنده "group" باسمه: bus_BUS-01_location
    - أي حد يفتح WebSocket لأتوبيس معين → ينضم للـ group دي
    - لما الـ ESP32 يبعت موقع جديد → نبعت للـ group كلها
    - يعني كل المتصلين ياخدوا الموقع في نفس الوقت
    """

    async def connect(self):
        """
        بيتنادى لما حد يفتح WebSocket connection
        """
        # جيب رقم الأتوبيس من الـ URL
        # /ws/bus/BUS-01/location/ → bus_number = 'BUS-01'
        self.bus_number = self.scope['url_route']['kwargs']['bus_number']

        # اسم الـ group بتاعت الأتوبيس ده
        # كل المتصلين بنفس الأتوبيس في نفس الـ group
        self.group_name = f'bus_{self.bus_number}_location'

        # انضم للـ group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
            # channel_name = اسم فريد لكل connection
        )

        # قبل الـ connection
        await self.accept()

        # ابعت آخر موقع معروف فور الاتصال
        last_location = await self.get_last_location()
        if last_location:
            await self.send(text_data=json.dumps({
                'type': 'location_update',
                'data': last_location
            }))

    async def disconnect(self, close_code):
        """
        بيتنادى لما الاتصال ينقطع
        """
        # اخرج من الـ group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """
        بيتنادى لما الـ client يبعت message
        في الـ case ده مش محتاجين نستقبل حاجة من الـ client
        بس ممكن نستقبل ping للتأكد إن الاتصال شغال
        """
        data = json.loads(text_data)

        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))

    # ── الدالة دي بتتنادى من الـ group_send ──
    async def location_update(self, event):
        """
        لما حد يبعت للـ group نوع 'location_update'
        الدالة دي بتتنادى على كل المتصلين بالـ group

        event = الـ data اللي اتبعت للـ group
        """
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'data': event['data']
        }))

    @database_sync_to_async
    def get_last_location(self):
        """
        database_sync_to_async:
        WebSocket بيشتغل async (غير متزامن)
        بس Django ORM بيشتغل sync (متزامن)
        الـ decorator ده بيخلينا نكال الـ DB من كود async

        بيجيب آخر موقع للأتوبيس من الـ DB
        """
        from apps.bus.models import Bus
        from apps.bus.serializers import BusLocationSerializer

        try:
            bus = Bus.objects.get(bus_number=self.bus_number)
            location = bus.current_location

            if location:
                return BusLocationSerializer(location).data
            return None
        except Bus.DoesNotExist:
            return None


class AttendanceConsumer(AsyncWebsocketConsumer):
    """
    WebSocket بيبث أحداث الحضور live

    الاستخدام:
    - السائق فاتح الـ App → بيشوف مين ركب دلوقتي
    - الأدمن بيتابع الحضور real-time
    """

    async def connect(self):
        self.bus_number = self.scope['url_route']['kwargs']['bus_number']
        self.group_name = f'attendance_{self.bus_number}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

        # ابعت آخر 5 حضور فور الاتصال
        recent = await self.get_recent_attendance()
        await self.send(text_data=json.dumps({
            'type': 'recent_attendance',
            'data': recent
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        pass

    # ── بتتنادى لما يحصل حضور جديد ──
    async def attendance_event(self, event):
        """
        لما طالب يركب أو ينزل
        كل المتصلين بالـ group بتاعت الأتوبيس ده بياخدوا الإشعار
        """
        await self.send(text_data=json.dumps({
            'type': 'attendance_event',
            'data': event['data']
        }))

    @database_sync_to_async
    def get_recent_attendance(self):
        from apps.attendance.models import AttendanceLog
        from apps.attendance.serializers import AttendanceLogSerializer

        try:
            logs = AttendanceLog.objects.filter(
                bus__bus_number=self.bus_number,
                recognition_status='recognized'
            ).select_related(
                'student', 'student__user'
            )[:5]

            return AttendanceLogSerializer(logs, many=True).data
        except Exception:
            return []


class UserNotificationConsumer(AsyncWebsocketConsumer):
    """
    إشعارات شخصية لأي مستخدم (طالب، سائق، أدمن)
    """

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f'user_{self.user_id}_notifications'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

        await self.send(text_data=json.dumps({
            'type': 'connected',
            'message': 'Connected for notifications!'
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        pass

    async def notification(self, event):
        # We can send actual Notification models via this
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event['data']
        }))
