from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Bus, Route, BusLocation
from .serializers import (
    BusSerializer,
    RouteSerializer,
    BusLocationSerializer,
    UpdateBusLocationSerializer,
)


class BusListView(APIView):
    """
    GET /api/bus/         → قائمة كل الأتوبيسات
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # select_related → بيجيب الـ driver والـ route في query واحدة
        # بدلها من query لكل أتوبيس (أسرع بكتير)
        buses = Bus.objects.select_related(
            'driver', 'route'
        ).filter(is_active=True)

        serializer = BusSerializer(buses, many=True)
        return Response(serializer.data)


class BusDetailView(APIView):
    """
    GET /api/bus/<bus_number>/     → تفاصيل أتوبيس معين
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, bus_number):
        bus = get_object_or_404(
            Bus.objects.select_related('driver', 'route'),
            bus_number=bus_number
        )
        serializer = BusSerializer(bus)
        return Response(serializer.data)


class BusLocationHistoryView(APIView):
    """
    GET /api/bus/<bus_number>/locations/   → تاريخ مواقع الأتوبيس
    بنرجع آخر 50 موقع بس
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, bus_number):
        bus = get_object_or_404(Bus, bus_number=bus_number)

        # آخر 50 موقع — [:50] في Django ORM = LIMIT 50
        locations = bus.locations.all()[:50]

        serializer = BusLocationSerializer(locations, many=True)
        return Response({
            'bus_number': bus_number,
            'count': len(serializer.data),
            'locations': serializer.data
        })


class UpdateBusLocationView(APIView):
    """
    POST /api/bus/location/update/

    ده الـ endpoint اللي الـ ESP32 بيبعت عليه الموقع
    AllowAny → مش محتاج token (الـ ESP32 مش بيعمل login)
    في الـ Production هنأمنه بـ API Key
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UpdateBusLocationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # جيب الأتوبيس من الـ bus_number
        bus = get_object_or_404(
            Bus,
            bus_number=serializer.validated_data['bus_number']
        )

        # احفظ الموقع الجديد
        location = BusLocation.objects.create(
            bus=bus,
            latitude=serializer.validated_data['latitude'],
            longitude=serializer.validated_data['longitude'],
            speed_kmh=serializer.validated_data.get('speed_kmh'),
            heading=serializer.validated_data.get('heading'),
        )

        # حافظ على الـ database نضيف:
        # امسح المواقع القديمة وسيب بس آخر 200
        self._cleanup_old_locations(bus)

        # حدّث حالة الأتوبيس إنه "في الطريق"
        if bus.status != Bus.Status.EN_ROUTE:
            bus.status = Bus.Status.EN_ROUTE
            bus.save(update_fields=['status'])

        # ── الجديد: ابعت الموقع على الـ WebSocket ──
        self._broadcast_location(bus, location)

        # ── تحقق من قرب الأتوبيس من الطلاب وابعت إشعار ──
        try:
            from apps.notifications.proximity import check_bus_approaching_students
            check_bus_approaching_students(
                bus=bus,
                latitude=float(location.latitude),
                longitude=float(location.longitude),
            )
        except Exception:
            pass  # لا نوقف تحديث الموقع أبدًا بسبب الإشعارات

        return Response(
            {
                'message': 'تم تحديث الموقع',
                'bus': bus.bus_number,
                'location': BusLocationSerializer(location).data
            },
            status=status.HTTP_201_CREATED
        )

    def _broadcast_location(self, bus, location):
        """
        ابعت الموقع الجديد لكل المتصلين بـ WebSocket الأتوبيس ده
        """
        try:
            channel_layer = get_channel_layer()

            async_to_sync(channel_layer.group_send)(
                f'bus_{bus.bus_number}_location',
                {
                    # location_update → def location_update(self, event)
                    'type': 'location_update',
                    'data': {
                        'bus_number': bus.bus_number,
                        'latitude': str(location.latitude),
                        'longitude': str(location.longitude),
                        'speed_kmh': str(location.speed_kmh) if location.speed_kmh else None,
                        'heading': str(location.heading) if location.heading else None,
                        'timestamp': location.timestamp.isoformat(),
                        'status': bus.status,
                    }
                }
            )
        except Exception as e:
            # فشل الـ WebSocket لا يجب أن يعطل تسجيل الموقع في قاعدة البيانات
            print(f"WebSocket Broadcast Error: {e}")

    def _cleanup_old_locations(self, bus):
        """
        بنحتفظ بآخر 200 موقع بس لكل أتوبيس
        علشان الـ database متملاش

        الخطوات:
        1. جيب الـ IDs بتاعة آخر 200 موقع
        2. امسح أي حاجة تانية
        """
        # values_list('id', flat=True) → بيرجع list من الـ IDs بس
        recent_ids = list(
            bus.locations
            .order_by('-timestamp')
            .values_list('id', flat=True)[:200]
        )

        # امسح أي موقع مش في الـ list دي
        bus.locations.exclude(id__in=recent_ids).delete()


class RouteListView(APIView):
    """
    GET /api/bus/routes/    → كل خطوط السير
    POST /api/bus/routes/   → إنشاء خط سير جديد
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        routes = Route.objects.prefetch_related('stops').all()
        serializer = RouteSerializer(routes, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Only admin can create routes
        if request.user.role != 'admin':
            return Response({'error': 'Admins only'}, status=403)
        
        serializer = RouteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RouteDetailView(APIView):
    """
    GET /api/bus/routes/<id>/    → تفاصيل خط سير معين
    PATCH /api/bus/routes/<id>/  → تعديل خط سير
    DELETE /api/bus/routes/<id>/ → حذف خط سير
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, route_id):
        route = get_object_or_404(Route.objects.prefetch_related('stops'), id=route_id)
        serializer = RouteSerializer(route)
        return Response(serializer.data)

    def patch(self, request, route_id):
        if request.user.role != 'admin':
            return Response({'error': 'Admins only'}, status=403)
            
        route = get_object_or_404(Route, id=route_id)
        serializer = RouteSerializer(route, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, route_id):
        if request.user.role != 'admin':
            return Response({'error': 'Admins only'}, status=403)
            
        route = get_object_or_404(Route, id=route_id)
        route.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentBusLocationView(APIView):
    """
    GET /api/bus/<bus_number>/location/   → آخر موقع للأتوبيس دلوقتي
    ده بيتستخدم من الـ Mobile App
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, bus_number):
        bus = get_object_or_404(Bus, bus_number=bus_number)

        # current_location هو الـ property من الـ Model
        location = bus.current_location

        if not location:
            return Response(
                {'message': 'مفيش موقع متاح دلوقتي'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'bus_number': bus_number,
            'status': bus.status,
            'driver': bus.driver_name,
            'location': BusLocationSerializer(location).data
        })


import requests
from django.conf import settings

class DirectionsProxyView(APIView):
    """
    GET /api/bus/directions/?origin=LAT,LNG&destination=LAT,LNG
    Proxy for Google Directions API to avoid CORS issues in the frontend.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        origin = request.query_params.get('origin')
        destination = request.query_params.get('destination')
        api_key = settings.GOOGLE_MAPS_API_KEY # Ensure this is in settings.py

        if not origin or not destination:
            return Response({'error': 'origin and destination are required'}, status=400)

        url = f"https://maps.googleapis.com/maps/api/directions/json?origin={origin}&destination={destination}&key={api_key}"
        
        try:
            response = requests.get(url)
            return Response(response.json())
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class DriverStudentListView(APIView):

    """
    GET /api/bus/my-students/
    قائمة الطلاب المعينين لأتوبيس السائق الحالي
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'driver':
            return Response({'error': 'بس السواقين'}, status=403)
            
        bus = Bus.objects.filter(driver=request.user).first()
        if not bus:
            return Response({'error': 'مفيش أتوبيس مخصص ليك'}, status=404)
            
        from apps.students.models import StudentProfile
        students = StudentProfile.objects.filter(assigned_bus=bus.bus_number).select_related('user')
        
        return Response([
            {
                'id': s.id,
                'name': s.user.full_name,
                'email': s.user.email,
                'university_id': s.university_id,
                'status': 'waiting', # الوضع الافتراضي في بداية الرحلة
                'pickup_point': s.department or '—'
            }
            for s in students
        ])

class DriverLocationView(APIView):
    """
    POST /api/bus/driver/location/
    استقبال إحداثيات السائق الحية عبر الموبايل.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        bus_number = request.data.get('bus_number')

        # 1. التحقق من وجود البيانات
        if not latitude or not longitude or not bus_number:
            return Response(
                {"error": "Missing fields. latitude, longitude, and bus_number are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. التحقق من وجود الأتوبيس وأن المستخدم الحالي هو سائقه
        bus = get_object_or_404(Bus, bus_number=bus_number)

        if bus.driver != request.user:
            return Response(
                {"error": "You are not authorized as the driver for this bus."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 3. حفظ الموقع في قاعدة البيانات
        location = BusLocation.objects.create(
            bus=bus,
            latitude=latitude,
            longitude=longitude
        )

        # تحديث حالة الأتوبيس إذا لم يكن "في الطريق"
        if bus.status != Bus.Status.EN_ROUTE:
            bus.status = Bus.Status.EN_ROUTE
            bus.save(update_fields=['status'])

        # 4. إرسال التحديث عبر WebSocket
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'bus_{bus.bus_number}_location',
                {
                    'type': 'location_update',
                    'data': {
                        'bus_number': bus.bus_number,
                        'latitude': str(location.latitude),
                        'longitude': str(location.longitude),
                        'timestamp': location.timestamp.isoformat(),
                        'status': bus.status,
                    }
                }
            )
        except Exception as e:
            print(f"WebSocket Broadcast Error in DriverLocationView: {e}")

        # 4b. تحقق من قرب الأتوبيس من الطلاب وابعت إشعار
        try:
            from apps.notifications.proximity import check_bus_approaching_students
            check_bus_approaching_students(
                bus=bus,
                latitude=float(location.latitude),
                longitude=float(location.longitude),
            )
        except Exception:
            pass  # لا نوقف تحديث الموقع أبدًا بسبب الإشعارات

        # 5. الرد بنجاح العملية
        return Response({"status": "ok"})

