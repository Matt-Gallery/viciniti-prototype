from django.urls import path
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('', views.index, name='index'),
    path('register/', views.register, name='register'),
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    
    # Provider URLs
    path('provider/setup/', views.provider_setup, name='provider_setup'),
    path('provider/dashboard/', views.provider_dashboard, name='provider_dashboard'),
    path('provider/services/create/', views.ServiceCreateView.as_view(), name='service_create'),
    
    # Service URLs
    path('services/', views.ServiceListView.as_view(), name='service_list'),
    path('providers/', views.ServiceProviderListView.as_view(), name='provider_list'),
    
    # Appointment URLs
    path('appointments/', views.appointment_list, name='appointment_list'),
    path('service/<int:service_id>/book/', views.book_appointment, name='book_appointment'),
] 