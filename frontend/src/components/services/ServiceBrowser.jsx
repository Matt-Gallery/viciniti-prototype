import React, { useState, useEffect, useRef } from 'react';
import { 
    Box,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Paper,
    Divider,
    CircularProgress,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Grid,
    Card,
    CardContent,
    CardActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { services, appointments } from '../../services/api';
import AppointmentCalendar from '../common/AppointmentCalendar';
import { format } from 'date-fns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ServiceBrowser = () => {
    const navigate = useNavigate();
    const calendarRefs = useRef({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [serviceList, setServiceList] = useState([]);
    const [categories, setCategories] = useState([]);
    const [mainCategories, setMainCategories] = useState([]);
    const [selectedMainCategory, setSelectedMainCategory] = useState(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);
    const [filteredServices, setFilteredServices] = useState([]);
    
    // Booking states
    const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingData, setBookingData] = useState({});
    const [bookingError, setBookingError] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingInProgress, setBookingInProgress] = useState(false);

    useEffect(() => {
        Promise.all([
            services.getCategories(),
            services.getAll()
        ])
        .then(([categoriesRes, servicesRes]) => {
            setCategories(categoriesRes.data);
            setServiceList(servicesRes.data);
            
            // Extract and group main categories
            const mainCats = Array.from(
                new Set(categoriesRes.data.map(cat => cat.value.split('_')[0]))
            );
            setMainCategories(mainCats);
            
            setLoading(false);
        })
        .catch(err => {
            console.error('Error loading data');
            setError('Failed to load services. Please try again later.');
            setLoading(false);
        });
    }, []);

    // When a main category is selected, filter the subcategories
    const handleMainCategorySelect = (mainCategory) => {
        setSelectedMainCategory(mainCategory);
        setSelectedSubCategory(null); // Reset sub-category when main category changes
    };

    // When a subcategory is selected, filter the services
    const handleSubCategorySelect = (subCategory) => {
        setSelectedSubCategory(subCategory);
        const filtered = serviceList.filter(service => service.category === subCategory);
        setFilteredServices(filtered);
    };

    // Get display name for main category
    const getMainCategoryName = (key) => {
        switch(key) {
            case 'beauty': return 'Beauty';
            case 'cleaning': return 'Cleaning';
            case 'pet': return 'Pet Care';
            case 'car': return 'Car Care';
            case 'errands': return 'Errands';
            case 'handyman': return 'Handyman';
            default: return key.charAt(0).toUpperCase() + key.slice(1);
        }
    };

    // Filter subcategories based on selected main category
    const getSubCategories = () => {
        if (!selectedMainCategory) return [];
        return categories.filter(cat => cat.value.startsWith(`${selectedMainCategory}_`));
    };

    const handleBookService = (serviceId) => {
        navigate(`/services/${serviceId}/book`);
    };
    
    // Handle time slot selection
    const handleBlockClick = (service, block) => {
        console.log('Selected service');
        console.log('Selected time block');
        
        setSelectedService(service);
        setSelectedSlot(block);
        
        // Pre-populate with user data if available
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                console.log('User data from localStorage:', userData);
                
                // Initialize booking data with user information
                const initialData = {
                    email: userData.email || '',
                    // IMPORTANT: Map from backend phone_number field to our phone field
                    phone: userData.phone_number || '',
                    // Map address fields correctly
                    address_line1: userData.street_address || '',
                    address_line2: userData.apartment || '',
                    city: userData.city || '',
                    state: userData.state || '',
                    zip_code: userData.zip_code || '',
                    notes: ''
                };
                
                // If we don't have the new address fields, try to parse from the legacy address field
                if (userData.address && (!userData.street_address || !userData.city)) {
                    console.log('Parsing from legacy address:', userData.address);
                    const addressLines = userData.address.split(/\n|,/).map(line => line.trim());
                    
                    if (addressLines.length >= 1) {
                        initialData.address_line1 = addressLines[0] || '';
                    }
                    
                    if (addressLines.length >= 2) {
                        // Check if second line looks like an apartment/suite
                        if (addressLines[1] && (
                            addressLines[1].toLowerCase().includes('apt') || 
                            addressLines[1].toLowerCase().includes('suite') || 
                            addressLines[1].toLowerCase().includes('#')
                        )) {
                            initialData.address_line2 = addressLines[1];
                            
                            // If we have more lines, try to parse city, state, zip
                            if (addressLines.length >= 3) {
                                const cityStateZip = addressLines[2].split(/\s+/);
                                if (cityStateZip.length >= 1) initialData.city = cityStateZip[0];
                                if (cityStateZip.length >= 2) initialData.state = cityStateZip[1];
                                if (cityStateZip.length >= 3) initialData.zip_code = cityStateZip[2];
                            }
                        } else {
                            // Assume it's city, state, zip
                            const cityStateZip = addressLines[1].split(/\s+/);
                            if (cityStateZip.length >= 1) initialData.city = cityStateZip[0];
                            if (cityStateZip.length >= 2) initialData.state = cityStateZip[1];
                            if (cityStateZip.length >= 3) initialData.zip_code = cityStateZip[2];
                        }
                    }
                }
                
                console.log('Pre-populating form with data:', initialData);
                setBookingData(initialData);
            } catch (e) {
                console.error('Error parsing user data', e);
                setBookingData({
                    email: '',
                    phone: '',
                    address_line1: '',
                    address_line2: '',
                    city: '',
                    state: '',
                    zip_code: '',
                    notes: ''
                });
            }
        } else {
            console.log('No user data found in localStorage');
            setBookingData({
                email: '',
                phone: '',
                address_line1: '',
                address_line2: '',
                city: '',
                state: '',
                zip_code: '',
                notes: ''
            });
        }
        
        setBookingDialogOpen(true);
        setBookingError('');
        setBookingSuccess(false);
    };
    
    // Handle booking form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBookingData(prev => ({
            ...prev,
            [name]: value
        }));

        // If address fields change, update the combined address field
        if(['address_line1', 'address_line2', 'city', 'state', 'zip_code'].includes(name)) {
            const updatedFormData = {
                ...bookingData,
                [name]: value
            };
            
            // Combine the address fields
            let addressParts = [];
            if (updatedFormData.address_line1) addressParts.push(updatedFormData.address_line1);
            if (updatedFormData.address_line2) addressParts.push(updatedFormData.address_line2);
            
            let cityStateZip = [];
            if (updatedFormData.city) cityStateZip.push(updatedFormData.city);
            if (updatedFormData.state) cityStateZip.push(updatedFormData.state);
            if (updatedFormData.zip_code) cityStateZip.push(updatedFormData.zip_code);
            
            if (cityStateZip.length > 0) {
                addressParts.push(cityStateZip.join(', '));
            }
        }
    };
    
    // Handle booking confirmation
    const handleConfirmBooking = async () => {
        if (!selectedSlot || !selectedService) return;
        
        // Validate inputs
        if (!bookingData.email) {
            setBookingError('Email is required');
            return;
        }
        
        if (!bookingData.phone) {
            setBookingError('Phone number is required');
            return;
        }
        
        if (!bookingData.address_line1) {
            setBookingError('Street address is required');
            return;
        }
        
        if (!bookingData.city) {
            setBookingError('City is required');
            return;
        }
        
        if (!bookingData.state) {
            setBookingError('State is required');
            return;
        }
        
        if (!bookingData.zip_code) {
            setBookingError('ZIP code is required');
            return;
        }
        
        try {
            setBookingInProgress(true);
            
            // Create appointment request
            const appointmentData = {
                service: selectedService,
                start_time: selectedSlot.start.toISOString(),
                end_time: selectedSlot.end.toISOString(),
                status: 'pending',
                notes: bookingData.notes,
                client_email: bookingData.email,
                client_phone: bookingData.phone || '',
                address_line1: bookingData.address_line1 || '',
                address_line2: bookingData.address_line2 || '',
                city: bookingData.city || '',
                state: bookingData.state || '',
                zip_code: bookingData.zip_code || '',
                country: 'United States'
            };
            
            // Call API to create appointment
            await appointments.create(appointmentData);
            
            setBookingSuccess(true);
            setBookingInProgress(false);
            
            // After success, close dialog after 2 seconds and refresh the calendar
            setTimeout(() => {
                setBookingDialogOpen(false);
                setBookingSuccess(false);
                setSelectedService(null);
                setSelectedSlot(null);
                
                // Refresh the calendar for this service
                if (calendarRefs.current[selectedService.id]) {
                    console.log('Refreshing calendar after booking');
                    calendarRefs.current[selectedService.id].fetchUserAppointments();
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error creating appointment');
            setBookingError('Failed to book appointment. Please try again.');
            setBookingInProgress(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{
            width: '100%',
            maxWidth: '100%',
            mx: 0,
            px: 2
        }}>
            <Typography variant="h4" gutterBottom sx={{ ml: 2 }}>
                Browse Services
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2, ml: 2 }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ display: 'flex', minHeight: '70vh', width: '100%', maxWidth: '100%' }}>
                {/* First Column - Main Categories */}
                <Paper 
                    sx={{ 
                        width: '120px', 
                        overflow: 'auto',
                        flexShrink: 0,
                        borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                        ml: 2
                    }}
                >
                    <List sx={{ py: 1 }}>
                        {mainCategories.map((category) => (
                            <ListItem key={category} disablePadding divider>
                                <ListItemButton
                                    selected={selectedMainCategory === category}
                                    onClick={() => handleMainCategorySelect(category)}
                                    sx={{ px: 2 }}
                                >
                                    <ListItemText 
                                        primary={getMainCategoryName(category)} 
                                        primaryTypographyProps={{ fontSize: '0.8rem' }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
                {/* Second Column - Subcategories (only shown when main category is selected) */}
                {selectedMainCategory && (
                    <Paper 
                        sx={{ 
                            width: '140px', 
                            overflow: 'auto',
                            flexShrink: 0,
                            borderRight: '1px solid rgba(0, 0, 0, 0.12)'
                        }}
                    >
                        <List sx={{ py: 1 }}>
                            {getSubCategories().map((subCategory) => (
                                <ListItem key={subCategory.value} disablePadding divider>
                                    <ListItemButton
                                        selected={selectedSubCategory === subCategory.value}
                                        onClick={() => handleSubCategorySelect(subCategory.value)}
                                        sx={{ px: 2 }}
                                    >
                                        <ListItemText 
                                            primary={subCategory.label}
                                            primaryTypographyProps={{ fontSize: '0.8rem' }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}

                {/* Third Column - Service Details */}
                <Box sx={{ 
                    flexGrow: 1, 
                    p: 2, 
                    overflow: 'auto', 
                    width: '98%',
                    minWidth: '300px',
                    pr: 2,
                    mr: 2
                }}>
                    {selectedSubCategory ? (
                        filteredServices.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                                {filteredServices.map(service => (
                                    <Box key={service.id} sx={{ width: '100%' }}>
                                        <Paper sx={{ p: 2, mb: 2, width: '100%', background: 'linear-gradient(135deg, #23203a 60%, #232a5c 100%)', color: '#f5f6fa', borderRadius: 3, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)' }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                                        {service.name}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, maxWidth: '65%' }}>
                                                            {service.description}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                            <Typography variant="body2" color="primary" fontWeight={700}>
                                                                ${service.price}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                {service.duration} min
                                                            </Typography>
                                                            <Typography variant="body2" color="secondary.main">
                                                                {service.provider.business_name}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Category: {service.category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' > ')}
                                                    </Typography>
                                                </Box>
                                                <Divider sx={{ my: 1, bgcolor: 'rgba(255,255,255,0.08)' }} />
                                                <Typography variant="subtitle1" sx={{ mb: 1, mt: 1 }}>
                                                    Available Appointments
                                                </Typography>
                                                <Box sx={{ height: '450px', width: '100%', overflow: 'hidden' }}>
                                                    <AppointmentCalendar
                                                        ref={el => calendarRefs.current[service.id] = el}
                                                        mode="consumer"
                                                        serviceId={service.id}
                                                        service={service}
                                                        daysToShow={5}
                                                        onBlockClick={(block) => handleBlockClick(service, block)}
                                                        title={`Available Appointments for ${service.name}`}
                                                    />
                                                </Box>
                                            </Box>
                                        </Paper>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 3 }}>
                                <Typography variant="body1" color="text.secondary">
                                    No services found in this category.
                                </Typography>
                            </Box>
                        )
                    ) : (
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            height: '100%',
                            textAlign: 'center',
                            color: 'text.secondary'
                        }}>
                            <Typography variant="h6">
                                {selectedMainCategory 
                                    ? 'Select a sub-category to view available services' 
                                    : 'Select a category to start browsing services'}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
            {/* Booking Dialog */}
            <Dialog open={bookingDialogOpen} onClose={() => !bookingInProgress && setBookingDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {bookingSuccess ? "Appointment Confirmed!" : "Book Appointment"}
                </DialogTitle>
                <DialogContent>
                    {bookingSuccess ? (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Your appointment has been booked successfully!
                            </Typography>
                            <Typography variant="body1">
                                {selectedService?.name} on {selectedSlot && format(selectedSlot.start, 'EEEE, MMMM d')} at {selectedSlot && format(selectedSlot.start, 'h:mm a')}
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            {bookingError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {bookingError}
                                </Alert>
                            )}
                            
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Appointment Details
                                </Typography>
                                <Typography variant="body1">
                                    {selectedService?.name}
                                </Typography>
                                <Typography variant="body2">
                                    {selectedSlot && format(selectedSlot.start, 'EEEE, MMMM d')} at {selectedSlot && format(selectedSlot.start, 'h:mm a')} - {selectedSlot && format(selectedSlot.end, 'h:mm a')}
                                </Typography>
                                <Typography variant="body2">
                                    Provider: {selectedService?.provider.business_name}
                                </Typography>
                                <Typography variant="body2" color="primary">
                                    Price: ${selectedService?.price}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.85rem', bgcolor: 'rgba(0, 0, 0, 0.03)', p: 1 }}>
                                    Duration: {selectedService?.duration} minutes
                                </Typography>
                            </Box>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Typography variant="subtitle1" gutterBottom>
                                Contact Information
                            </Typography>
                            
                            <TextField
                                label="Email"
                                name="email"
                                value={bookingData.email || ''}
                                onChange={handleInputChange}
                                fullWidth
                                required
                                margin="dense"
                            />
                            
                            <TextField
                                label="Phone"
                                name="phone"
                                value={bookingData.phone || ''}
                                onChange={handleInputChange}
                                fullWidth
                                required
                                margin="dense"
                            />
                            
                            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                                Address Information
                            </Typography>
                            
                            <TextField
                                label="Street Address"
                                name="address_line1"
                                value={bookingData.address_line1 || ''}
                                onChange={handleInputChange}
                                fullWidth
                                required
                                margin="dense"
                            />
                            
                            <TextField
                                label="Apartment/Suite/Unit (optional)"
                                name="address_line2"
                                value={bookingData.address_line2 || ''}
                                onChange={handleInputChange}
                                fullWidth
                                margin="dense"
                            />
                            
                            <Grid container spacing={2} sx={{ mt: 0 }}>
                                <Grid item xs={12} sm={5}>
                                    <TextField
                                        fullWidth
                                        label="City"
                                        name="city"
                                        value={bookingData.city || ''}
                                        onChange={handleInputChange}
                                        required
                                        margin="dense"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth
                                        label="State"
                                        name="state"
                                        value={bookingData.state || ''}
                                        onChange={handleInputChange}
                                        required
                                        margin="dense"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="ZIP Code"
                                        name="zip_code"
                                        value={bookingData.zip_code || ''}
                                        onChange={handleInputChange}
                                        required
                                        margin="dense"
                                    />
                                </Grid>
                            </Grid>
                            
                            <TextField
                                label="Special Requests or Notes (optional)"
                                name="notes"
                                fullWidth
                                multiline
                                rows={3}
                                value={bookingData.notes || ''}
                                onChange={handleInputChange}
                                margin="dense"
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    {!bookingSuccess && (
                        <>
                            <Button 
                                onClick={() => setBookingDialogOpen(false)} 
                                disabled={bookingInProgress}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleConfirmBooking} 
                                variant="contained" 
                                color="primary"
                                disabled={bookingInProgress}
                            >
                                {bookingInProgress ? <CircularProgress size={24} /> : 'Confirm Booking'}
                            </Button>
                        </>
                    )}
                    {bookingSuccess && (
                        <Button 
                            onClick={() => setBookingDialogOpen(false)} 
                            variant="contained" 
                            color="primary"
                        >
                            Close
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ServiceBrowser; 