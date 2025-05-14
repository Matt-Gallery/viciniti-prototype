#!/usr/bin/env python
"""
Verification script for GeoDjango setup
Run this with: python check_geodjango.py
"""
import os
import sys
import traceback

# Set Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "viciniti.settings")

def print_section(title):
    """Print a section heading"""
    print("\n" + "="*40)
    print(title)
    print("="*40)

def check_mark(success):
    """Return a check mark or X based on success"""
    return "✅" if success else "❌"

print_section("1. Checking Python and Django")
print(f"Python version: {sys.version}")

try:
    import django
    print(f"{check_mark(True)} Django version: {django.get_version()}")
    django.setup()  # Initialize Django
except ImportError:
    print(f"{check_mark(False)} Django not installed")
    sys.exit(1)

print_section("2. Checking GeoDjango Base Libraries")
try:
    from django.contrib.gis.geos import Point
    from django.contrib.gis.measure import Distance
    point = Point(0, 0)
    print(f"{check_mark(True)} Django GIS base libraries available")
except ImportError as e:
    print(f"{check_mark(False)} Error importing GeoDjango libraries: {e}")

try:
    from geopy.geocoders import Nominatim
    print(f"{check_mark(True)} Geopy geocoding libraries available")
except ImportError as e:
    print(f"{check_mark(False)} Error importing geopy: {e}")

print_section("3. Checking Database Configuration")
try:
    from django.db import connection
    
    # Try to identify the database engine
    engine = connection.settings_dict['ENGINE']
    print(f"Database engine: {engine}")
    
    spatial_db = any(x in engine for x in ['postgis', 'spatialite', 'gis'])
    print(f"{check_mark(spatial_db)} Using a spatial database")
    
    # Check for specific spatial database
    if 'postgis' in engine:
        print("Testing PostGIS connection...")
        try:
            cursor = connection.cursor()
            cursor.execute("SELECT PostGIS_full_version();")
            version = cursor.fetchone()[0]
            print(f"{check_mark(True)} PostGIS version: {version}")
        except Exception as e:
            print(f"{check_mark(False)} Error querying PostGIS: {e}")
    
    elif 'spatialite' in engine:
        print("Testing SpatiaLite connection...")
        try:
            cursor = connection.cursor()
            cursor.execute("SELECT spatialite_version();")
            version = cursor.fetchone()[0]
            print(f"{check_mark(True)} SpatiaLite version: {version}")
        except Exception as e:
            print(f"{check_mark(False)} Error querying SpatiaLite: {e}")
    
    # Test spatial extension functionality
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT ST_AsText(ST_Point(0, 0));")
        result = cursor.fetchone()[0]
        print(f"{check_mark(True)} Spatial SQL functions working: {result}")
    except Exception as e:
        print(f"{check_mark(False)} Error using spatial SQL functions: {e}")
        
except Exception as e:
    print(f"{check_mark(False)} Error connecting to database: {e}")

print_section("4. Checking Model Structure")
try:
    from django.contrib.gis.db.models import PointField
    
    try:
        from main_app.models import User
        user_spatial_fields = [f.name for f in User._meta.get_fields() if isinstance(f, PointField)]
        print(f"{check_mark(len(user_spatial_fields) > 0)} User model has spatial fields: {user_spatial_fields}")
    except ImportError:
        print(f"{check_mark(False)} User model not found")
    
    try:
        from main_app.models import ServiceProvider
        provider_spatial_fields = [f.name for f in ServiceProvider._meta.get_fields() if isinstance(f, PointField)]
        print(f"{check_mark(len(provider_spatial_fields) > 0)} ServiceProvider model has spatial fields: {provider_spatial_fields}")
        
        # Check spatial query method
        has_nearby_method = hasattr(ServiceProvider, 'get_nearby_providers')
        print(f"{check_mark(has_nearby_method)} ServiceProvider.get_nearby_providers() method exists")
    except ImportError:
        print(f"{check_mark(False)} ServiceProvider model not found")
    
    try:
        from main_app.models import Service
        has_service_method = hasattr(Service, 'get_nearby_services')
        print(f"{check_mark(has_service_method)} Service.get_nearby_services() method exists")
    except ImportError:
        print(f"{check_mark(False)} Service model not found")
    
    try:
        from main_app.models import Appointment
        appointment_spatial_fields = [f.name for f in Appointment._meta.get_fields() if isinstance(f, PointField)]
        print(f"{check_mark(len(appointment_spatial_fields) > 0)} Appointment model has spatial fields: {appointment_spatial_fields}")
        
        has_appt_method = hasattr(Appointment, 'get_nearby_appointments')
        print(f"{check_mark(has_appt_method)} Appointment.get_nearby_appointments() method exists")
    except ImportError:
        print(f"{check_mark(False)} Appointment model not found")
        
except Exception as e:
    print(f"{check_mark(False)} Error checking models: {e}")
    traceback.print_exc()

print_section("5. Checking Utility Functions")
try:
    try:
        from main_app.utils.geo_utils import geocode_address, format_address, calculate_distance
        
        # Just check if functions exist
        print(f"{check_mark(callable(geocode_address))} geocode_address() function exists")
        print(f"{check_mark(callable(format_address))} format_address() function exists")
        print(f"{check_mark(callable(calculate_distance))} calculate_distance() function exists")
        
        # Try simple calculation
        from django.contrib.gis.geos import Point
        sf = Point(-122.4194, 37.7749)  # San Francisco
        nyc = Point(-74.0060, 40.7128)  # New York
        
        try:
            distance = calculate_distance(sf, nyc, 'miles')
            print(f"{check_mark(True)} Sample distance calculation: SF to NYC = {distance:.1f} miles")
        except Exception as e:
            print(f"{check_mark(False)} Error in distance calculation: {e}")
            
    except ImportError as e:
        print(f"{check_mark(False)} Error importing utility functions: {e}")
        
except Exception as e:
    print(f"{check_mark(False)} Error checking utility functions: {e}")
    traceback.print_exc()

print_section("6. Testing Migration Status")
try:
    from django.db.migrations.recorder import MigrationRecorder
    
    applied_migrations = MigrationRecorder.Migration.objects.filter(app='main_app')
    print(f"Applied migrations for main_app: {applied_migrations.count()}")
    
    # List last 5 migrations
    recent = applied_migrations.order_by('-applied')[:5]
    if recent:
        print("Recent migrations:")
        for m in recent:
            print(f"  - {m.app}.{m.name} (applied: {m.applied})")
    else:
        print("No migrations found for main_app")
        
except Exception as e:
    print(f"Error checking migrations: {e}")

print_section("GeoDjango Setup Summary")
print("Your GeoDjango setup appears to be:")
print("1. Django with GeoDjango: Installed")
print("2. Spatial Database: " + ("Configured" if spatial_db else "Not properly configured"))
print("3. Spatial Models: " + ("Configured" if len(user_spatial_fields + provider_spatial_fields + appointment_spatial_fields) > 0 else "Not properly configured"))
print("4. Utility Functions: " + ("Available" if 'geo_utils' in sys.modules else "Not found or not imported"))
print("\nNext steps:")
print("1. If any checks failed, address those issues first")
print("2. Create test records with location data to verify functionality")
print("3. Implement spatial queries in your views") 