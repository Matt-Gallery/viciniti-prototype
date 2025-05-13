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
    Button
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { format } from 'date-fns';
import { appointments, services } from '../../services/api';
import { Service, TimeBlock, AppointmentCreateRequest } from '../../types';
import AppointmentCalendar from '../common/AppointmentCalendar';

interface ConsumerAppointmentCalendarProps {
    serviceId: number;
    daysToShow?: number;
    onAppointmentBooked?: () => void;
}

const ConsumerAppointmentCalendar: React.FC<ConsumerAppointmentCalendarProps> = ({ 
    serviceId,
    daysToShow = 5,
    onAppointmentBooked 
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [service, setService] = useState<Service | null>(null);
    const calendarRef = useRef<any>(null);
    
    // State for booking dialog
    const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
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
    
    // Fetch service details
    useEffect(() => {
        const fetchServiceData = async () => {
            try {
                setLoading(true);
                const serviceResponse = await services.getById(serviceId);
                console.log('Service data loaded:', serviceResponse.data);
                setService(serviceResponse.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching service:', error);
                setError('Unable to load service information. Please try again later.');
                setLoading(false);
            }
        };
        
        fetchServiceData();
    }, [serviceId]);
    
    // Handle time slot selection
    const handleBlockClick = (block: TimeBlock) => {
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
        
        try {
            setBookingInProgress(true);
            setBookingError('');
            
            console.log('Creating appointment with slot:', selectedSlot);
            
            // Add the buffer time to the end time
            const appointmentEndTime = new Date(selectedSlot.end);
            
            // Create appointment request
            const appointmentData: AppointmentCreateRequest = {
                service: service.id,
                start_time: selectedSlot.start.toISOString(),
                end_time: appointmentEndTime.toISOString(),
                status: 'confirmed', // Changed from 'pending' to 'confirmed'
                notes: bookingData.notes || '',
                client_email: bookingData.email,
                client_phone: bookingData.phone || '',
                client_address: bookingData.address || ''
            };
            
            console.log('Sending appointment data:', appointmentData);
            
            // Call API to create appointment
            const response = await appointments.create(appointmentData);
            console.log('Appointment created successfully:', response.data);
            
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
            
        } catch (error: any) {
            console.error('Error creating appointment:', error);
            
            // Handle conflict errors (HTTP 409)
            if (error.response && error.response.status === 409) {
                const conflicts = error.response.data.conflict_appointments || [];
                const conflictTimes = conflicts.map((conflict: any) => {
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
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
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
                            
                            <Box sx={{ mb: 3 }}>
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
                                <Typography variant="body2" color="primary">
                                    Price: ${service.price}
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
        </>
    );
};

export default ConsumerAppointmentCalendar; 