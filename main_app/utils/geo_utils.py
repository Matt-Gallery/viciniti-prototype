"""
Utility functions for geocoding and spatial calculations
"""

import requests
from geopy.geocoders import Nominatim
from django.conf import settings
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance

# Initialize the geocoder
geocoder = Nominatim(user_agent="viciniti/1.0")

def geocode_address(address):
    """
    Convert an address string to latitude and longitude
    
    Args:
        address (str): The full address to geocode
        
    Returns:
        tuple: (latitude, longitude) or None if geocoding failed
    """
    try:
        location = geocoder.geocode(address)
        if location:
            return (location.latitude, location.longitude)
        return None
    except Exception as e:
        print(f"Geocoding error: {e}")
        return None

def format_address(address_parts):
    """
    Format address components into a single string
    
    Args:
        address_parts (dict): Dictionary containing address components
        
    Returns:
        str: Formatted address string
    """
    components = []
    
    if address_parts.get('address_line1'):
        components.append(address_parts['address_line1'])
    
    if address_parts.get('address_line2'):
        components.append(address_parts['address_line2'])
    
    city_state = []
    if address_parts.get('city'):
        city_state.append(address_parts['city'])
    
    if address_parts.get('state'):
        city_state.append(address_parts['state'])
    
    if city_state:
        components.append(', '.join(city_state))
    
    if address_parts.get('postal_code'):
        components.append(address_parts['postal_code'])
    
    if address_parts.get('country'):
        components.append(address_parts['country'])
    
    return ', '.join(components)

def calculate_distance(point1, point2, unit='miles'):
    """
    Calculate the distance between two points
    
    Args:
        point1 (Point): First geographic point
        point2 (Point): Second geographic point
        unit (str): Distance unit ('miles' or 'km')
        
    Returns:
        float: Distance in specified units
    """
    if not point1 or not point2:
        return None
    
    # Ensure points are using the correct SRID
    if point1.srid != 4326:
        point1 = Point(point1.x, point1.y, srid=4326)
    
    if point2.srid != 4326:
        point2 = Point(point2.x, point2.y, srid=4326)
    
    # Calculate distance in meters
    distance_m = point1.distance(point2) * 100000  # Approximation
    
    # Convert to requested units
    if unit == 'km':
        return distance_m / 1000
    else:  # miles
        return distance_m / 1609.34

def find_nearby_appointments(latitude, longitude, radius_miles=1, provider=None):
    """
    Find appointments near a given location
    
    Args:
        latitude (float): Latitude coordinate
        longitude (float): Longitude coordinate
        radius_miles (float): Search radius in miles
        provider (ServiceProvider): Optional provider to filter by
        
    Returns:
        QuerySet: Appointments within the radius, ordered by distance
    """
    from main_app.models import Appointment
    return Appointment.get_nearby_appointments(latitude, longitude, radius_miles, provider)

def find_nearby_services(latitude, longitude, radius_miles=25, category=None):
    """
    Find services near a given location
    
    Args:
        latitude (float): Latitude coordinate
        longitude (float): Longitude coordinate
        radius_miles (float): Search radius in miles
        category (str): Optional service category to filter by
        
    Returns:
        QuerySet: Services within the radius, ordered by distance
    """
    from main_app.models import Service
    return Service.get_nearby_services(latitude, longitude, radius_miles, category)

def calculate_proximity_discounts(appointment_location, provider):
    """
    Calculate potential discounts based on proximity to other appointments
    
    Args:
        appointment_location (Point): Geographic location of the new appointment
        provider (ServiceProvider): The service provider
        
    Returns:
        dict: Discount information including tier, percentage, etc.
    """
    from main_app.models import Appointment, ProximityDiscountTier, ProximityDiscount
    
    if not appointment_location or not provider:
        return None
    
    # Find nearby appointments
    nearby_appointments = find_nearby_appointments(
        appointment_location.y, 
        appointment_location.x, 
        radius_miles=2, 
        provider=provider
    )
    
    # Get count of nearby appointments
    count = nearby_appointments.count()
    if count == 0:
        return None
    
    # Find applicable discount tier based on distance
    # First, get the closest appointment
    closest_appointment = nearby_appointments.first()
    if not closest_appointment or not hasattr(closest_appointment, 'distance'):
        return None
    
    # Convert distance from meters to desired unit (yards or miles)
    distance_meters = closest_appointment.distance.m
    distance_yards = distance_meters * 1.09361  # Convert meters to yards
    distance_miles = distance_meters / 1609.34  # Convert meters to miles
    
    # Find applicable discount tier
    applicable_tier = None
    for tier in provider.discount_tiers.all():
        # Convert tier min/max distances to a common unit (yards)
        min_dist = tier.min_distance
        max_dist = tier.max_distance
        
        if tier.distance_unit == 'miles':
            min_dist *= 1760  # Convert miles to yards
            max_dist *= 1760  # Convert miles to yards
        
        # Check if our distance falls within this tier
        if min_dist <= distance_yards <= max_dist:
            applicable_tier = tier
            break
    
    if not applicable_tier:
        return None
    
    # Limit appointment count to maximum defined in discounts
    count = min(count, 5)  # Assuming 5 is the max defined count
    
    # Get the discount for this tier and appointment count
    try:
        discount = ProximityDiscount.objects.get(
            tier=applicable_tier,
            appointment_count=count
        )
        
        return {
            'tier': applicable_tier.tier,
            'distance': distance_yards if applicable_tier.distance_unit == 'yards' else distance_miles,
            'distance_unit': applicable_tier.distance_unit,
            'nearby_appointments': count,
            'discount_percentage': float(discount.discount_percentage)
        }
    except ProximityDiscount.DoesNotExist:
        return None 