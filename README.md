# Viciniti
A platform that matches service consumers with providers, facilitating efficient delivery scheduling and cost savings through proximity-based discounts.
## Overview
Viciniti optimizes service delivery by grouping appointments geographically, offering dynamic discounts based on proximity to existing bookings. This creates a win-win scenario where providers reduce delivery costs while consumers enjoy better pricing.
## Features
### For Consumers
- **Authentication & Profile Management**
  - User registration with role selection
  - Secure login/logout
  - Profile management
  - Address management with geocoding
  - Password management
  - Delete Profile
- **Service Discovery & Booking**
  - Browse services by categories
  - Service details and pricing
  - Provider information
  - Interactive booking calendar
  - Real-time availability
  - Proximity-based discounts
  - Appointment management
- **Appointment Management**
  - View all appointments
  - Detailed appointment information
  - Cancel/reschedule functionality
  - Appointment history
  - Confirmation notifications
- **Smart Discount System**
  - Dynamic pricing based on location
  - Four-tier discount structure:
    - Tier 1 (0-200 yards): 15-35% off
    - Tier 2 (200-600 yards): 12-24% off
    - Tier 3 (600 yards - 1 mile): 10-14% off
    - Tier 4 (1-3 miles): 5-9% off
  - Scaling discounts with nearby appointments
  - Real-time price calculations
### For Service Providers
- **Provider Dashboard**
  - Business profile management
  - Service management
  - Availability control
  - Appointment calendar
  - Customer management
- **Service Management**
  - Create/edit/delete services
  - Pricing and duration settings
  - Category management
  - Availability control
- **Availability Management**
  - Working hours configuration
  - Time blocking
  - Buffer time management
  - Slot management
- **Discount Configuration**
  - Toggle proximity discounts
  - Distance tier settings
  - Discount percentage configuration
  - Appointment count scaling
  - Real-time preview
### Backend
- Django
- Django REST Framework
- PostgreSQL with PostGIS
- GeoDjango for spatial queries
### Frontend
- React
- Material-UI
- Redux for state management
- React Router for navigation
### Key Technical Features
- **Geospatial Integration**
  - Address geocoding
  - Distance calculations
  - Proximity-based matching
  - Location-based discovery
- **Real-time Updates**
  - Live availability
  - Dynamic pricing
  - Instant confirmations
  - Calendar synchronization
- **Security**
  - Role-based access control
  - Secure authentication
  - Data encryption
  - Protected API endpoints
## API Endpoints
### Authentication
| Route | Method | Description | Access |
|-------|--------|-------------|--------|
| `/api/signup` | POST | Create new user | Public |
| `/api/login` | POST | Authenticate user | Public |
| `/api/logout` | POST | Log out user | Authenticated |
| `/api/user` | POST | Complete provider profile | Authenticated |
### Services
| Route | Method | Description | Access |
|-------|--------|-------------|--------|
| `/api/services` | GET | List all services | Authenticated |
| `/api/services` | POST | Create service | Provider |
| `/api/services/:id` | PUT | Update service | Provider |
| `/api/services/:id` | DELETE | Delete service | Provider |
### Appointments
| Route | Method | Description | Access |
|-------|--------|-------------|--------|
| `/api/appointments` | GET | List appointments | Authenticated |
| `/api/appointments` | POST | Book appointment | Customer |
| `/api/appointments/:id` | PUT | Update appointment | Customer |
| `/api/appointments/:id` | DELETE | Cancel appointment | Customer |
| `/api/appointments/available` | GET | Check availability | Customer |
## Getting Started
1. Clone the repository
```bash
git clone https://github.com/Matt-Gallery/viciniti-prototype.git
```
2. Install dependencies
```bash
# Backend
cd viciniti-prototype
pip install -r requirements.txt
# Frontend
cd frontend
npm install
```
3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```
4. Run the development servers
```bash
# Backend
python manage.py runserver
# Frontend
cd frontend
npm start
```
## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
## License
This project is licensed under the MIT License - see the LICENSE file for details.
## Contact
Project Link: [https://github.com/Matt-Gallery/viciniti-prototype](https://github.com/Matt-Gallery/viciniti-prototype)