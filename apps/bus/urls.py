from django.urls import path
from .views import (
    BusListView,
    BusDetailView,
    BusLocationHistoryView,
    UpdateBusLocationView,
    RouteListView,
    RouteDetailView,
    CurrentBusLocationView,
    DriverStudentListView,
    DirectionsProxyView,
    DriverLocationView,
)

urlpatterns = [
    # Directions Proxy
    path('directions/', DirectionsProxyView.as_view(), name='directions-proxy'),
    
    # Routes
    path('routes/', RouteListView.as_view(), name='route-list'),
    path('routes/all/', RouteListView.as_view(), name='route-list-legacy'),
    path('routes/<int:route_id>/', RouteDetailView.as_view(), name='route-detail'),

    # Buses
    path('', BusListView.as_view(), name='bus-list'),
    path('my-students/', DriverStudentListView.as_view(), name='driver-students'),
    path('<str:bus_number>/', BusDetailView.as_view(), name='bus-detail'),
    path('<str:bus_number>/locations/', BusLocationHistoryView.as_view(), name='bus-location-history'),
    path('<str:bus_number>/location/', CurrentBusLocationView.as_view(), name='bus-current-location'),
    
    # Location Update (ESP32)
    path('location/update/', UpdateBusLocationView.as_view(), name='bus-location-update'),
    
    # Location Update (Driver App)
    path('driver/location/', DriverLocationView.as_view(), name='driver-location'),
]
