import React, { useState, useEffect, useRef } from 'react';
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
    Button,
    Grid
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { format } from 'date-fns';
import { appointments, services } from '../../services/api';
import AppointmentCalendar from '../common/AppointmentCalendar';


const ConsumerAppointmentCalendar = ({ 
    serviceId,
    daysToShow = 5,
    onAppointmentBooked 
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [service, setService] = useState(null);
    const calendarRef = useRef(null);
    
    // State for booking dialog
    const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingData, setBookingData] = useState({});
    const [bookingError, setBookingError] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingInProgress, setBookingInProgress] = useState(false);
    
    // Fetch service details
    useEffect(() => {
        const fetchServiceData = async () => {
            try {
                setLoading(true);
                const serviceResponse = await services.getById(serviceId);
                setService(serviceResponse.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching service');
                setError('Unable to load service information. Please try again later.');
                setLoading(false);
            }
        };
        
        fetchServiceData();
    }, [serviceId]);
    
    // Handle time slot selection
    const handleBlockClick = (block) => {
        setSelectedSlot(block);
        
        // Initialize with empty values
        const initialBookingData = {
            email: '',
            phone: '',
            address_line1: '',
            address_line2: '',
            city: '',
            state: '',
            zip_code: '',
            notes: ''
        };
        
        // Pre-populate with user data if available
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                
                // Set email from user data
                initialBookingData.email = userData.email || '';
                
                // IMPORTANT: Map from backend phone_number field to our phone field
                initialBookingData.phone = userData.phone_number || '';
                
                // Set address fields from userData properties if they exist
                if (userData.street_address) initialBookingData.address_line1 = userData.street_address;
                if (userData.apartment) initialBookingData.address_line2 = userData.apartment;
                if (userData.city) initialBookingData.city = userData.city;
                if (userData.state) initialBookingData.state = userData.state;
                if (userData.zip_code) initialBookingData.zip_code = userData.zip_code;
                
                // If the new fields aren't available, try to parse from the legacy address field
                if (userData.address && (!userData.street_address && !userData.city)) {
                    const addressLines = userData.address.split(/\n|,/).map(line => line.trim());
                    
                    if (addressLines.length >= 1) {
                        initialBookingData.address_line1 = addressLines[0] || '';
                    }
                    
                    if (addressLines.length >= 2) {
                        // Check if second line looks like an apartment/suite
                        if (addressLines[1] && (
                            addressLines[1].toLowerCase().includes('apt') || 
                            addressLines[1].toLowerCase().includes('suite') || 
                            addressLines[1].toLowerCase().includes('#')
                        )) {
                            initialBookingData.address_line2 = addressLines[1];
                            
                            // If we have more lines, try to parse city, state, zip
                            if (addressLines.length >= 3) {
                                const cityStateZip = addressLines[2].split(/\s+/);
                                if (cityStateZip.length >= 1) initialBookingData.city = cityStateZip[0];
                                if (cityStateZip.length >= 2) initialBookingData.state = cityStateZip[1];
                                if (cityStateZip.length >= 3) initialBookingData.zip_code = cityStateZip[2];
                            }
                        } else {
                            // Assume it's city, state, zip
                            const cityStateZip = addressLines[1].split(/\s+/);
                            if (cityStateZip.length >= 1) initialBookingData.city = cityStateZip[0];
                            if (cityStateZip.length >= 2) initialBookingData.state = cityStateZip[1];
                            if (cityStateZip.length >= 3) initialBookingData.zip_code = cityStateZip[2];
                        }
                    }
                }
                
                setBookingData(initialBookingData);
                
            } catch (e) {
                console.error('Error parsing user data', e);
                setBookingData(initialBookingData);
            }
        } else {
            setBookingData(initialBookingData);
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
            
            // Update the combined address field
            setBookingData(prev => ({
                ...prev,
                [name]: value,
                address: addressParts.join('\n')
            }));
        }
    };
    
    // Force refresh the calendar component to show updated appointments
    const refreshCalendar = () => {
        // If calendarRef.current exists and has a fetchUserAppointments method, call it
        if (calendarRef.current && typeof calendarRef.current.fetchUserAppointments === 'function') {
            calendarRef.current.fetchUserAppointments();
        }
    };
    
    // Check for existing appointments that might conflict
    const checkForConflicts = async (startTime, endTime) => {
        try {
            // Get the provider ID from the service
            const providerId = service?.provider?.id;
            if (!providerId) {
                console.error('Cannot check conflicts: Provider ID not available');
                return null;
            }
            
            // Get all appointments for this provider's services
            
            const response = await appointments.getByProvider(providerId);
            
            // Filter for appointments that overlap with our time slot
            const overlapping = response.data.filter(apt => {
                if (apt.status === 'cancelled') return false; // Ignore cancelled appointments
                
                const aptStart = new Date(apt.start_time);
                const aptEnd = new Date(apt.end_time);
                
                // Check if there's any overlap
                return (startTime < aptEnd && endTime > aptStart);
            });
            
            return overlapping;
        } catch (error) {
            console.error('Error checking for conflicting appointments:', error);
            return null;
        }
    };
    
    // Handle booking confirmation
    const handleConfirmBooking = async () => {
        if (!selectedSlot || !service) return;
        
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
            setBookingError('');
            
            
            // Create the appointment end time from the slot's end time
            const appointmentEndTime = new Date(selectedSlot.end);
            
            // Check if this slot has buffer information from the backend
            if (selectedSlot.buffer_info) {
                
                // Parse the buffer times
                const bufferedStart = new Date(selectedSlot.buffer_info.buffered_start);
                const bufferedEnd = new Date(selectedSlot.buffer_info.buffered_end);
                
                // Check for potential conflicts with the buffered time values
                const conflictingAppointments = await checkForConflicts(
                    bufferedStart, 
                    bufferedEnd
                );
                
                if (conflictingAppointments && conflictingAppointments.length > 0) {
                    
                    conflictingAppointments.forEach(conflict => {
                    });
                }
            } else {
                
                // Check for potential conflicts with non-buffered times
                const conflictingAppointments = await checkForConflicts(
                    selectedSlot.start, 
                    appointmentEndTime
                );
                
                // If there are conflicts, show a warning but still allow the user to proceed
                if (conflictingAppointments && conflictingAppointments.length > 0) {
                    console.warn('Potential conflicting appointments detected:', conflictingAppointments);
                    
                    // Get short times for warning message
                    const conflictTimes = conflictingAppointments.map(conflict => {
                        const start = new Date(conflict.start_time);
                        const end = new Date(conflict.end_time);
                        const status = conflict.status ? ` (${conflict.status})` : '';
                        return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}${status}`;
                    }).join(', ');
                    
                    console.warn(`Time slots that may conflict: ${conflictTimes}`);
                }
            }
            
            // Create appointment request
            const appointmentData = {
                service: parseInt(serviceId), // Make sure it's a number
                start_time: selectedSlot.start.toISOString(),
                end_time: appointmentEndTime.toISOString(),
                status: 'confirmed',
                notes: bookingData.notes || '',
                address_line1: bookingData.address_line1 || '',
                address_line2: bookingData.address_line2 || '',
                city: bookingData.city || '',
                state: bookingData.state || '',
                zip_code: bookingData.zip_code || '',
                country: 'United States'
            };
            
            // Add buffer information if available
            if (selectedSlot.buffer_info) {
                appointmentData.buffer_minutes = selectedSlot.buffer_info.buffer_minutes;
                appointmentData.buffered_start = selectedSlot.buffer_info.buffered_start;
                appointmentData.buffered_end = selectedSlot.buffer_info.buffered_end;
            }
            
            // Add discount information if available
            if (selectedSlot.discountPercentage > 0) {
                appointmentData.original_price = selectedSlot.originalPrice;
                appointmentData.discount_amount = selectedSlot.originalPrice - selectedSlot.discountedPrice;
                appointmentData.final_price = selectedSlot.discountedPrice;
                appointmentData.discount_percentage = selectedSlot.discountPercentage;
                appointmentData.discount_reason = 'Proximity discount';
            }
            
            // Call API to create appointment
            const response = await appointments.create(appointmentData);
            
            setBookingSuccess(true);
            setBookingInProgress(false);
            
            // Refresh appointments in the calendar
            refreshCalendar();
            
            // After success, close dialog and refresh
            setTimeout(() => {
                setBookingDialogOpen(false);
                if (onAppointmentBooked) {
                    onAppointmentBooked();
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error creating appointment:', error);
            console.error('Error response:', error.response?.data);
            
            // Handle conflict errors (HTTP 409)
            if (error.response && error.response.status === 409) {
                const conflicts = error.response.data.conflict_appointments || [];
                
                const conflictTimes = conflicts.map((conflict) => {
                    const start = new Date(conflict.start_time);
                    const end = new Date(conflict.end_time);
                    const status = conflict.status ? ` (${conflict.status})` : '';
                    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}${status}`;
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
            
            // Also refresh the calendar to get the latest availability
            refreshCalendar();
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
    
    return (
        <>
            {service && (
                <AppointmentCalendar
                    ref={calendarRef}
                    mode="consumer"
                    serviceId={serviceId}
                    service={service}
                    daysToShow={daysToShow}
                    onBlockClick={handleBlockClick}
                    title={`Available Appointments for ${service.name}`}
                />
            )}
            
            {/* Buffer Time Info Alert */}
            <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
                <Typography variant="body2">
                    <strong>Buffer Time Policy:</strong> To ensure providers have sufficient time between appointments,
                    a 15-minute buffer is applied before and after each booking. Available time slots already 
                    account for this buffer time.
                </Typography>
            </Alert>
            
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
                                {service.name} on {selectedSlot && format(selectedSlot.start, 'EEEE, MMMM d')} at {selectedSlot && format(selectedSlot.start, 'h:mm a')}
                            </Typography>
                            {/* Price Information */}
                            {selectedSlot && (
                                <Box sx={{ mt: 2 }}>
                                    {(() => {
                                        const orig = Number(selectedSlot.originalPrice ?? service.price);
                                        const discRaw = selectedSlot.discountedPrice;
                                        const disc = discRaw !== undefined && discRaw !== null ? Number(discRaw) : orig;
                                        const useDiscount = disc < orig;
                                        return (
                                            <Typography variant="h6" color={useDiscount ? 'success.main' : 'text.primary'}>
                                                ${useDiscount ? disc.toFixed(2) : orig.toFixed(2)}
                                                {useDiscount && (
                                                    <Typography component="span" variant="body2" sx={{ ml: 1, textDecoration: 'line-through', color: 'text.secondary' }}>
                                                        ${orig.toFixed(2)}
                                                    </Typography>
                                                )}
                                            </Typography>
                                        );
                                    })()}
                                </Box>
                            )}
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
                                    {selectedSlot && format(selectedSlot.start, 'EEEE, MMMM d')} at {selectedSlot && format(selectedSlot.start, 'h:mm a')}
                                </Typography>
                                <Typography variant="body2">
                                    Provider: {service.provider.business_name}
                                </Typography>
                                
                                {/* Price Information */}
                                {selectedSlot && (
                                    <Box sx={{ mt: 2, mb: 1 }}>
                                        {(() => {
                                            const orig = Number(selectedSlot.originalPrice ?? service.price);
                                            const discRaw = selectedSlot.discountedPrice;
                                            const disc = discRaw !== undefined && discRaw !== null ? Number(discRaw) : orig;
                                            const useDiscount = disc < orig;
                                            return (
                                                <Typography variant="h6" color={useDiscount ? 'success.main' : 'text.primary'}>
                                                    ${useDiscount ? disc.toFixed(2) : orig.toFixed(2)}
                                                    {useDiscount && (
                                                        <Typography component="span" variant="body2" sx={{ ml: 1, textDecoration: 'line-through', color: 'text.secondary' }}>
                                                            ${orig.toFixed(2)}
                                                        </Typography>
                                                    )}
                                                </Typography>
                                            );
                                        })()}
                                    </Box>
                                )}
                                
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: '0.85rem', bgcolor: 'rgba(0, 0, 0, 0.03)', p: 1 }}>
                                    Duration: {service.duration} minutes
                                </Typography>
                                
                                {/* Buffer time information */}
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.75rem', color: 'info.main' }}>
                                    <strong>Note:</strong> A 15-minute buffer time is automatically applied before and after 
                                    each appointment to allow for travel and preparation time.
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
        </>
    );
};

export default ConsumerAppointmentCalendar; 