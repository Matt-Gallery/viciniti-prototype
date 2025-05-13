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
    DialogContentText,
    TextField,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { services, appointments } from '../../services/api';
import { Service, ServiceCategory, TimeBlock, AppointmentCreateRequest } from '../../types';
import AppointmentCalendar from '../common/AppointmentCalendar';
import { format } from 'date-fns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ServiceBrowser: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [serviceList, setServiceList] = useState<Service[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [mainCategories, setMainCategories] = useState<string[]>([]);
    const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
    const [filteredServices, setFilteredServices] = useState<Service[]>([]);
    
    // Booking states
    const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<TimeBlock | null>(null);
    const [bookingData, setBookingData] = useState({
        email: '',
        phone: '',
        address: '',
        notes: ''
    });
    const [bookingError, setBookingError] = useState<string>('');
    const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
    const [bookingInProgress, setBookingInProgress] = useState<boolean>(false);

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
            console.error('Error loading data:', err);
            setError('Failed to load services. Please try again later.');
            setLoading(false);
        });
    }, []);

    // When a main category is selected, filter the subcategories
    const handleMainCategorySelect = (mainCategory: string) => {
        setSelectedMainCategory(mainCategory);
        setSelectedSubCategory(null); // Reset sub-category when main category changes
    };

    // When a subcategory is selected, filter the services
    const handleSubCategorySelect = (subCategory: string) => {
        setSelectedSubCategory(subCategory);
        const filtered = serviceList.filter(service => service.category === subCategory);
        setFilteredServices(filtered);
    };

    // Get display name for main category
    const getMainCategoryName = (key: string): string => {
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
    const getSubCategories = (): ServiceCategory[] => {
        if (!selectedMainCategory) return [];
        return categories.filter(cat => cat.value.startsWith(`${selectedMainCategory}_`));
    };

    const handleBookService = (serviceId: number) => {
        navigate(`/services/${serviceId}/book`);
    };
    
    // Handle time slot selection
    const handleBlockClick = (service: Service, block: TimeBlock) => {
        console.log('Selected service:', service);
        console.log('Selected time block:', block);
        console.log('Block start:', block.start);
        console.log('Block end:', block.end);
        
        setSelectedService(service);
        setSelectedSlot(block);
        
        // Pre-populate with user data if available
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                setBookingData({
                    email: userData.email || '',
                    phone: userData.phone_number || '',
                    address: userData.address || '',
                    notes: ''
                });
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        
        setBookingDialogOpen(true);
        setBookingError('');
        setBookingSuccess(false);
    };
    
    // Handle booking form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
            const appointmentData: AppointmentCreateRequest = {
                service: selectedService.id,
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
            console.error('Error creating appointment:', error);
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
            width: '120%',
            maxWidth: '120%',
            mx: -30,
            px: 0.5
        }}>
            <Typography variant="h4" gutterBottom sx={{ ml: 1 }}>
                Browse Services
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2, ml: 1 }}>
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
                        ml: 1
                    }}
                >
                    <List sx={{ py: 0 }}>
                        {mainCategories.map((category) => (
                            <ListItem key={category} disablePadding divider>
                                <ListItemButton
                                    selected={selectedMainCategory === category}
                                    onClick={() => handleMainCategorySelect(category)}
                                    sx={{ px: 1 }}
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
                            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                        }}
                    >
                        <List sx={{ py: 0 }}>
                            {getSubCategories().map((subCategory) => (
                                <ListItem key={subCategory.value} disablePadding divider>
                                    <ListItemButton
                                        selected={selectedSubCategory === subCategory.value}
                                        onClick={() => handleSubCategorySelect(subCategory.value)}
                                        sx={{ px: 1 }}
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
                    p: 1, 
                    overflow: 'auto', 
                    width: '98%',
                    minWidth: 0,
                    pr: 2,
                    mr: 0
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
                                            <Paper sx={{ p: 1, mb: 1, width: '100%' }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                                    <Box sx={{ mb: 1 }}>
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
                                                    
                                                    <Typography variant="subtitle1" sx={{ mb: 1, mt: 0.5 }}>
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
                            <Box sx={{ textAlign: 'center', py: 4 }}>
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
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
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
                            
                            <Box sx={{ mb: 3 }}>
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
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.85rem', bgcolor: 'rgba(0, 0, 0, 0.03)', p: 1, borderRadius: 1 }}>
                                    Note: We include a 15-minute buffer after your appointment to ensure a smooth transition between clients.
                                </Typography>
                            </Box>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Typography variant="subtitle1" gutterBottom>
                                Your Contact Information
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    name="email"
                                    label="Email"
                                    fullWidth
                                    required
                                    value={bookingData.email}
                                    onChange={handleInputChange}
                                    margin="dense"
                                />
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        name="phone"
                                        label="Phone Number"
                                        fullWidth
                                        value={bookingData.phone}
                                        onChange={handleInputChange}
                                        margin="dense"
                                    />
                                    <TextField
                                        name="address"
                                        label="Address"
                                        fullWidth
                                        value={bookingData.address}
                                        onChange={handleInputChange}
                                        margin="dense"
                                    />
                                </Box>
                                <TextField
                                    name="notes"
                                    label="Notes (optional)"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={bookingData.notes}
                                    onChange={handleInputChange}
                                    margin="dense"
                                />
                            </Box>
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