from django.urls import path
from . import views
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

# Apply AllowAny permission to specific views
register_view = permission_classes([AllowAny])(views.RegisterAPI.as_view())
login_view = permission_classes([AllowAny])(views.LoginAPI.as_view())
categories_view = permission_classes([AllowAny])(views.ServiceCategoriesAPI.as_view())
service_list_view = permission_classes([AllowAny])(views.ServiceListAPI.as_view())
service_detail_view = permission_classes([AllowAny])(views.ServiceDetailAPI.as_view())
service_availability_view = permission_classes([AllowAny])(views.ServiceAvailabilityAPI.as_view())

urlpatterns = [
    # Authentication endpoints (no authentication required)
    path('auth/register/', register_view, name='api_register'),
    path('auth/login/', login_view, name='api_login'),  # Use custom login view
    path('auth/profile/', views.UserProfileAPI.as_view(), name='api_user_profile'),
    path('auth/password/', views.PasswordChangeAPI.as_view(), name='api_password_change'),
    
    # Provider endpoints
    path('provider/setup/', views.ProviderSetupAPI.as_view(), name='api_provider_setup'),
    path('provider/profile/', views.ProviderProfileAPI.as_view(), name='api_provider_profile'),
    path('providers/<int:provider_id>/availability/', views.ProviderAvailabilityAPI.as_view(), name='api_provider_availability'),
    
    # Service endpoints
    path('services/', service_list_view, name='api_service_list'),
    path('services/<int:service_id>/', service_detail_view, name='api_service_detail'),
    path('services/categories/', categories_view, name='api_service_categories'),
    path('services/create/', views.ServiceCreateAPI.as_view(), name='api_service_create'),
    path('services/<int:service_id>/availability/', service_availability_view, name='api_service_availability'),
    
    # Appointment endpoints
    path('appointments/', views.AppointmentListAPI.as_view(), name='api_appointment_list'),
    path('appointments/<int:appointment_id>/', views.AppointmentDetailAPI.as_view(), name='api_appointment_detail'),
    path('appointments/<int:appointment_id>/status/', views.AppointmentStatusAPI.as_view(), name='api_appointment_status'),
] 