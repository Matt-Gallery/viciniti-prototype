import React, { useState, useEffect } from 'react';
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
    TextField
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { services, appointments } from '../../services/api';
import AppointmentCalendar from '../common/AppointmentCalendar';
import { format } from 'date-fns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ServiceBrowser = () => {
    const navigate = useNavigate();
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
        console.log('Block start');
        console.log('Block end');
        
        setSelectedService(service);
        setSelectedSlot(block);
        
        // Pre-populate with user data if available
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                setBookingData({
                    email: userData.email || '',
                    phone: userData.phone || '',
                    address: userData.address || '',
                    notes: ''
                });
            } catch (e) {
                console.error('Error parsing user data');
            }
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
    };
    
    // Handle booking confirmation
    const handleConfirmBooking = async () => {
        if (!selectedSlot || !selectedService) return;
        
        // Validate inputs
        if (!bookingData.email) {
            setBookingError('Email is required');
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
                notes: bookingData.notes
            };
            
            // Call API to create appointment
            await appointments.create(appointmentData);
            
            setBookingSuccess(true);
            setBookingInProgress(false);
            
            // After success, close dialog after 2 seconds
            setTimeout(() => {
                setBookingDialogOpen(false);
                setBookingSuccess(false);
                setSelectedService(null);
                setSelectedSlot(null);
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
                            <Box sx={{ width: '100%' }}>
                                <Typography variant="h5" gutterBottom>
                                    Available Services
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                                    {filteredServices.map(service => (
                                        <Box key={service.id} sx={{ width: '100%' }}>
                                            <Paper sx={{ p: 2, mb: 2, width: '100%' }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                                    <Box sx={{ mb: 2 }}>
                                                        <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                                                            {service.name}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, maxWidth: '65%' }}>
                                                                {service.description}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                                <Typography variant="body2">
                                                                    Provider: {service.provider.business_name}
                                                                </Typography>
                                                                <Typography variant="body2">
                                                                    Duration: {service.duration} minutes
                                                                </Typography>
                                                                <Typography variant="body2" fontWeight="bold" color="primary.main">
                                                                    ${service.price}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                    <Typography variant="subtitle1" sx={{ mb: 1, mt: 1 }}>
                                                        Available Appointments
                                                    </Typography>
                                                    <Box sx={{ height: '450px', width: '100%', overflow: 'hidden' }}>
                                                        <AppointmentCalendar
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
                                label="Phone (optional)"
                                name="phone"
                                value={bookingData.phone || ''}
                                onChange={handleInputChange}
                                fullWidth
                                margin="dense"
                            />
                            
                            <TextField
                                label="Address (optional)"
                                name="address"
                                value={bookingData.address || ''}
                                onChange={handleInputChange}
                                fullWidth
                                margin="dense"
                            />
                            
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