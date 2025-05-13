from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('provider', 'Service Provider'),
        ('consumer', 'Service Consumer'),
    )
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES)
    phone_number = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)

class ServiceProvider(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='provider_profile')
    business_name = models.CharField(max_length=100)
    business_description = models.TextField()
    business_hours = models.JSONField(default=dict)  # Store business hours as JSON
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.business_name

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
    
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='appointments')
    consumer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.service.name} - {self.consumer.username} - {self.start_time}"

    def save(self, *args, **kwargs):
        if not self.end_time:
            self.end_time = self.start_time + timezone.timedelta(minutes=self.service.duration)
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
