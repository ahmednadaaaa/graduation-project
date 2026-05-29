from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .route_optimizer import optimize_route

class OptimizeRouteView(APIView):
    """
    POST /api/ai/optimize-route/
    Body:
    {
        "start_lat": 31.2,
        "start_lon": 29.9,
        "students": [
            {"id": 1, "name": "Ahmed", "lat": 31.21, "lon": 29.91},
            ...
        ]
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        start_lat = request.data.get('start_lat')
        start_lon = request.data.get('start_lon')
        students = request.data.get('students', [])
        
        if start_lat is None or start_lon is None:
            return Response({"error": "start_lat and start_lon are required"}, status=400)
            
        if not students:
            return Response({
                'total_distance_km': 0,
                'total_time_minutes': 0,
                'stops': []
            })
            
        try:
            result = optimize_route(start_lat, start_lon, students)
            return Response(result)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
