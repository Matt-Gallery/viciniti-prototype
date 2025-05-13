from django.urls import path
from . import views
from django.contrib.auth import views as auth_views
from .views import (
    Home, 
    RegisterAPI, 
    LoginAPI,
    ServiceCategoriesAPI,
    ServiceCreateAPI,
    ServiceListAPI,
    ServiceDetailAPI,
    UserProfileAPI,
    PasswordChangeAPI,
    ProviderSetupAPI,
    ProviderProfileAPI,
    ProviderAvailabilityAPI,
    ServiceAvailabilityAPI,
    AppointmentListAPI,
    AppointmentDetailAPI,
    AppointmentStatusAPI,
    ProximityDiscountTierAPI,
)

urlpatterns = [
    # API endpoints
    path('api/', Home.as_view(), name='api_home'),
    path('api/register/', RegisterAPI.as_view(), name='api_register'),
    path('api/login/', LoginAPI.as_view(), name='api_login'),
    path('api/categories/', ServiceCategoriesAPI.as_view(), name='api_categories'),
    path('api/services/', ServiceListAPI.as_view(), name='api_services'),
    path('api/services/create/', ServiceCreateAPI.as_view(), name='api_service_create'),
    path('api/services/<int:service_id>/', ServiceDetailAPI.as_view(), name='api_service_detail'),
    path('api/profile/', UserProfileAPI.as_view(), name='api_profile'),
    path('api/change-password/', PasswordChangeAPI.as_view(), name='api_change_password'),
    path('api/provider-setup/', ProviderSetupAPI.as_view(), name='api_provider_setup'),
    path('api/provider-profile/', ProviderProfileAPI.as_view(), name='api_provider_profile'),
    path('api/provider/<int:provider_id>/availability/', ProviderAvailabilityAPI.as_view(), name='api_provider_availability'),
    path('api/services/<int:service_id>/availability/', ServiceAvailabilityAPI.as_view(), name='api_service_availability'),
    path('api/appointments/', AppointmentListAPI.as_view(), name='api_appointments'),
    path('api/appointments/<uuid:appointment_id>/', AppointmentDetailAPI.as_view(), name='api_appointment_detail'),
    path('api/appointments/<uuid:appointment_id>/status/', AppointmentStatusAPI.as_view(), name='api_appointment_status'),
    
    # New proximity discount tier API endpoints
    path('api/discount-tiers/', ProximityDiscountTierAPI.as_view(), name='api_discount_tiers'),

    # Regular views
    path('', views.index, name='home'),
    path('register/', views.register, name='register'),
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    
    # Provider URLs
    path('provider-setup/', views.provider_setup, name='provider_setup'),
    path('provider-dashboard/', views.provider_dashboard, name='provider_dashboard'),
    path('services/', views.ServiceListView.as_view(), name='service_list'),
    path('providers/', views.ServiceProviderListView.as_view(), name='provider_list'),
    path('services/create/', views.ServiceCreateView.as_view(), name='service_create'),
    path('book/<int:service_id>/', views.book_appointment, name='book_appointment'),
    path('appointments/', views.appointment_list, name='appointment_list'),
] 