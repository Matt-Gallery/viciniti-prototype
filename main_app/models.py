from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
# Restore GeoDjango imports
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('provider', 'Service Provider'),
        ('consumer', 'Service Consumer'),
    )
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES)
    phone_number = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    # Add location fields for users
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    # Restore PointField
    location = gis_models.PointField(null=True, blank=True, srid=4326, geography=True)
    
    def save(self, *args, **kwargs):
        # Update the location Point if lat/long are provided
        if self.latitude is not None and self.longitude is not None:
            self.location = Point(self.longitude, self.latitude, srid=4326)
        super().save(*args, **kwargs)

class ServiceProvider(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='provider_profile')
    business_name = models.CharField(max_length=100)
    business_description = models.TextField()
    business_hours = models.JSONField(default=dict)  # Store business hours as JSON
    # Add business location
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True, default="United States")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    # Restore PointField
    location = gis_models.PointField(null=True, blank=True, srid=4326, geography=True)
    service_radius = models.FloatField(
        default=25.0,
        help_text="Maximum service radius in miles",
        validators=[MinValueValidator(0.1), MaxValueValidator(100.0)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.business_name
    
    def save(self, *args, **kwargs):
        # Update the location Point if lat/long are provided
        if self.latitude is not None and self.longitude is not None:
            self.location = Point(self.longitude, self.latitude, srid=4326)
        super().save(*args, **kwargs)

SERVICE_CATEGORIES = (
    ('beauty_hair', 'Beauty - Hair'),
    ('beauty_nails', 'Beauty - Nails'),
    ('beauty_makeup', 'Beauty - Makeup'),
    ('beauty_skin', 'Beauty - Skin'),
    ('cleaning_tidy', 'Cleaning - Tidy Up'),
    ('cleaning_deep', 'Cleaning - Deep Clean'),
    ('pet_care_walk', 'Pet Care - Dog Walk'),
    ('pet_care_sit', 'Pet Care - Petsit'),
    ('car_care_wash', 'Car Care - Wash/Wax'),
    ('car_care_detail', 'Car Care - Detail'),
    ('errands', 'Errands'),
    ('handyman', 'Handyman'),
)

# Define the proximity discount tiers
class ProximityDiscountTier(models.Model):
    TIER_CHOICES = (
        (1, 'Tier 1'), 
        (2, 'Tier 2'), 
        (3, 'Tier 3'), 
        (4, 'Tier 4'),
    )
    
    provider = models.ForeignKey(ServiceProvider, on_delete=models.CASCADE, related_name='discount_tiers')
    tier = models.PositiveSmallIntegerField(choices=TIER_CHOICES)
    min_distance = models.FloatField(
        help_text="Minimum distance in yards (0 for starting distance)",
        validators=[MinValueValidator(0.0)]
    )
    max_distance = models.FloatField(
        help_text="Maximum distance in yards/miles",
        validators=[MinValueValidator(0.1)]
    )
    distance_unit = models.CharField(
        max_length=10, 
        choices=(('yards', 'Yards'), ('miles', 'Miles')),
        default='yards'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('provider', 'tier')
        ordering = ['provider', 'tier']
    
    def __str__(self):
        return f"{self.provider.business_name} - Tier {self.tier} ({self.min_distance} to {self.max_distance} {self.distance_unit})"

# Define the discount rates for each tier based on number of appointments
class ProximityDiscount(models.Model):
    tier = models.ForeignKey(ProximityDiscountTier, on_delete=models.CASCADE, related_name='discounts')
    appointment_count = models.PositiveSmallIntegerField(help_text="Number of appointments (1-5)")
    discount_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Discount percentage (0-100%)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('tier', 'appointment_count')
        ordering = ['tier', 'appointment_count']
    
    def __str__(self):
        return f"{self.tier.provider.business_name} - Tier {self.tier.tier} - {self.appointment_count} appts - {self.discount_percentage}% discount"

class Service(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    provider = models.ForeignKey(ServiceProvider, on_delete=models.CASCADE, related_name='services')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration = models.IntegerField(help_text='Duration in minutes')
    category = models.CharField(max_length=20, choices=SERVICE_CATEGORIES, default='beauty')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='appointments')
    consumer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    
    # Location information for the appointment
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True, default="United States")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    # Restore PointField
    location = gis_models.PointField(null=True, blank=True, srid=4326, geography=True)
    
    # Pricing information
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    final_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount_reason = models.CharField(max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.service.name} - {self.consumer.username} - {self.start_time}"

    def save(self, *args, **kwargs):
        # Set end time based on service duration if not provided
        if not self.end_time:
            self.end_time = self.start_time + timezone.timedelta(minutes=self.service.duration)
            
        # Update the location Point if lat/long are provided
        if self.latitude is not None and self.longitude is not None:
            self.location = Point(self.longitude, self.latitude, srid=4326)
            
        # Set original price from service if not provided
        if self.original_price is None:
            self.original_price = self.service.price
            
        # Set final price to original price if not provided
        if self.final_price is None:
            self.final_price = self.original_price
            
        super().save(*args, **kwargs)

class ProviderAvailability(models.Model):
    provider = models.ForeignKey('ServiceProvider', on_delete=models.CASCADE, related_name='availabilities')
    day_of_week = models.CharField(max_length=10)  # e.g., "2023-06-15" for a specific date
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('provider', 'day_of_week', 'start_time')

    def __str__(self):
        return f"{self.provider.business_name} - {self.day_of_week} - {self.start_time.strftime('%H:%M')} to {self.end_time.strftime('%H:%M')}"
