import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Alert,
    Divider,
    Box,
    Typography,
    Button
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { format } from 'date-fns';
import { appointments, services } from '../../services/api';
import AppointmentCalendar from '../common/AppointmentCalendar';


const ConsumerAppointmentCalendar = forwardRef(({ 
    serviceId,
    daysToShow = 5,
    location = null,
    onAppointmentBooked 
}, ref) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [service, setService] = useState(null);
    const innerCalendarRef = useRef(null);
    
    // State for booking dialog
    const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingData, setBookingData] = useState({});
    const [bookingError, setBookingError] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingInProgress, setBookingInProgress] = useState(false);
    
    // Forward methods from the inner calendar ref to the parent
    useImperativeHandle(ref, () => ({
        fetchUserAppointments: async () => {
            console.log('fetchUserAppointments called on ConsumerAppointmentCalendar');
            if (innerCalendarRef.current && typeof innerCalendarRef.current.fetchUserAppointments === 'function') {
                console.log('Delegating to inner calendar ref');
                return innerCalendarRef.current.fetchUserAppointments();
            }
            console.warn('Inner calendar ref not available');
            return [];
        }
    }));
    
    // Define fetchServiceData with useCallback to prevent recreation on every render
    const fetchServiceData = useCallback(async () => {
        try {
            setLoading(true);
            const serviceResponse = await services.getById(serviceId);
            console.log('Service data loaded');
            setService(serviceResponse.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching service');
            setError('Unable to load service information. Please try again later.');
            setLoading(false);
        }
    }, [serviceId, setLoading, setService, setError]);
    
    // Update the useEffect to use the new fetchServiceData function
    useEffect(() => {
        fetchServiceData();
    }, [fetchServiceData]);
    
    // Handle time slot selection
    const handleBlockClick = (block) => {
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
    
    // Now update the refreshCalendar function to use the properly defined fetchServiceData
    const refreshCalendar = async () => {
        console.log('Refreshing calendar data after booking');
        
        // If calendarRef.current exists and has a fetchUserAppointments method, call it
        if (innerCalendarRef.current && typeof innerCalendarRef.current.fetchUserAppointments === 'function') {
            try {
                console.log('Calling calendar fetchUserAppointments method');
                const result = await innerCalendarRef.current.fetchUserAppointments();
                console.log('Calendar appointment refresh completed, found appointments:', result ? result.length : 0);
                
                // Now directly re-fetch service data rather than waiting
                console.log('Re-fetching service data after appointment booking');
                await fetchServiceData();
                console.log('Service data refresh completed');
                
                return true;
            } catch (error) {
                console.error('Error refreshing calendar:', error);
                throw error;
            }
        } else {
            console.warn('Calendar ref or fetchUserAppointments method not available');
            return false;
        }
    };
    
    // Handle booking confirmation with better synchronization of API calls and UI updates
    const handleConfirmBooking = async () => {
        if (!selectedSlot || !service) return;
        
        // Validate inputs
        if (!bookingData.email) {
            setBookingError('Email is required');
            return;
        }
        
        try {
            setBookingInProgress(true);
            setBookingError('');
            
            console.log('Creating appointment with slot:', selectedSlot);
            console.log('Email being submitted:', bookingData.email);
            
            // Add the buffer time to the end time
            const appointmentEndTime = new Date(selectedSlot.end);
            
            // Create appointment request
            const appointmentData = {
                service: parseInt(serviceId), // Make sure it's a number
                start_time: selectedSlot.start instanceof Date ? selectedSlot.start.toISOString() : selectedSlot.start,
                end_time: appointmentEndTime instanceof Date ? appointmentEndTime.toISOString() : appointmentEndTime,
                status: 'pending',
                notes: bookingData.notes || '',
                client_email: bookingData.email, // This must be sent
                client_phone: bookingData.phone || '',
                client_address: bookingData.address || ''
            };
            
            // Add location information if available
            if (location) {
                appointmentData.latitude = location.latitude;
                appointmentData.longitude = location.longitude;
            }
            
            // Add pricing information if the slot has discount info
            if (selectedSlot.discount_percentage > 0) {
                appointmentData.original_price = selectedSlot.original_price;
                appointmentData.final_price = selectedSlot.final_price;
                appointmentData.discount_percentage = selectedSlot.discount_percentage;
                appointmentData.discount_reason = `Proximity discount: ${selectedSlot.discount_percentage}% off for ${selectedSlot.nearby_appointments} nearby appointment(s)`;
            }
            
            console.log('Sending appointment data:', JSON.stringify(appointmentData));
            
            // Call API to create appointment
            const response = await appointments.create(appointmentData);
            console.log('Appointment created successfully:', response.data);
            
            // Get the created appointment from the response
            const createdAppointment = response.data;
            
            // Set success state and show the success modal view
            setBookingSuccess(true);
            
            // CRITICAL: Force calendar to refresh immediately after booking
            // We use a try-catch but continue regardless of errors to ensure the booking success is shown
            try {
                console.log('Forcing immediate calendar refresh after booking success');
                
                // First force-refresh through the parent to get fresh data
                if (onAppointmentBooked) {
                    console.log('Notifying parent about new appointment for data refresh');
                    // Delay slightly to allow API to reflect changes
                    setTimeout(() => {
                        onAppointmentBooked(createdAppointment);
                    }, 300);
                }
                
                // Then try multiple approaches to update the UI
                setTimeout(async () => {
                    try {
                        console.log('Direct refresh via calendar ref');
                        
                        // Attempt 1: Try the calendar refresh method directly
                        if (innerCalendarRef.current && 
                            typeof innerCalendarRef.current.fetchUserAppointments === 'function') {
                            await innerCalendarRef.current.fetchUserAppointments();
                        }
                        
                        // Attempt 2: Try refreshing service data
                        await fetchServiceData();
                        
                        console.log('All refresh attempts completed');
                    } catch (refreshError) {
                        console.error('Error refreshing calendar data:', refreshError);
                    } finally {
                        // Close the dialog regardless of refresh result
                        setTimeout(() => {
                            setBookingDialogOpen(false);
                            setBookingInProgress(false);
                        }, 1500);
                    }
                }, 500);
            } catch (refreshError) {
                console.error('Failed to refresh calendar:', refreshError);
                // Still close the dialog after delay
                setTimeout(() => {
                    setBookingDialogOpen(false);
                    setBookingInProgress(false);
                }, 1500);
            }
        } catch (error) {
            console.error('Error creating appointment:', error);
            
            // Handle conflict errors (HTTP 409)
            if (error.response && error.response.status === 409) {
                const conflicts = error.response.data.conflict_appointments || [];
                const conflictTimes = conflicts.map((conflict) => {
                    const start = new Date(conflict.start_time);
                    const end = new Date(conflict.end_time);
                    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
                }).join(', ');
                
                if (conflictTimes) {
                    setBookingError(`This time slot is already booked. Conflicting times: ${conflictTimes}`);
                } else {
                    setBookingError('This time slot conflicts with an existing appointment. Please choose another time.');
                }
            } else {
                setBookingError(error.response?.data?.error || 'Failed to book appointment. Please try again.');
            }
            
            setBookingInProgress(false);
            
            // Also refresh the calendar to get the latest availability even in error case
            refreshCalendar().catch(e => console.error('Error refreshing calendar after booking error:', e));
        }
    };
    
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <CircularProgress />
            </Box>
        );
    }
    
    if (error) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                {error}
            </Alert>
        );
    }
    
    if (!service) {
        return (
            <Alert severity="warning" sx={{ mt: 2 }}>
                Service information not available
            </Alert>
        );
    }
    
    // Fix the getServiceAvailabilityUrl function
    const getServiceAvailabilityUrl = () => {
        if (!location || !location.latitude || !location.longitude) {
            console.log('No location data available, using default service availability endpoint');
            return null;
        }
        
        // Construct full URL with location parameters
        const url = `/services/${serviceId}/availability/?latitude=${location.latitude}&longitude=${location.longitude}`;
        console.log('Using location-based availability URL:', url);
        return url;
    };
    
    return (
        <>
            {service && (
                <AppointmentCalendar
                    ref={innerCalendarRef}
                    mode="consumer"
                    serviceId={serviceId}
                    service={service}
                    daysToShow={daysToShow}
                    onBlockClick={handleBlockClick}
                    title={`Available Appointments for ${service.name}`}
                    serviceAvailabilityUrl={getServiceAvailabilityUrl()}
                />
            )}
            
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
                                {service.name} on {selectedSlot && format(new Date(selectedSlot.start), 'EEEE, MMMM d')} at {selectedSlot && format(new Date(selectedSlot.start), 'h:mm a')}
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
                                    {service.name}
                                </Typography>
                                <Typography variant="body2">
                                    {selectedSlot && format(new Date(selectedSlot.start), 'EEEE, MMMM d')} at {selectedSlot && format(new Date(selectedSlot.start), 'h:mm a')}
                                </Typography>
                                <Typography variant="body2">
                                    Provider: {service.provider.business_name}
                                </Typography>
                                
                                {/* Show price with discount if applicable */}
                                {selectedSlot && selectedSlot.discount_percentage > 0 ? (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                                            Regular price: ${selectedSlot.original_price}
                                        </Typography>
                                        <Typography variant="body1" color="primary" fontWeight="bold">
                                            Discounted price: ${selectedSlot.final_price} 
                                            <Typography component="span" variant="body2" color="success.main" sx={{ ml: 1 }}>
                                                (Save {selectedSlot.discount_percentage}%)
                                            </Typography>
                                        </Typography>
                                        <Typography variant="body2" color="success.main" sx={{ fontSize: '0.8rem' }}>
                                            Special discount for booking near {selectedSlot.nearby_appointments} existing appointment(s)!
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="primary">
                                        Price: ${service.price}
                                    </Typography>
                                )}
                                
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: '0.85rem', bgcolor: 'rgba(0, 0, 0, 0.03)', p: 1 }}>
                                    Duration: {service.duration} minutes
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
        </>
    );
});

// Add display name for DevTools
ConsumerAppointmentCalendar.displayName = 'ConsumerAppointmentCalendar';

export default ConsumerAppointmentCalendar; 