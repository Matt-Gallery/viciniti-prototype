# Viciniti - Local Service Provider Platform
Viciniti is a full-stack web application that connects local service providers with consumers, featuring real-time availability management, appointment scheduling, location-based services, and discounts based on the proximity of appointments to one another.
## :star2: Features
### For Consumers
- User registration and profile management
- Browse local service providers
- View provider availability in real-time
- Book and manage appointments
- Location-based service discovery
- Business discount system for nearby services
- Appointment history and status tracking
### For Service Providers
- Provider registration and business profile setup
- Service management (create, edit, delete)
- Real-time availability management
- Appointment scheduling and management
- Business hours configuration
- Location-based pricing and discounts
- Customer management
## :building_construction: Tech Stack
### Frontend
- React.js with Material-UI
- Redux for state management
- React Router for navigation
- Axios for API communication
- Leaflet for maps integration
### Backend
- Django REST Framework
- PostgreSQL with PostGIS for geospatial data
- Django Authentication System
- GeoDjango for location services
- Django GIS (django.contrib.gis) for core spatial functionality
- GDAL (Geospatial Data Abstraction Library) for geocoding
- PostGIS/SpatiaLite - Spatial database extensions
- psycopg2-binary - PostgreSQL adapter
- GeoPY for geocoding
- RESTful API architecture
## :package: Project Structure
```
viciniti/
├── frontend/                 # React frontend application
│   ├── public/              # Static files
│   └── src/
│       ├── components/      # React components
│       │   ├── auth/       # Authentication components
│       │   ├── provider/   # Provider-specific components
│       │   └── shared/     # Shared components
│       ├── services/       # API services
│       └── utils/          # Utility functions
│
├── main_app/                # Django main application
│   ├── models.py           # Database models
│   ├── views.py            # View logic
│   ├── serializers.py      # API serializers
│   └── utils/              # Utility functions
│
└── viciniti/               # Django project settings
    ├── settings.py         # Project settings
    └── urls.py            # URL configuration
```
```
## :books: API Documentation
### Authentication Endpoints
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/` - Update user profile
- `DELETE /api/auth/profile/` - Delete user account
### Provider Endpoints
- `GET /api/providers/` - List providers
- `POST /api/provider/setup/` - Setup provider profile
- `GET /api/provider/profile/` - Get provider profile
- `PUT /api/provider/profile/` - Update provider profile
### Service Endpoints
- `GET /api/services/` - List services
- `POST /api/services/create/` - Create service
- `PUT /api/services/{id}/` - Update service
- `DELETE /api/services/{id}/` - Delete service
### Appointment Endpoints
- `GET /api/appointments/` - List appointments
- `POST /api/appointments/` - Create appointment
- `PUT /api/appointments/{id}/` - Update appointment
- `DELETE /api/appointments/{id}/` - Delete appointment
## :handshake: Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
## :page_facing_up: License
This project is licensed under the MIT License - see the LICENSE file for details.
## :busts_in_silhouette: Authors
- Your Name - Initial work
## :pray: Acknowledgments
- Material-UI for the frontend components
- Django REST Framework for the backend API
- PostGIS for geospatial functionality






