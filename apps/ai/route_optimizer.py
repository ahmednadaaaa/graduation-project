import math

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in kilometers.
    """
    R = 6371.0 # Earth radius in km
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance

def optimize_route(start_lat, start_lon, students):
    """
    Nearest neighbor algorithm to optimize route for picking up students.
    
    students format:
    [
        {'id': 1, 'name': 'Ahmed', 'lat': 31.2, 'lon': 29.9},
        ...
    ]
    
    Returns ordered stops with ETA.
    """
    unvisited = list(students)
    ordered_stops = []
    
    current_lat = float(start_lat)
    current_lon = float(start_lon)
    
    total_distance_km = 0
    total_time_minutes = 0
    
    AVERAGE_SPEED_KMH = 30.0 # assume 30 km/h avg speed in city
    
    while unvisited:
        nearest = None
        min_dist = float('inf')
        
        for student in unvisited:
            dist = haversine(current_lat, current_lon, float(student['lat']), float(student['lon']))
            if dist < min_dist:
                min_dist = dist
                nearest = student
                
        # Add to route
        unvisited.remove(nearest)
        
        total_distance_km += min_dist
        # time = distance / speed
        time_minutes = (min_dist / AVERAGE_SPEED_KMH) * 60
        total_time_minutes += time_minutes
        
        # Assume 2 minutes wait time at each stop
        total_time_minutes += 2.0
        
        ordered_stops.append({
            'student_id': nearest['id'],
            'student_name': nearest['name'],
            'lat': nearest['lat'],
            'lon': nearest['lon'],
            'distance_from_prev_km': round(min_dist, 2),
            'accumulated_time_mins': round(total_time_minutes),
        })
        
        current_lat = float(nearest['lat'])
        current_lon = float(nearest['lon'])
        
    return {
        'total_distance_km': round(total_distance_km, 2),
        'total_time_minutes': round(total_time_minutes),
        'stops': ordered_stops
    }
