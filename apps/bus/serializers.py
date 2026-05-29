from rest_framework import serializers
from .models import Bus, Route, RouteStop, BusLocation


class RouteStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteStop
        fields = [
            'id', 'name', 'latitude', 'longitude',
            'order', 'estimated_arrival_minutes'
        ]


class RouteSerializer(serializers.ModelSerializer):
    # بيجيب المحطات مع الـ Route
    stops = RouteStopSerializer(many=True)
    buses_count = serializers.ReadOnlyField()

    class Meta:
        model = Route
        fields = [
            'id', 'name', 'description',
            'total_distance_km', 'estimated_duration_minutes',
            'is_active', 'stops', 'buses_count'
        ]

    def create(self, validated_data):
        stops_data = validated_data.pop('stops', [])
        route = Route.objects.create(**validated_data)
        for stop_data in stops_data:
            RouteStop.objects.create(route=route, **stop_data)
        return route

    def update(self, instance, validated_data):
        stops_data = validated_data.pop('stops', None)
        
        # Update Route fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if stops_data is not None:
            # Delete old stops and create new ones (simplest approach for now)
            instance.stops.all().delete()
            for stop_data in stops_data:
                RouteStop.objects.create(route=instance, **stop_data)
        
        return instance


class BusLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusLocation
        fields = [
            'id', 'latitude', 'longitude',
            'speed_kmh', 'heading', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']


class BusSerializer(serializers.ModelSerializer):
    """
    Serializer شامل للأتوبيس مع آخر موقع
    """
    # بيجيب آخر موقع للأتوبيس
    current_location = BusLocationSerializer(read_only=True)

    # بيانات السائق
    driver_name = serializers.ReadOnlyField()

    # اسم الخط بدل الـ ID بس
    route_name = serializers.CharField(
        source='route.name',
        read_only=True,
        default=None
    )

    class Meta:
        model = Bus
        fields = [
            'id', 'bus_number', 'plate_number', 'capacity',
            'status', 'is_active', 'driver_name',
            'route', 'route_name', 'current_location',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UpdateBusLocationSerializer(serializers.Serializer):
    """
    Serializer خاص لاستقبال موقع GPS من الـ ESP32
    مش بنستخدم ModelSerializer هنا لأننا محتاجين
    نعمل validations خاصة
    """
    bus_number = serializers.CharField(max_length=20)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    speed_kmh = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,  # مش إجباري
        allow_null=True
    )
    heading = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True
    )

    def validate_latitude(self, value):
        """
        latitude لازم تكون بين -90 و 90
        """
        if value < -90 or value > 90:
            raise serializers.ValidationError(
                'latitude لازم تكون بين -90 و 90'
            )
        return value

    def validate_longitude(self, value):
        """
        longitude لازم تكون بين -180 و 180
        """
        if value < -180 or value > 180:
            raise serializers.ValidationError(
                'longitude لازم تكون بين -180 و 180'
            )
        return value
