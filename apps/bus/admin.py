from django.contrib import admin

from .models import Bus, BusLocation, Route, RouteStop


class RouteStopInline(admin.TabularInline):
    model = RouteStop
    extra = 1
    ordering = ('order',)


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'total_distance_km', 'estimated_duration_minutes', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    inlines = [RouteStopInline]


@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = (
        'bus_number',
        'plate_number',
        'route',
        'driver',
        'status',
        'is_active',
        'updated_at',
    )
    list_filter = ('status', 'is_active', 'route')
    search_fields = ('bus_number', 'plate_number', 'driver__email', 'driver__full_name')
    autocomplete_fields = ('driver', 'route')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(BusLocation)
class BusLocationAdmin(admin.ModelAdmin):
    list_display = ('id', 'bus', 'latitude', 'longitude', 'speed_kmh', 'timestamp')
    list_filter = ('bus',)
    search_fields = ('bus__bus_number', 'bus__plate_number')
    autocomplete_fields = ('bus',)
    date_hierarchy = 'timestamp'
    readonly_fields = ('timestamp',)
