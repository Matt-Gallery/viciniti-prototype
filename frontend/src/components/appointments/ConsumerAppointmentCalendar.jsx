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
                console.log('Service data loaded');
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
                console.log('User data from localStorage:', userData);
                
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
                    console.log('Parsing from legacy address:', userData.address);
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
                
                console.log('Pre-populating form with data:', initialBookingData);
                setBookingData(initialBookingData);
                
            } catch (e) {
                console.error('Error parsing user data', e);
                setBookingData(initialBookingData);
            }
        } else {
            console.log('No user data found in localStorage');
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
            
            console.log('Creating appointment with slot');
            console.log('Email being submitted:', bookingData.email);
            
            // Add the buffer time to the end time
            const appointmentEndTime = new Date(selectedSlot.end);
            
            // Create appointment request
            const appointmentData = {
                service: parseInt(serviceId), // Make sure it's a number
                start_time: selectedSlot.start.toISOString(),
                end_time: appointmentEndTime.toISOString(),
                status: 'confirmed',
                notes: bookingData.notes || '',
                client_email: bookingData.email, // This must be sent
                client_phone: bookingData.phone || '',
                address_line1: bookingData.address_line1 || '',
                address_line2: bookingData.address_line2 || '',
                city: bookingData.city || '',
                state: bookingData.state || '',
                zip_code: bookingData.zip_code || '',
                country: 'United States'
            };
            
            // Add discount information if available
            if (selectedSlot.discountPercentage > 0) {
                appointmentData.original_price = selectedSlot.originalPrice;
                appointmentData.discount_amount = selectedSlot.originalPrice - selectedSlot.discountedPrice;
                appointmentData.final_price = selectedSlot.discountedPrice;
                appointmentData.discount_percentage = selectedSlot.discountPercentage;
                appointmentData.discount_reason = 'Proximity discount';
            }
            
            console.log('Sending appointment data', JSON.stringify(appointmentData));
            
            // Call API to create appointment
            const response = await appointments.create(appointmentData);
            console.log('Appointment created successfully', response.data);
            
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
            console.error('Error creating appointment');
            
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
                                {selectedSlot && selectedSlot.discountPercentage > 0 ? (
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        gap: 1,
                                        mt: 1,
                                        flexWrap: 'wrap'
                                    }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                                            ${selectedSlot.originalPrice}
                                        </Typography>
                                        <Typography variant="caption" sx={{ 
                                            color: 'success.main',
                                            bgcolor: 'success.light',
                                            px: 0.5,
                                            py: 0.1,
                                            borderRadius: '4px'
                                        }}>
                                            -{selectedSlot.discountPercentage}%
                                        </Typography>
                                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                                            ${selectedSlot.discountedPrice}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mt: 0.5, display: 'block' }}>
                                            Discount applied based on proximity to other appointments
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