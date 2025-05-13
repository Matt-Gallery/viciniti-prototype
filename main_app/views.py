from django.shortcuts import render, redirect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy
from .models import User, Service, ServiceProvider, Appointment, ProviderAvailability, ProximityDiscountTier, ProximityDiscount
from .forms import UserRegistrationForm, ServiceProviderForm, ServiceForm, AppointmentForm
from rest_framework.authtoken.models import Token
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
import datetime
import uuid

# For parsing ISO format datetimes
from dateutil.parser import parse as parse_datetime
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from decimal import Decimal

# Define the home view
class Home(APIView):
  def get(self, request):
    content = {'message': 'Welcome to the Viciniti api home route!'}
    return Response(content)

# API Views
class RegisterAPI(APIView):
    permission_classes = [AllowAny]  # Allow any user to register - ensure this is directly on the class
    authentication_classes = []  # No authentication needed for registration
    
    def post(self, request):
        try:
            # Debug logging
            print("DEBUG RegisterAPI: Registration attempt")
            print(f"DEBUG RegisterAPI: Request data: {request.data}")
            
            # Extract data from request
            username = request.data.get('username')
            email = request.data.get('email')
            password = request.data.get('password')
            user_type = request.data.get('user_type')
            phone_number = request.data.get('phone_number', '')
            address = request.data.get('address', '')
            
            print(f"DEBUG RegisterAPI: username={username}, email={email}, password_length={len(password) if password else 0}, user_type={user_type}")
            
            # Validate required fields
            if not all([username, email, password, user_type]):
                missing = []
                if not username: missing.append('username')
                if not email: missing.append('email')
                if not password: missing.append('password')
                if not user_type: missing.append('user_type')
                print(f"DEBUG RegisterAPI: Missing required fields: {missing}")
                return Response({
                    'error': f'Required fields missing: {", ".join(missing)}'
                }, http_status.HTTP_400_BAD_REQUEST)
            
            # Validate user type
            if user_type not in ['provider', 'consumer']:
                print(f"DEBUG RegisterAPI: Invalid user type: {user_type}")
                return Response({
                    'error': 'Invalid user type'
                }, http_status.HTTP_400_BAD_REQUEST)
            
            # Check if username or email already exists
            if User.objects.filter(username=username).exists():
                print(f"DEBUG RegisterAPI: Username already exists: {username}")
                return Response({
                    'error': 'Username already exists'
                }, http_status.HTTP_400_BAD_REQUEST)
                
            if User.objects.filter(email=email).exists():
                print(f"DEBUG RegisterAPI: Email already exists: {email}")
                return Response({
                    'error': 'Email already exists'
                }, http_status.HTTP_400_BAD_REQUEST)
            
            # Validate password
            try:
                validate_password(password)
            except ValidationError as e:
                print(f"DEBUG RegisterAPI: Password validation failed: {str(e)}")
                return Response({
                    'error': str(e)
                }, http_status.HTTP_400_BAD_REQUEST)
            
            # Create user
            print("DEBUG RegisterAPI: Creating user")
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                user_type=user_type,
                phone_number=phone_number,
                address=address
            )
            
            # Create token
            token, _ = Token.objects.get_or_create(user=user)
            print(f"DEBUG RegisterAPI: User created successfully. Token: {token.key}")
            
            return Response({
                'token': token.key,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'user_type': user.user_type
                }
            }, http_status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"DEBUG RegisterAPI: Exception occurred: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoginAPI(APIView):
    permission_classes = [AllowAny]  # Allow any user to login
    authentication_classes = []  # No authentication needed for login
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        print(f"DEBUG LOGIN: Username: {username}, Password length: {len(password) if password else 0}")
        
        if not username or not password:
            return Response({
                'error': 'Please provide both username and password'
            }, http_status.HTTP_400_BAD_REQUEST)
        
        from django.contrib.auth import authenticate
        user = authenticate(username=username, password=password)
        
        print(f"DEBUG LOGIN: Authentication result: {user}")
        
        if user:
            # Get or create token
            from rest_framework.authtoken.models import Token
            token, _ = Token.objects.get_or_create(user=user)
            
            print(f"DEBUG LOGIN: Token created: {token.key}")
            
            # Check if user is a provider who needs setup
            needs_setup = False
            if user.user_type == 'provider':
                try:
                    # Check if provider profile exists
                    provider_profile = user.provider_profile
                except:
                    # No provider profile, needs setup
                    needs_setup = True
            
            return Response({
                'token': token.key,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'user_type': user.user_type,
                    'needs_setup': needs_setup
                }
            })
        else:
            # Try to see if user exists but password is wrong
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            try:
                existing_user = User.objects.get(username=username)
                print(f"DEBUG LOGIN: User exists but password is wrong: {existing_user.username}")
                return Response({
                    'error': 'Invalid password'
                }, http_status.HTTP_401_UNAUTHORIZED)
            except User.DoesNotExist:
                print(f"DEBUG LOGIN: User does not exist: {username}")
                return Response({
                    'error': 'Invalid username'
                }, http_status.HTTP_401_UNAUTHORIZED)

class ServiceCategoriesAPI(APIView):
    # Removed AllowAny permission to require authentication
    
    def get(self, request):
        """Return all service categories"""
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, http_status.HTTP_401_UNAUTHORIZED)
            
        from .models import SERVICE_CATEGORIES
        categories = [{'value': category[0], 'label': category[1]} for category in SERVICE_CATEGORIES]
        return Response(categories)

class ServiceCreateAPI(APIView):
    def post(self, request):
        """Create or update a service"""
        try:
            print("DEBUG ServiceCreateAPI: Starting service creation/update")
            # Check if user is authenticated
            if not request.user.is_authenticated:
                print("DEBUG: User not authenticated, auth header:", request.headers.get('Authorization'))
                return Response({
                    'error': 'Authentication required'
                }, http_status.HTTP_401_UNAUTHORIZED)
            
            # Check if user is a provider
            print(f"DEBUG: User type: {request.user.user_type}, ID: {request.user.id}, Username: {request.user.username}")
            if request.user.user_type != 'provider':
                return Response({
                    'error': 'Only service providers can create services'
                }, http_status.HTTP_403_FORBIDDEN)
            
            # Get provider profile
            try:
                provider = request.user.provider_profile
                print(f"DEBUG: Provider found: {provider.id} - {provider.business_name}")
            except Exception as e:
                print(f"DEBUG: Provider profile error: {str(e)}")
                # Check if we can create a profile instead
                business_name = request.data.get('provider_business_name')
                business_description = request.data.get('provider_business_description')
                
                if business_name and business_description:
                    print(f"DEBUG: Creating provider profile with name: {business_name}")
                    # Create a provider profile on the fly
                    from .models import ServiceProvider
                    provider = ServiceProvider.objects.create(
                        user=request.user,
                        business_name=business_name,
                        business_description=business_description
                    )
                    print(f"DEBUG: Created provider profile with ID: {provider.id}")
                else:
                    return Response({
                        'error': 'Provider profile not found. Please complete your provider setup.',
                        'needs_profile': True
                    }, http_status.HTTP_400_BAD_REQUEST)
            
            # Extract data
            service_id = request.data.get('id')  # Check if we're updating an existing service
            name = request.data.get('name')
            description = request.data.get('description')
            price = request.data.get('price')
            duration = request.data.get('duration')
            category = request.data.get('category')
            
            print(f"DEBUG: Service data: {name}, {description}, {price}, {duration}, {category}")
            
            # Validate required fields
            if not all([name, description, price, duration, category]):
                missing = []
                if not name: missing.append('name')
                if not description: missing.append('description')
                if not price: missing.append('price')
                if not duration: missing.append('duration')
                if not category: missing.append('category')
                
                return Response({
                    'error': f'Required fields missing: {", ".join(missing)}'
                }, http_status.HTTP_400_BAD_REQUEST)
            
            from .models import Service
            
            # Check if we're updating an existing service
            if service_id:
                print(f"DEBUG: Updating existing service with ID: {service_id}")
                try:
                    # Verify that the service belongs to this provider
                    service = Service.objects.get(id=service_id, provider=provider)
                    
                    # Update service fields
                    service.name = name
                    service.description = description
                    service.price = price
                    service.duration = duration
                    service.category = category
                    service.save()
                    
                    print(f"DEBUG: Service updated: {service.id}")
                    return Response({
                        'id': service.id,
                        'name': service.name,
                        'description': service.description,
                        'price': service.price,
                        'duration': service.duration,
                        'category': service.category,
                    }, http_status.HTTP_200_OK)
                except Service.DoesNotExist:
                    return Response({
                        'error': 'Service not found or does not belong to this provider'
                    }, http_status.HTTP_404_NOT_FOUND)
            
            # If not updating, create a new service
            service = Service.objects.create(
                provider=provider,
                name=name,
                description=description,
                price=price,
                duration=duration,
                category=category
            )
            
            print(f"DEBUG: Service created with ID: {service.id}")
            
            return Response({
                'id': service.id,
                'name': service.name,
                'description': service.description,
                'price': service.price,
                'duration': service.duration,
                'category': service.category,
            }, http_status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"DEBUG: Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class ServiceListAPI(APIView):
    # Removed AllowAny permission to require authentication
    
    def get(self, request):
        """Get all services"""
        try:
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response({
                    'error': 'Authentication required'
                }, http_status.HTTP_401_UNAUTHORIZED)
                
            from .models import Service
            services = Service.objects.filter(is_active=True)
            
            # Convert services to a list of dictionaries
            service_list = []
            for service in services:
                service_list.append({
                    'id': service.id,
                    'name': service.name,
                    'description': service.description,
                    'price': service.price,
                    'duration': service.duration,
                    'category': service.category,
                    'provider': {
                        'id': service.provider.id,
                        'business_name': service.provider.business_name,
                        'business_description': service.provider.business_description,
                    }
                })
            
            return Response(service_list)
        except Exception as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class ServiceDetailAPI(APIView):
    # Removed AllowAny permission to require authentication
    
    def get(self, request, service_id):
        """Get service by ID"""
        try:
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response({
                    'error': 'Authentication required'
                }, http_status.HTTP_401_UNAUTHORIZED)
                
            from .models import Service
            try:
                service = Service.objects.get(id=service_id)
            except Service.DoesNotExist:
                return Response({
                    'error': 'Service not found'
                }, http_status.HTTP_404_NOT_FOUND)
            
            # Convert service to a dictionary
            service_data = {
                'id': service.id,
                'name': service.name,
                'description': service.description,
                'price': service.price,
                'duration': service.duration,
                'category': service.category,
                'provider': {
                    'id': service.provider.id,
                    'business_name': service.provider.business_name,
                    'business_description': service.provider.business_description,
                }
            }
            
            return Response(service_data)
        except Exception as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    def delete(self, request, service_id):
        """Delete service by ID"""
        try:
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response({
                    'error': 'Authentication required'
                }, http_status.HTTP_401_UNAUTHORIZED)
            
            # Check if user is a provider
            if request.user.user_type != 'provider':
                return Response({
                    'error': 'Only service providers can delete services'
                }, http_status.HTTP_403_FORBIDDEN)
                
            from .models import Service
            try:
                # Get the service and check if it belongs to this provider
                service = Service.objects.get(id=service_id, provider__user=request.user)
                
                # Delete the service (or just mark it as inactive)
                service.is_active = False  # Soft delete
                service.save()
                
                # Alternatively, for hard delete:
                # service.delete()
                
                return Response({
                    'message': 'Service deleted successfully'
                }, http_status.HTTP_200_OK)
                
            except Service.DoesNotExist:
                return Response({
                    'error': 'Service not found or does not belong to this provider'
                }, http_status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileAPI(APIView):
    def get(self, request):
        """Get the authenticated user's profile"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, http_status.HTTP_401_UNAUTHORIZED)
        
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'phone_number': user.phone_number,
            'address': user.address
        })
        
    def put(self, request):
        """Update user information"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, http_status.HTTP_401_UNAUTHORIZED)
        
        user = request.user
        
        # Update fields if provided
        email = request.data.get('email')
        phone_number = request.data.get('phone_number')
        address = request.data.get('address')
        
        if email:
            # Check if email already exists but belongs to another user
            if User.objects.filter(email=email).exclude(id=user.id).exists():
                return Response({
                    'error': 'Email already in use by another account'
                }, http_status.HTTP_400_BAD_REQUEST)
            user.email = email
            
        if phone_number is not None:
            user.phone_number = phone_number
            
        if address is not None:
            user.address = address
            
        user.save()
        
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'phone_number': user.phone_number,
            'address': user.address
        })

class PasswordChangeAPI(APIView):
    def put(self, request):
        """Change user password"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, http_status.HTTP_401_UNAUTHORIZED)
        
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response({
                'error': 'Both current and new password are required'
            }, http_status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        
        # Check current password
        if not user.check_password(current_password):
            return Response({
                'error': 'Current password is incorrect'
            }, http_status.HTTP_400_BAD_REQUEST)
        
        # Validate new password
        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        user.set_password(new_password)
        user.save()
        
        # Update token
        Token.objects.filter(user=user).delete()
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'Password changed successfully',
            'token': token.key
        })

class ProviderSetupAPI(APIView):
    def post(self, request):
        """Setup provider profile for an authenticated user"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, http_status.HTTP_401_UNAUTHORIZED)
        
        # Check if user is a provider
        if request.user.user_type != 'provider':
            return Response({
                'error': 'Only service providers can create a provider profile'
            }, http_status.HTTP_403_FORBIDDEN)
        
        # Check if provider profile already exists
        if hasattr(request.user, 'provider_profile'):
            return Response({
                'error': 'Provider profile already exists'
            }, http_status.HTTP_400_BAD_REQUEST)
        
        # Extract data
        business_name = request.data.get('business_name')
        business_description = request.data.get('business_description')
        business_hours = request.data.get('business_hours', {})
        
        # Validate required fields
        if not all([business_name, business_description]):
            return Response({
                'error': 'Business name and description are required'
            }, http_status.HTTP_400_BAD_REQUEST)
        
        # Create provider profile
        from .models import ServiceProvider
        provider = ServiceProvider.objects.create(
            user=request.user,
            business_name=business_name,
            business_description=business_description,
            business_hours=business_hours
        )
        
        return Response({
            'id': provider.id,
            'business_name': provider.business_name,
            'business_description': provider.business_description,
            'business_hours': provider.business_hours,
        }, http_status.HTTP_201_CREATED)

class ProviderProfileAPI(APIView):
    def get(self, request):
        """Get the authenticated user's provider profile"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, http_status.HTTP_401_UNAUTHORIZED)
        
        # Check if user is a provider
        if request.user.user_type != 'provider':
            return Response({
                'error': 'Only service providers can access provider profiles'
            }, http_status.HTTP_403_FORBIDDEN)
        
        # Check if provider profile exists
        try:
            provider = request.user.provider_profile
        except:
            return Response({
                'error': 'Provider profile not found'
            }, http_status.HTTP_404_NOT_FOUND)
        
        return Response({
            'id': provider.id,
            'business_name': provider.business_name,
            'business_description': provider.business_description,
            'business_hours': provider.business_hours,
        })
        
    def put(self, request):
        """Update the authenticated user's provider profile"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, http_status.HTTP_401_UNAUTHORIZED)
        
        # Check if user is a provider
        if request.user.user_type != 'provider':
            return Response({
                'error': 'Only service providers can update provider profiles'
            }, http_status.HTTP_403_FORBIDDEN)
        
        # Check if provider profile exists
        try:
            provider = request.user.provider_profile
        except:
            return Response({
                'error': 'Provider profile not found'
            }, http_status.HTTP_404_NOT_FOUND)
        
        # Extract data
        business_name = request.data.get('business_name')
        business_description = request.data.get('business_description')
        business_hours = request.data.get('business_hours')
        
        # Update fields if provided
        if business_name:
            provider.business_name = business_name
            
        if business_description:
            provider.business_description = business_description
            
        if business_hours:
            provider.business_hours = business_hours
            
        provider.save()
        
        return Response({
            'id': provider.id,
            'business_name': provider.business_name,
            'business_description': provider.business_description,
            'business_hours': provider.business_hours,
        })

class ProviderAvailabilityAPI(APIView):
    def get(self, request, provider_id):
        """Get availability for a specific provider"""
        try:
            from .models import ServiceProvider, ProviderAvailability
            # Check if provider exists
            provider = ServiceProvider.objects.get(id=provider_id)
            
            # Get availabilities
            availabilities = ProviderAvailability.objects.filter(provider=provider)
            
            # Organize by day
            availability_data = {}
            for avail in availabilities:
                day_key = avail.day_of_week
                if day_key not in availability_data:
                    availability_data[day_key] = []
                
                availability_data[day_key].append({
                    'id': str(avail.id),
                    'start': avail.start_time.isoformat(),
                    'end': avail.end_time.isoformat()
                })
            
            return Response(availability_data)
        except ServiceProvider.DoesNotExist:
            return Response({
                'error': 'Provider not found'
            }, http_status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request, provider_id):
        """Save availability for a specific provider"""
        try:
            from .models import ServiceProvider, ProviderAvailability
            
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response({
                    'error': 'Authentication required'
                }, http_status.HTTP_401_UNAUTHORIZED)
            
            # Check if provider exists and belongs to this user
            try:
                provider = ServiceProvider.objects.get(id=provider_id, user=request.user)
            except ServiceProvider.DoesNotExist:
                return Response({
                    'error': 'You do not have permission to update this provider\'s availability'
                }, http_status.HTTP_403_FORBIDDEN)
            
            # Get availability data
            availability_data = request.data
            
            # Delete existing availability
            ProviderAvailability.objects.filter(provider=provider).delete()
            
            # Create new availability blocks
            for day_key, blocks in availability_data.items():
                for block in blocks:
                    ProviderAvailability.objects.create(
                        provider=provider,
                        day_of_week=day_key,
                        start_time=block['start'],
                        end_time=block['end']
                    )
            
            return Response(availability_data)
        except Exception as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProximityDiscountTierAPI(APIView):
    """API for managing proximity discount tiers"""
    
    def get(self, request):
        """Get all discount tiers for the provider"""
        try:
            # Check if user is authenticated and is a provider
            if not request.user.is_authenticated or request.user.user_type != 'provider':
                return Response({
                    'error': 'Provider authentication required'
                }, http_status.HTTP_401_UNAUTHORIZED)
                
            # Get provider profile
            try:
                provider = request.user.provider_profile
            except:
                return Response({
                    'error': 'Provider profile not found'
                }, http_status.HTTP_404_NOT_FOUND)
            
            # Get discount tiers
            from .models import ProximityDiscountTier
            tiers = ProximityDiscountTier.objects.filter(provider=provider).order_by('tier')
            
            # Prepare response data
            tiers_data = []
            for tier in tiers:
                # Get discounts for this tier
                discounts = {}
                for discount in tier.discounts.all():
                    discounts[discount.appointment_count] = float(discount.discount_percentage)
                
                tiers_data.append({
                    'id': tier.id,
                    'tier': tier.tier,
                    'min_distance': tier.min_distance,
                    'max_distance': tier.max_distance,
                    'distance_unit': tier.distance_unit,
                    'discounts': discounts
                })
            
            return Response(tiers_data)
        except Exception as e:
            print(f"Error in ProximityDiscountTierAPI.get: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Create or update a discount tier and its discounts"""
        try:
            # Check if user is authenticated and is a provider
            if not request.user.is_authenticated or request.user.user_type != 'provider':
                return Response({
                    'error': 'Provider authentication required'
                }, http_status.HTTP_401_UNAUTHORIZED)
                
            # Get provider profile
            try:
                provider = request.user.provider_profile
            except:
                return Response({
                    'error': 'Provider profile not found'
                }, http_status.HTTP_404_NOT_FOUND)
            
            # Extract data
            tier_number = request.data.get('tier')
            min_distance = request.data.get('min_distance')
            max_distance = request.data.get('max_distance')
            distance_unit = request.data.get('distance_unit', 'yards')
            discounts = request.data.get('discounts', {})
            
            # Validate required fields
            if tier_number is None or min_distance is None or max_distance is None:
                return Response({
                    'error': 'tier, min_distance, and max_distance are required'
                }, http_status.HTTP_400_BAD_REQUEST)
            
            # Validate tier number
            if tier_number not in [1, 2, 3, 4]:
                return Response({
                    'error': 'tier must be 1, 2, 3, or 4'
                }, http_status.HTTP_400_BAD_REQUEST)
            
            # Validate min and max distance
            try:
                min_distance = float(min_distance)
                max_distance = float(max_distance)
                
                if min_distance < 0:
                    return Response({
                        'error': 'min_distance must be non-negative'
                    }, http_status.HTTP_400_BAD_REQUEST)
                
                if max_distance <= min_distance:
                    return Response({
                        'error': 'max_distance must be greater than min_distance'
                    }, http_status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({
                    'error': 'min_distance and max_distance must be valid numbers'
                }, http_status.HTTP_400_BAD_REQUEST)
            
            # Validate distance unit
            if distance_unit not in ['yards', 'miles']:
                return Response({
                    'error': 'distance_unit must be "yards" or "miles"'
                }, http_status.HTTP_400_BAD_REQUEST)
            
            # Create or update the tier
            from .models import ProximityDiscountTier, ProximityDiscount
            tier, created = ProximityDiscountTier.objects.update_or_create(
                provider=provider,
                tier=tier_number,
                defaults={
                    'min_distance': min_distance,
                    'max_distance': max_distance,
                    'distance_unit': distance_unit
                }
            )
            
            # Process discounts
            discount_data = []
            for appt_count_str, discount_percentage_str in discounts.items():
                try:
                    appt_count = int(appt_count_str)
                    discount_percentage = float(discount_percentage_str)
                    
                    # Validate appointment count
                    if appt_count < 1 or appt_count > 5:
                        return Response({
                            'error': f'Invalid appointment count: {appt_count}. Must be between 1 and 5.'
                        }, http_status.HTTP_400_BAD_REQUEST)
                    
                    # Validate discount percentage
                    if discount_percentage < 0 or discount_percentage > 100:
                        return Response({
                            'error': f'Invalid discount percentage: {discount_percentage}. Must be between 0 and 100.'
                        }, http_status.HTTP_400_BAD_REQUEST)
                    
                    # Create or update the discount
                    discount, discount_created = ProximityDiscount.objects.update_or_create(
                        tier=tier,
                        appointment_count=appt_count,
                        defaults={
                            'discount_percentage': discount_percentage
                        }
                    )
                    
                    discount_data.append({
                        'appointment_count': appt_count,
                        'discount_percentage': discount_percentage
                    })
                except (ValueError, TypeError):
                    return Response({
                        'error': f'Invalid discount data: {appt_count_str}={discount_percentage_str}'
                    }, http_status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'id': tier.id,
                'tier': tier.tier,
                'min_distance': tier.min_distance,
                'max_distance': tier.max_distance,
                'distance_unit': tier.distance_unit,
                'discounts': discounts
            }, http_status.HTTP_201_CREATED if created else http_status.HTTP_200_OK)
        except Exception as e:
            print(f"Error in ProximityDiscountTierAPI.post: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class ServiceAvailabilityAPI(APIView):
    # Removed AllowAny permission to require authentication
    
    def get(self, request, service_id):
        """Get availability for a specific service with accurate conflict detection and dynamic pricing"""
        try:
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response({
                    'error': 'Authentication required'
                }, http_status.HTTP_401_UNAUTHORIZED)
                
            # Add debug logging
            print(f"DEBUG AVAILABILITY: Calculating availability for service {service_id}")
            
            from .models import Service, ProviderAvailability, Appointment, ProximityDiscountTier, ProximityDiscount
            from django.contrib.gis.geos import Point
            from django.contrib.gis.db.models.functions import Distance
            
            # Check if service exists
            service = Service.objects.get(id=service_id)
            
            # Get provider associated with this service
            provider = service.provider
            print(f"DEBUG AVAILABILITY: Found provider: {provider.business_name}")
            
            # Get consumer location if provided
            consumer_lat = request.GET.get('latitude')
            consumer_lng = request.GET.get('longitude')
            consumer_location = None
            
            if consumer_lat and consumer_lng:
                try:
                    consumer_lat = float(consumer_lat)
                    consumer_lng = float(consumer_lng)
                    consumer_location = Point(consumer_lng, consumer_lat, srid=4326)
                    print(f"DEBUG AVAILABILITY: Consumer location provided: {consumer_lat}, {consumer_lng}")
                except (ValueError, TypeError):
                    print(f"DEBUG AVAILABILITY: Invalid location coordinates: {consumer_lat}, {consumer_lng}")
                    consumer_location = None
            
            # Get existing appointments for this provider (not just this service)
            # This ensures we account for all provider commitments
            existing_appointments = Appointment.objects.filter(
                service__provider=provider,  # All provider appointments
                status__in=['pending', 'confirmed', 'completed']  # Only active appointments
            )
            
            # If consumer location is provided, annotate appointments with distance
            if consumer_location:
                existing_appointments = existing_appointments.filter(
                    location__isnull=False
                ).annotate(
                    distance=Distance('location', consumer_location)
                )
            
            print(f"DEBUG AVAILABILITY: Found {existing_appointments.count()} existing appointments")
            for appt in existing_appointments:
                if hasattr(appt, 'distance'):
                    print(f"DEBUG AVAILABILITY: Existing appointment: {appt.service.name} - {appt.start_time} to {appt.end_time} - Distance: {appt.distance.m} meters")
                else:
                    print(f"DEBUG AVAILABILITY: Existing appointment: {appt.service.name} - {appt.start_time} to {appt.end_time}")
            
            # Buffer time in minutes to add to both sides of appointments
            buffer_minutes = 15
            
            # Create buffered time blocks for existing appointments
            blocked_periods = []
            for appointment in existing_appointments:
                # Add buffer before and after the appointment
                buffered_start = appointment.start_time - timezone.timedelta(minutes=buffer_minutes)
                buffered_end = appointment.end_time + timezone.timedelta(minutes=buffer_minutes)
                
                blocked_periods.append({
                    'start': buffered_start,
                    'end': buffered_end,
                    'original_appointment': appointment
                })
                print(f"DEBUG AVAILABILITY: Blocked period: {buffered_start} to {buffered_end} (from appointment {appointment.id})")
            
            # Get provider's availabilities
            availabilities = ProviderAvailability.objects.filter(provider=provider)
            print(f"DEBUG AVAILABILITY: Found {availabilities.count()} availability blocks")
            
            # Get provider's discount tiers
            discount_tiers = ProximityDiscountTier.objects.filter(provider=provider).order_by('tier')
            has_discount_config = discount_tiers.exists()
            print(f"DEBUG AVAILABILITY: Provider has discount configuration: {has_discount_config}")
            
            # Organize availability by day
            availability_data = {}
            for avail in availabilities:
                day_key = avail.day_of_week
                if day_key not in availability_data:
                    availability_data[day_key] = []
                
                # Create available time blocks
                start_time = avail.start_time
                end_time = avail.end_time
                
                # Calculate how many service slots fit in this availability block
                duration_minutes = service.duration
                
                # Calculate total block minutes available
                block_minutes = (end_time - start_time).total_seconds() / 60
                print(f"DEBUG AVAILABILITY: Block {day_key} from {start_time} to {end_time} ({block_minutes} minutes)")
                
                # Calculate slots using service duration
                available_slots = []
                current_start = start_time
                slot_index = 0
                
                # Loop until we can't fit another appointment
                while True:
                    # Calculate end time for this slot
                    current_end = current_start + timezone.timedelta(minutes=duration_minutes)
                    
                    # If this slot would exceed the availability block, break
                    if current_end > end_time:
                        break
                    
                    # Create a slot
                    slot = {
                        'id': f"slot-{day_key}-{slot_index}",
                        'start': current_start,
                        'end': current_end,
                        'duration': duration_minutes,
                        'original_price': float(service.price),
                        'final_price': float(service.price),
                        'discount_percentage': 0,
                        'nearby_appointments': 0
                    }
                    
                    # Check if slot overlaps with ANY buffered appointment block
                    is_available = True
                    for blocked in blocked_periods:
                        # Only check same day blocked periods
                        block_date = blocked['start'].strftime('%Y-%m-%d')
                        slot_date = current_start.strftime('%Y-%m-%d')
                        if block_date != slot_date:
                            continue
                            
                        # Check if this slot overlaps with the blocked period
                        # (slot starts before blocked period ends AND slot ends after blocked period starts)
                        if slot['start'] < blocked['end'] and slot['end'] > blocked['start']:
                            print(f"DEBUG AVAILABILITY: Slot {slot['id']} at {slot['start']} conflicts with appointment {blocked['original_appointment'].id} " + 
                                  f"({blocked['original_appointment'].service.name}) at {blocked['original_appointment'].start_time} - {blocked['original_appointment'].end_time} " +
                                  f"[buffered: {blocked['start']} - {blocked['end']}]")
                            is_available = False
                            break
                    
                    if is_available:
                        # If consumer location is provided and provider has discount configuration,
                        # calculate discounted price based on proximity to existing appointments
                        if consumer_location and has_discount_config:
                            # Create a slot location based on consumer location (for simplified calculation)
                            slot_location = consumer_location
                            slot_date = current_start.date()
                            
                            # Find appointments on the same day
                            same_day_appointments = existing_appointments.filter(
                                start_time__date=slot_date
                            )
                            
                            if same_day_appointments.exists():
                                # Count nearby appointments within different distance tiers
                                nearby_appointments_by_tier = {}
                                for tier in discount_tiers:
                                    # Convert tier distances to meters for comparison
                                    min_meters = tier.min_distance * 0.9144 if tier.distance_unit == 'yards' else tier.min_distance * 1609.34
                                    max_meters = tier.max_distance * 0.9144 if tier.distance_unit == 'yards' else tier.max_distance * 1609.34
                                    
                                    # Count appointments within this tier's distance range
                                    appointments_in_range = 0
                                    for appt in same_day_appointments:
                                        if hasattr(appt, 'distance'):
                                            distance_meters = appt.distance.m
                                            if min_meters <= distance_meters < max_meters:
                                                appointments_in_range += 1
                                                print(f"DEBUG AVAILABILITY: Appointment {appt.id} is in Tier {tier.tier} range ({min_meters}-{max_meters}m), actual distance: {distance_meters}m")
                                    
                                    if appointments_in_range > 0:
                                        nearby_appointments_by_tier[tier.tier] = appointments_in_range
                                
                                # Determine the highest discount
                                best_discount_percent = 0
                                best_discount_tier = None
                                best_discount_appt_count = 0
                                
                                for tier_num, appt_count in nearby_appointments_by_tier.items():
                                    # Limit to 5 appointments for discount calculation
                                    effective_count = min(appt_count, 5)
                                    
                                    # Get the discount for this tier and appointment count
                                    try:
                                        tier = discount_tiers.get(tier=tier_num)
                                        discount = ProximityDiscount.objects.get(
                                            tier=tier,
                                            appointment_count=effective_count
                                        )
                                        
                                        discount_percent = float(discount.discount_percentage)
                                        if discount_percent > best_discount_percent:
                                            best_discount_percent = discount_percent
                                            best_discount_tier = tier_num
                                            best_discount_appt_count = effective_count
                                            print(f"DEBUG AVAILABILITY: Found better discount: {best_discount_percent}% for Tier {best_discount_tier} with {best_discount_appt_count} appointments")
                                    except (ProximityDiscountTier.DoesNotExist, ProximityDiscount.DoesNotExist):
                                        pass
                                
                                # Apply the best discount if found
                                if best_discount_percent > 0:
                                    original_price = float(service.price)
                                    discount_amount = original_price * (best_discount_percent / 100)
                                    final_price = original_price - discount_amount
                                    
                                    slot['discount_percentage'] = best_discount_percent
                                    slot['final_price'] = round(final_price, 2)
                                    slot['nearby_appointments'] = best_discount_appt_count
                                    
                                    print(f"DEBUG AVAILABILITY: Applied {best_discount_percent}% discount to slot {slot['id']}")
                                    print(f"DEBUG AVAILABILITY: Original price: ${original_price}, Final price: ${slot['final_price']}")
                        
                        available_slots.append(slot)
                        print(f"DEBUG AVAILABILITY: Added available slot: {slot['id']} at {slot['start']}, price: ${slot['final_price']}")
                    
                    # Move to the next potential slot - add duration PLUS buffer time for spacing between slots
                    # This ensures each appointment has buffer time on both sides
                    slot_index += 1
                    current_start = current_start + timezone.timedelta(minutes=duration_minutes + buffer_minutes)
                    
                # Add valid slots to the output
                for slot in available_slots:
                    availability_data[day_key].append({
                        'id': slot['id'],
                        'start': slot['start'].isoformat(),
                        'end': slot['end'].isoformat(),
                        'original_price': slot['original_price'],
                        'final_price': slot['final_price'],
                        'discount_percentage': slot['discount_percentage'],
                        'nearby_appointments': slot['nearby_appointments']
                    })
            
            return Response(availability_data)
        except Service.DoesNotExist:
            return Response({
                'error': 'Service not found'
            }, http_status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            print(f"DEBUG AVAILABILITY ERROR: {str(e)}")
            traceback.print_exc()
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class AppointmentListAPI(APIView):
    permission_classes = [AllowAny]  # Allow anyone to create appointments
    authentication_classes = []  # No authentication needed for appointment creation
    
    def get(self, request):
        """Get all appointments for the authenticated user or provider"""
        try:
            # Get appointments based on user type
            if request.user.is_authenticated and request.user.user_type == 'provider':
                # Providers see appointments for their services
                            appointments = Appointment.objects.filter(
                    service__provider__user=request.user
                ).order_by('start_time')
            elif request.user.is_authenticated:
                # Consumers see their own appointments
                appointments = Appointment.objects.filter(
                    consumer=request.user
                ).order_by('start_time')
            else:
                # For testing/debugging, return all appointments for unauthenticated users
                print("WARNING: Returning all appointments for unauthenticated request")
                appointments = Appointment.objects.all().order_by('start_time')
        
            # Serialize appointments
            appointment_list = []
            for appointment in appointments:
                appointment_data = {
                    'id': str(appointment.id),  # Ensure UUID is converted to string
                    'service': {
                        'id': appointment.service.id,
                        'name': appointment.service.name,
                        'duration': appointment.service.duration,
                        'price': float(appointment.service.price),
                        'provider': {
                            'id': appointment.service.provider.id,
                            'business_name': appointment.service.provider.business_name
                        }
                    },
                    'consumer': {
                        'id': appointment.consumer.id,
                        'username': appointment.consumer.username,
                        'email': appointment.consumer.email
                    },
                    'start_time': appointment.start_time.isoformat(),
                    'end_time': appointment.end_time.isoformat(),
                    'status': appointment.status,
                    'notes': appointment.notes,
                    'created_at': appointment.created_at.isoformat(),
                    'updated_at': appointment.updated_at.isoformat()
                }
                appointment_list.append(appointment_data)
            
            return Response(appointment_list)
        except Exception as e:
            import traceback
            print(f"Error fetching appointments: {str(e)}")
            traceback.print_exc()
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Create a new appointment - for testing, we'll allow anonymous appointments"""
        # Debug logging
        print("DEBUG APPOINTMENT: Starting appointment creation")
        print(f"DEBUG APPOINTMENT: Request data: {request.data}")
        
        # Extract data
        service_data = request.data.get('service')
        # Handle service in various formats (integer ID, string ID, or object)
        if isinstance(service_data, dict) and 'id' in service_data:
            # If service is an object with an id field, extract the id
            service_id = service_data['id']
            print(f"DEBUG APPOINTMENT: Extracted service ID from object: {service_id}")
        else:
            # Use service data directly (could be int or string)
            service_id = service_data
            
        # Ensure service_id is an integer
        try:
            service_id = int(service_id)
        except (TypeError, ValueError):
            print(f"DEBUG APPOINTMENT: Invalid service ID: {service_id}")
            return Response({
                'error': f'Invalid service ID: {service_id}'
            }, http_status.HTTP_400_BAD_REQUEST)
        
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        notes = request.data.get('notes', '')
        status = request.data.get('status', 'pending')  # Default to pending if not provided
        client_email = request.data.get('client_email', 'test@example.com')  # Default to test email for testing
        client_phone = request.data.get('client_phone', '')
        client_address = request.data.get('client_address', '')
        
        print(f"DEBUG APPOINTMENT: Extracted data - service_id={service_id}, start_time={start_time}, client_email={client_email}")
        
        # FOR TESTING: Don't require email or authentication
        # if not client_email and not request.user.is_authenticated:
        #     print("DEBUG APPOINTMENT: No client email and not authenticated")
        #     return Response({
        #         'error': 'Either authentication or client_email is required'
        #     }, http_status.HTTP_401_UNAUTHORIZED)
        
        # If client_email is missing but user is authenticated, use user's email
        if not client_email and request.user.is_authenticated:
            client_email = request.user.email
            print(f"DEBUG APPOINTMENT: Using authenticated user email: {client_email}")
        
        try:
            # Get service
            from .models import Service, User
            service = Service.objects.get(id=service_id)
            
            # Convert string times to datetime objects for overlap check
            start_dt = parse_datetime(start_time) if isinstance(start_time, str) else start_time
            end_dt = parse_datetime(end_time) if isinstance(end_time, str) else end_time
            
            # Apply buffer time (15 minutes) to requested appointment time for conflict detection
            buffer_minutes = 15
            # We need to use the buffered times for checking conflicts, but still create the appointment with original times
            buffered_start = start_dt - timezone.timedelta(minutes=buffer_minutes)
            buffered_end = end_dt + timezone.timedelta(minutes=buffer_minutes)
            
            print(f"DEBUG APPOINTMENT: Checking conflicts with buffered time {buffered_start} to {buffered_end}")
            
            # Check for overlapping appointments with the same provider
            # Exclude cancelled appointments since they don't block the time slot
            overlapping_appointments = Appointment.objects.filter(
                service__provider=service.provider,  # Same provider
                status__in=['pending', 'confirmed', 'completed'],  # Active appointments
            ).exclude(status='cancelled')
            
            # Check each appointment for overlap with the buffered time range
            conflicts = []
            for appt in overlapping_appointments:
                # Add buffer around existing appointment
                appt_buffered_start = appt.start_time - timezone.timedelta(minutes=buffer_minutes)
                appt_buffered_end = appt.end_time + timezone.timedelta(minutes=buffer_minutes)
                
                # If appointment buffered time overlaps with our buffered time, it's a conflict
                if appt_buffered_end > buffered_start and appt_buffered_start < buffered_end:
                    conflicts.append(appt)
                    print(f"DEBUG APPOINTMENT: Conflict with appointment {appt.id} from {appt.start_time} to {appt.end_time}")
                    print(f"DEBUG APPOINTMENT: Conflict details: Buffered existing appt {appt_buffered_start} to {appt_buffered_end} overlaps with requested time {buffered_start} to {buffered_end}")
            
            if conflicts:
                return Response({
                    'error': 'This time slot overlaps with an existing appointment. Please choose another time.',
                    'conflict_appointments': [
                        {
                            'id': appt.id,
                            'start_time': appt.start_time.isoformat(),
                            'end_time': appt.end_time.isoformat(),
                            'service': appt.service.name
                        } for appt in conflicts[:3]  # Show up to 3 conflicts
                    ]
                }, http_status.HTTP_409_CONFLICT)
            
            # Determine the consumer for this appointment
            consumer = None
            if request.user.is_authenticated:
                consumer = request.user
            else:
                # For non-authenticated users, we need an email
                # Check if a user with this email already exists
                try:
                    consumer = User.objects.get(email=client_email)
                except User.DoesNotExist:
                    # Create a temporary user with just an email
                    from django.contrib.auth.models import User as AuthUser
                    random_username = f"guest_{client_email.split('@')[0]}_{User.objects.count() + 1}"
                    consumer = User.objects.create(
                        username=random_username,
                        email=client_email,
                        user_type='consumer',
                        phone_number=client_phone,
                        address=client_address
                    )
            
            # Update user details if provided and user exists
            if consumer and (client_phone or client_address):
                if client_phone and not consumer.phone_number:
                    consumer.phone_number = client_phone
                if client_address and not consumer.address:
                    consumer.address = client_address
                consumer.save()
            
            # Create appointment with original (non-buffered) times
            appointment = Appointment.objects.create(
                service=service,
                consumer=consumer,
                start_time=start_time,
                end_time=end_time,
                notes=notes,
                status=status
            )
            
            print(f"DEBUG APPOINTMENT: Created appointment {appointment.id} from {appointment.start_time} to {appointment.end_time}")
            
            return Response({
                'id': appointment.id,
                'service': {
                    'id': appointment.service.id,
                    'name': appointment.service.name
                },
                'start_time': start_time,
                'end_time': end_time,
                'status': appointment.status,
                'notes': appointment.notes
            }, http_status.HTTP_201_CREATED)
        except Service.DoesNotExist:
            return Response({
                'error': 'Service not found'
            }, http_status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            print("Error creating appointment:", str(e))
            print(traceback.format_exc())
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class AppointmentDetailAPI(APIView):
    permission_classes = [AllowAny]  # Allow anyone to view appointments
    authentication_classes = []  # No authentication needed for appointment viewing
    
    def get(self, request, appointment_id):
        """Get appointment by ID"""
        try:
            # Convert string UUID to proper UUID object if needed
            try:
                if not isinstance(appointment_id, uuid.UUID):
                    appointment_id = uuid.UUID(appointment_id)
            except (ValueError, AttributeError) as e:
                return Response({
                    'error': f'Invalid UUID format: {str(e)}'
                }, http_status.HTTP_400_BAD_REQUEST)
        
            # Get appointment directly without permission check for testing
            appointment = Appointment.objects.get(id=appointment_id)
            
            return Response({
                'id': str(appointment.id),  # Convert UUID to string for JSON
                'service': {
                    'id': appointment.service.id,
                    'name': appointment.service.name,
                    'duration': appointment.service.duration,
                    'price': float(appointment.service.price),
                    'provider': {
                        'id': appointment.service.provider.id,
                        'business_name': appointment.service.provider.business_name
                    }
                },
                'consumer': {
                    'id': appointment.consumer.id,
                    'username': appointment.consumer.username,
                    'email': appointment.consumer.email
                },
                'start_time': appointment.start_time.isoformat(),
                'end_time': appointment.end_time.isoformat(),
                'status': appointment.status,
                'notes': appointment.notes,
                'created_at': appointment.created_at.isoformat(),
                'updated_at': appointment.updated_at.isoformat()
            })
        except Appointment.DoesNotExist:
            return Response({
                'error': 'Appointment not found'
            }, http_status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            print(f"Error retrieving appointment: {str(e)}")
            traceback.print_exc()
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request, appointment_id):
        """Update appointment by ID"""
        try:
            # Get appointment directly
            appointment = Appointment.objects.get(id=appointment_id)
            
            # Extract data
            start_time = request.data.get('start_time')
            end_time = request.data.get('end_time')
            notes = request.data.get('notes')
            
            # Only check for overlaps if times are being changed
            if start_time or end_time:
                new_start_time = parse_datetime(start_time) if start_time and isinstance(start_time, str) else (start_time or appointment.start_time)
                new_end_time = parse_datetime(end_time) if end_time and isinstance(end_time, str) else (end_time or appointment.end_time)
                
                # Apply buffer time for conflict detection
                buffer_minutes = 15
                buffered_start = new_start_time - timezone.timedelta(minutes=buffer_minutes)
                buffered_end = new_end_time + timezone.timedelta(minutes=buffer_minutes)
                
                # Check for overlapping appointments with the same provider
                overlapping_appointments = Appointment.objects.filter(
                    service__provider=appointment.service.provider,  # Same provider
                    status__in=['pending', 'confirmed', 'completed'],  # Active appointments
                ).exclude(id=appointment_id).exclude(status='cancelled')  # Exclude this appointment and cancelled ones
                
                # Check each appointment for overlap with the buffered time range
                conflicts = []
                for appt in overlapping_appointments:
                    # Add buffer around existing appointment
                    appt_buffered_start = appt.start_time - timezone.timedelta(minutes=buffer_minutes)
                    appt_buffered_end = appt.end_time + timezone.timedelta(minutes=buffer_minutes)
                    
                    # If appointment buffered time overlaps with our buffered time, it's a conflict
                    if appt_buffered_end > buffered_start and appt_buffered_start < buffered_end:
                        conflicts.append(appt)
                
                if conflicts:
                    return Response({
                        'error': 'This time slot overlaps with an existing appointment. Please choose another time.',
                        'conflict_appointments': [
                            {
                                'id': appt.id,
                                'start_time': appt.start_time.isoformat(),
                                'end_time': appt.end_time.isoformat(),
                                'service': appt.service.name
                            } for appt in conflicts[:3]  # Show up to 3 conflicts
                        ]
                    }, http_status.HTTP_409_CONFLICT)
            
            # Update fields if provided
            if start_time:
                appointment.start_time = start_time
            if end_time:
                appointment.end_time = end_time
            if notes is not None:
                appointment.notes = notes
            
            appointment.save()
            
            return Response({
                'id': appointment.id,
                'service': {
                    'id': appointment.service.id,
                    'name': appointment.service.name
                },
                'start_time': appointment.start_time.isoformat(),
                'end_time': appointment.end_time.isoformat(),
                'status': appointment.status,
                'notes': appointment.notes
            })
        except Appointment.DoesNotExist:
            return Response({
                'error': 'Appointment not found'
            }, http_status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, appointment_id):
        """Delete appointment by ID"""
        try:
            # Get appointment directly
            appointment = Appointment.objects.get(id=appointment_id)
            
            # Delete appointment
            appointment.delete()
            
            return Response(http_status.HTTP_204_NO_CONTENT)
        except Appointment.DoesNotExist:
            return Response({
                'error': 'Appointment not found'
            }, http_status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class AppointmentStatusAPI(APIView):
    permission_classes = [AllowAny]  # Allow anyone to update appointment status
    authentication_classes = []  # No authentication needed
    
    def patch(self, request, appointment_id):
        """Update appointment status"""
        # Extract data
        new_status = request.data.get('status')
        
        # Validate status
        valid_statuses = ['pending', 'confirmed', 'cancelled', 'completed']
        if not new_status or new_status not in valid_statuses:
            return Response({
                'error': f'Status must be one of: {", ".join(valid_statuses)}'
            }, http_status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get appointment
            try:
                appointment = Appointment.objects.get(id=appointment_id)
            except Appointment.DoesNotExist:
                return Response({
                    'error': 'Appointment not found'
                }, http_status.HTTP_404_NOT_FOUND)
            
            # Update status
            appointment.status = new_status
            appointment.save()
            
            return Response({
                'id': appointment.id,
                'status': appointment.status
            })
        except Exception as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

# Regular views
def index(request):
    return render(request, 'main_app/index.html')

def register(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            if user.user_type == 'provider':
                return redirect('provider_setup')
            return redirect('home')
    else:
        form = UserRegistrationForm()
    return render(request, 'registration/register.html', {'form': form})

@login_required
def provider_setup(request):
    if request.user.user_type != 'provider':
        return redirect('home')
    
    if hasattr(request.user, 'provider_profile'):
        return redirect('provider_dashboard')
    
    if request.method == 'POST':
        form = ServiceProviderForm(request.POST)
        if form.is_valid():
            provider = form.save(commit=False)
            provider.user = request.user
            provider.save()
            return redirect('provider_dashboard')
    else:
        form = ServiceProviderForm()
    return render(request, 'main_app/provider_setup.html', {'form': form})

@login_required
def provider_dashboard(request):
    if request.user.user_type != 'provider':
        return redirect('home')
    return render(request, 'main_app/provider_dashboard.html')

class ServiceListView(ListView):
    model = Service
    template_name = 'main_app/service_list.html'
    context_object_name = 'services'

class ServiceProviderListView(ListView):
    model = ServiceProvider
    template_name = 'main_app/provider_list.html'
    context_object_name = 'providers'

class ServiceCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    model = Service
    form_class = ServiceForm
    template_name = 'main_app/service_form.html'
    success_url = reverse_lazy('provider_dashboard')

    def test_func(self):
        return self.request.user.user_type == 'provider'

    def form_valid(self, form):
        form.instance.provider = self.request.user.provider_profile
        return super().form_valid(form)

@login_required
def book_appointment(request, service_id):
    service = Service.objects.get(pk=service_id)
    if request.method == 'POST':
        form = AppointmentForm(request.POST)
        if form.is_valid():
            appointment = form.save(commit=False)
            appointment.service = service
            appointment.consumer = request.user
            appointment.save()
            return redirect('appointment_confirmation', appointment.id)
    else:
        form = AppointmentForm()
    return render(request, 'main_app/book_appointment.html', {
        'form': form,
        'service': service
    })

@login_required
def appointment_list(request):
    if request.user.user_type == 'provider':
        appointments = Appointment.objects.filter(
            service__provider__user=request.user
        ).order_by('start_time')
    else:
        appointments = request.user.appointments.all().order_by('start_time')
    return render(request, 'main_app/appointment_list.html', {
        'appointments': appointments
    })

