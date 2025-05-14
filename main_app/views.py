from django.shortcuts import render, redirect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy
from .models import User, Service, ServiceProvider, Appointment, ProviderAvailability
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
            
            # Extract expanded address fields
            street_address = request.data.get('street_address', '')
            apartment = request.data.get('apartment', '')
            city = request.data.get('city', '')
            state = request.data.get('state', '')
            zip_code = request.data.get('zip_code', '')
            
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
                address=address,
                street_address=street_address,
                apartment=apartment,
                city=city,
                state=state,
                zip_code=zip_code
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
                    'user_type': user.user_type,
                    'phone_number': user.phone_number,
                    'address': user.address,
                    'street_address': user.street_address,
                    'apartment': user.apartment,
                    'city': user.city,
                    'state': user.state,
                    'zip_code': user.zip_code
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
                    'phone_number': user.phone_number,
                    'address': user.address,
                    'street_address': user.street_address,
                    'apartment': user.apartment,
                    'city': user.city,
                    'state': user.state,
                    'zip_code': user.zip_code,
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
    permission_classes = [AllowAny]  # Allow any user to view categories
    
    def get(self, request):
        """Return all service categories"""
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
    permission_classes = [AllowAny]  # Allow any user to view services
    
    def get(self, request):
        """Get all services"""
        try:
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
    permission_classes = [AllowAny]  # Allow any user to view service details
    
    def get(self, request, service_id):
        """Get service by ID"""
        try:
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

    def put(self, request, service_id):
        """Update service by ID"""
        try:
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response({
                    'error': 'Authentication required'
                }, http_status.HTTP_401_UNAUTHORIZED)
            
            # Check if user is a provider
            if request.user.user_type != 'provider':
                return Response({
                    'error': 'Only service providers can update services'
                }, http_status.HTTP_403_FORBIDDEN)
                
            from .models import Service
            try:
                # Get the service and check if it belongs to this provider
                service = Service.objects.get(id=service_id, provider__user=request.user)
                
                # Extract data
                name = request.data.get('name')
                description = request.data.get('description')
                price = request.data.get('price')
                duration = request.data.get('duration')
                category = request.data.get('category')
                
                # Update fields if provided
                if name:
                    service.name = name
                if description:
                    service.description = description
                if price is not None:
                    service.price = price
                if duration is not None:
                    service.duration = duration
                if category:
                    service.category = category
                
                service.save()
                
                return Response({
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
                
            except Service.DoesNotExist:
                return Response({
                    'error': 'Service not found or does not belong to this provider'
                }, http_status.HTTP_404_NOT_FOUND)
                
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
            'address': user.address,
            'street_address': user.street_address,
            'apartment': user.apartment,
            'city': user.city,
            'state': user.state,
            'zip_code': user.zip_code
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
        street_address = request.data.get('street_address')
        apartment = request.data.get('apartment')
        city = request.data.get('city')
        state = request.data.get('state')
        zip_code = request.data.get('zip_code')
        
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
        
        # Update new address fields
        if street_address is not None:
            user.street_address = street_address
            
        if apartment is not None:
            user.apartment = apartment
            
        if city is not None:
            user.city = city
            
        if state is not None:
            user.state = state
            
        if zip_code is not None:
            user.zip_code = zip_code
            
        # If address fields are provided but address is not, create a combined address
        if not address and any([street_address, apartment, city, state, zip_code]):
            address_parts = []
            if user.street_address:
                address_parts.append(user.street_address)
            if user.apartment:
                address_parts.append(user.apartment)
                
            location_parts = []
            if user.city:
                location_parts.append(user.city)
            if user.state:
                location_parts.append(user.state)
            if user.zip_code:
                location_parts.append(user.zip_code)
                
            if location_parts:
                address_parts.append(', '.join(location_parts))
                
            user.address = '\n'.join(address_parts)
            
        user.save()
        
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'phone_number': user.phone_number,
            'address': user.address,
            'street_address': user.street_address,
            'apartment': user.apartment,
            'city': user.city,
            'state': user.state,
            'zip_code': user.zip_code
        })
        
    def delete(self, request):
        """Delete the user account"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, http_status.HTTP_401_UNAUTHORIZED)
        
        user = request.user
        
        try:
            # Delete the user's appointments
            from .models import Appointment
            Appointment.objects.filter(consumer=user).delete()
            
            # Delete the user's provider profile if it exists
            if hasattr(user, 'provider_profile'):
                user.provider_profile.delete()
            
            # Delete the user's auth token
            from rest_framework.authtoken.models import Token
            Token.objects.filter(user=user).delete()
            
            # Finally, delete the user
            user.delete()
            
            return Response({
                'message': 'Account deleted successfully'
            }, http_status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Failed to delete account: {str(e)}'
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

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

class ServiceAvailabilityAPI(APIView):
    permission_classes = [AllowAny]  # Allow anyone to view availability

    def get(self, request, service_id):
        """Get availability for a specific service with accurate conflict detection"""
        try:
            # Add debug logging
            print(f"DEBUG AVAILABILITY: Calculating availability for service {service_id}")
            
            from .models import Service, ProviderAvailability, Appointment
            # Check if service exists
            service = Service.objects.get(id=service_id)
            
            # Get provider associated with this service
            provider = service.provider
            print(f"DEBUG AVAILABILITY: Found provider: {provider.business_name}")
            
            # Get existing appointments for this provider (not just this service)
            # This ensures we account for all provider commitments
            existing_appointments = Appointment.objects.filter(
                service__provider=provider,  # All provider appointments
                status__in=['pending', 'confirmed', 'completed']  # Only active appointments
            )
            
            print(f"DEBUG AVAILABILITY: Found {existing_appointments.count()} existing appointments")
            for appt in existing_appointments:
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
                        'duration': duration_minutes
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
                        available_slots.append(slot)
                        print(f"DEBUG AVAILABILITY: Added available slot: {slot['id']} at {slot['start']}")
                    
                    # Move to the next potential slot - add duration PLUS buffer time for spacing between slots
                    # This ensures each appointment has buffer time on both sides
                    slot_index += 1
                    current_start = current_start + timezone.timedelta(minutes=duration_minutes + buffer_minutes)
                
                # Add valid slots to the output
                for slot in available_slots:
                    availability_data[day_key].append({
                        'id': slot['id'],
                        'start': slot['start'].isoformat(),
                        'end': slot['end'].isoformat()
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
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all appointments for the authenticated user or provider"""
        try:
            # Get appointments based on user type
            if request.user.user_type == 'provider':
                # Providers see appointments for their services
                appointments = Appointment.objects.filter(
                    service__provider__user=request.user
                ).order_by('start_time')
            else:
                # Consumers see their own appointments
                appointments = Appointment.objects.filter(
                    consumer=request.user
                ).order_by('start_time')
            
            # Serialize appointments
            appointment_list = []
            for appointment in appointments:
                appointment_list.append({
                    'id': appointment.id,
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
            
            return Response(appointment_list)
        except Exception as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Create a new appointment"""
        try:
            # Debug logging
            print("DEBUG APPOINTMENT: Starting appointment creation")
            print(f"DEBUG APPOINTMENT: Request data: {request.data}")
            
            # Extract data
            service_data = request.data.get('service')
            if isinstance(service_data, dict) and 'id' in service_data:
                service_id = service_data['id']
            else:
                service_id = service_data
                
            try:
                service_id = int(service_id)
            except (TypeError, ValueError):
                return Response({
                    'error': f'Invalid service ID: {service_id}'
                }, http_status.HTTP_400_BAD_REQUEST)
            
            start_time = request.data.get('start_time')
            end_time = request.data.get('end_time')
            notes = request.data.get('notes', '')
            status = request.data.get('status', 'pending')
            
            # Extract address fields
            address_line1 = request.data.get('address_line1', '')
            address_line2 = request.data.get('address_line2', '')
            city = request.data.get('city', '')
            state = request.data.get('state', '')
            zip_code = request.data.get('zip_code', '')
            country = request.data.get('country', 'United States')
            
            # Get service
            service = Service.objects.get(id=service_id)
            
            # Convert string times to datetime objects
            start_dt = parse_datetime(start_time) if isinstance(start_time, str) else start_time
            end_dt = parse_datetime(end_time) if isinstance(end_time, str) else end_time
            
            # Apply buffer time for conflict detection
            buffer_minutes = 15
            buffered_start = start_dt - timezone.timedelta(minutes=buffer_minutes)
            buffered_end = end_dt + timezone.timedelta(minutes=buffer_minutes)
            
            print(f"DEBUG APPOINTMENT: Checking conflicts for time range {start_dt} to {end_dt}")
            print(f"DEBUG APPOINTMENT: With buffer: {buffered_start} to {buffered_end}")
            
            # Check for overlapping appointments
            overlapping_appointments = Appointment.objects.filter(
                service__provider=service.provider,
                status__in=['pending', 'confirmed', 'completed'],
            ).exclude(status='cancelled')
            
            print(f"DEBUG APPOINTMENT: Found {overlapping_appointments.count()} potential conflicts")
            
            conflicts = []
            for appt in overlapping_appointments:
                appt_buffered_start = appt.start_time - timezone.timedelta(minutes=buffer_minutes)
                appt_buffered_end = appt.end_time + timezone.timedelta(minutes=buffer_minutes)
                
                print(f"DEBUG APPOINTMENT: Checking against appointment {appt.id}:")
                print(f"  - Original time: {appt.start_time} to {appt.end_time}")
                print(f"  - Buffered time: {appt_buffered_start} to {appt_buffered_end}")
                
                # Check if there's any overlap
                if (start_dt < appt_buffered_end and end_dt > appt_buffered_start):
                    conflicts.append(appt)
                    print(f"DEBUG APPOINTMENT: Found conflict with appointment {appt.id}")
            
            if conflicts:
                conflict_details = []
                for appt in conflicts:
                    conflict_details.append({
                        'id': appt.id,
                        'start_time': appt.start_time.isoformat(),
                        'end_time': appt.end_time.isoformat(),
                        'service': appt.service.name,
                        'status': appt.status
                    })
                
                return Response({
                    'error': 'This time slot overlaps with an existing appointment. Please choose another time.',
                    'conflict_appointments': conflict_details
                }, http_status.HTTP_409_CONFLICT)
            
            # Create appointment
            appointment = Appointment(
                service=service,
                consumer=request.user,
                start_time=start_time,
                end_time=end_time,
                notes=notes,
                status=status,
                # Add address fields
                address_line1=address_line1,
                address_line2=address_line2,
                city=city,
                state=state,
                zip_code=zip_code,
                country=country,
                id=uuid.uuid4()  # Explicitly set a UUID
            )
            appointment.save()
            
            print(f"DEBUG APPOINTMENT: Successfully created appointment {appointment.id}")
            
            return Response({
                'id': str(appointment.id),  # Convert UUID to string for JSON
                'service': {
                    'id': appointment.service.id,
                    'name': appointment.service.name
                },
                'start_time': start_time,
                'end_time': end_time,
                'status': appointment.status,
                'notes': appointment.notes,
                'address_line1': appointment.address_line1,
                'address_line2': appointment.address_line2,
                'city': appointment.city,
                'state': appointment.state,
                'zip_code': appointment.zip_code
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
            # Get appointment directly without permission check for testing
            appointment = Appointment.objects.get(id=appointment_id)
            
            return Response({
                'id': appointment.id,
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
                'address': {
                    'address_line1': appointment.address_line1,
                    'address_line2': appointment.address_line2,
                    'city': appointment.city,
                    'state': appointment.state,
                    'zip_code': appointment.zip_code,
                    'country': appointment.country
                },
                'created_at': appointment.created_at.isoformat(),
                'updated_at': appointment.updated_at.isoformat()
            })
        except Appointment.DoesNotExist:
            return Response({
                'error': 'Appointment not found'
            }, http_status.HTTP_404_NOT_FOUND)
        except Exception as e:
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

class ProviderAppointmentListAPI(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, provider_id):
        """Get all appointments for a specific provider"""
        try:
            # Verify the provider exists and belongs to the authenticated user
            provider = ServiceProvider.objects.get(id=provider_id)
            if provider.user != request.user:
                return Response({
                    'error': 'You do not have permission to view these appointments'
                }, http_status.HTTP_403_FORBIDDEN)
            
            # Get appointments for this provider's services
            appointments = Appointment.objects.filter(
                service__provider=provider
            ).order_by('start_time')
            
            # Serialize appointments
            appointment_list = []
            for appointment in appointments:
                appointment_list.append({
                    'id': appointment.id,
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
            
            return Response(appointment_list)
        except ServiceProvider.DoesNotExist:
            return Response({
                'error': 'Provider not found'
            }, http_status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class ConsumerAppointmentListAPI(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, consumer_id):
        """Get all appointments for a specific consumer"""
        try:
            # Verify the consumer exists and is the authenticated user
            consumer = User.objects.get(id=consumer_id)
            if consumer != request.user:
                return Response({
                    'error': 'You do not have permission to view these appointments'
                }, http_status.HTTP_403_FORBIDDEN)
            
            # Get appointments for this consumer
            appointments = Appointment.objects.filter(
                consumer=consumer
            ).order_by('start_time')
            
            # Serialize appointments
            appointment_list = []
            for appointment in appointments:
                appointment_list.append({
                    'id': appointment.id,
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
            
            return Response(appointment_list)
        except User.DoesNotExist:
            return Response({
                'error': 'Consumer not found'
            }, http_status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProviderServiceListAPI(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, provider_id):
        """Get all services for a specific provider"""
        try:
            # Get services for this provider
            services = Service.objects.filter(
                provider_id=provider_id,
                is_active=True
            )
            
            # Serialize services
            service_list = []
            for service in services:
                service_list.append({
                    'id': service.id,
                    'name': service.name,
                    'description': service.description,
                    'price': float(service.price),
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
            print(f"Error in ProviderServiceListAPI: {str(e)}")
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

