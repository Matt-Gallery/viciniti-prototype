import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, 
    Typography, 
    Paper, 
    Card,
    CardContent,
    CardHeader,
    Divider,
    Chip,
    CircularProgress,
    Alert,
    Button
     } from '@mui/material';
import { format } from 'date-fns';
import { appointments } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const AppointmentList = () => {
    const [userAppointments, setUserAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userType, setUserType] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const dataFetchedRef = useRef(false);
    const navigate = useNavigate();

    // Separate effect for getting user type early in the component lifecycle
    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userData = JSON.parse(userStr);
                if (userData.user_type) {
                    console.log('AppointmentList using user type:', userData.user_type);
                    setUserType(userData.user_type);
                    
                    // Redirect provider to provider dashboard if they navigate directly to appointments
                    if (userData.user_type === 'provider' && window.location.pathname === '/appointments') {
                        console.log('Provider should use the appointments tab in provider dashboard');
                    }
                } else {
                    console.error('User data does not contain user_type');
                    setError('User type not found. Please log in again.');
                }
            } else {
                console.error('No user data found');
                setError('You need to log in to view appointments');
                navigate('/login');
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
            setError('Error loading user data. Please log in again.');
        }
    }, [navigate]);

    const fetchAppointments = useCallback(async () => {
        // Prevent multiple simultaneous fetches
        if (isFetching) {
            console.log('Already fetching appointments, skipping');
            return;
        }

        try {
            setIsFetching(true);
            setLoading(true);
            const response = await appointments.getAll();
            console.log('Fetched appointments');
            
            // Sort appointments by date (most recent first)
            const sortedAppointments = response.data.sort((a, b) => {
                return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
            });
            
            setUserAppointments(sortedAppointments);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError('Failed to load your appointments. Please try again later.');
            setLoading(false);
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        // Skip if we've already fetched the data or if user type is not set yet
        if (dataFetchedRef.current || !userType) return;
        
        console.log("Fetching appointments for user type:", userType);
        dataFetchedRef.current = true;
        fetchAppointments();
    }, [fetchAppointments, userType]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed':
                return 'success';
            case 'pending':
                return 'warning';
            case 'cancelled':
                return 'error';
            case 'completed':
                return 'info';
            default:
                return 'default';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return format(date, 'EEEE, MMMM d, yyyy');
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return format(date, 'h:mm a');
    };

    // Function to handle appointment status changes with optimistic UI updates
    const handleStatusChange = async (appointmentId, status) => {
        try {
            // Update UI immediately for better user experience
            setUserAppointments(prevAppointments => 
                prevAppointments.map(appt => 
                    appt.id === appointmentId ? {...appt, status: status} : appt
                )
            );
            
            // Then make the API call
            console.log(`Updating appointment ${appointmentId} to status ${status}`);
            await appointments.updateStatus(appointmentId, status);
            console.log(`Appointment ${appointmentId} status updated to ${status}`);
            
            // No need for setLoading here as we're using optimistic updates
        } catch (err) {
            console.error('Error updating appointment status:', err);
            
            // If there was an error, revert the optimistic UI update
            setUserAppointments(prevAppointments => 
                prevAppointments.map(appt => {
                    // Only restore the appointment that had the error
                    if (appt.id === appointmentId) {
                        // Try to find the original status, but use a default if not found
                        const originalAppointment = userAppointments.find(original => original.id === appointmentId);
                        return originalAppointment || appt; // Use original or current as fallback
                    }
                    return appt;
                })
            );
            
            setError('Failed to update appointment status. Please try again.');
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

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1">
                    {userType === 'provider' ? 'Customer Appointments' : 'My Appointments'}
                </Typography>
                {userType === 'consumer' && (
                    <Button 
                        variant="contained" 
                        color="primary"
                        onClick={() => navigate('/services')}
                    >
                        Book New Appointment
                    </Button>
                )}
            </Box>
            {userAppointments.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                        {userType === 'provider' 
                            ? "You don't have any customer appointments yet."
                            : "You don't have any appointments yet."
                        }
                    </Typography>
                    {userType === 'consumer' && (
                        <Button 
                            variant="contained" 
                            color="primary" 
                            sx={{ mt: 2 }}
                            onClick={() => navigate('/services')}
                        >
                            Browse Services
                        </Button>
                    )}
                </Paper>
            ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {userAppointments.map((appointment) => (
                        <Box key={appointment.id} sx={{ width: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                            <Card 
                                sx={{ 
                                    height: '100%',
                                    borderLeft: `4px solid ${
                                        appointment.status === 'confirmed' ? '#4caf50' : 
                                        appointment.status === 'pending' ? '#ff9800' : 
                                        appointment.status === 'cancelled' ? '#f44336' : '#2196f3'
                                    }`
                                }}
                            >
                                <CardHeader
                                    title={appointment.service.name}
                                    subheader={userType === 'provider' 
                                        ? `Customer: ${appointment.consumer.username || appointment.consumer.email}`
                                        : `Provider: ${appointment.service.provider.business_name}`
                                    }
                                    action={<Chip 
                                            label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)} 
                                            color={getStatusColor(appointment.status)}
                                            size="small"
                                        />
                                    }
                                />
                                <Divider />
                                <CardContent>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Box>
                                            <Typography variant="subtitle1" gutterBottom>
                                                Date & Time
                                            </Typography>
                                            <Typography variant="body1" color="text.secondary">
                                                {formatDate(appointment.start_time)}
                                            </Typography>
                                            <Typography variant="body1" color="text.secondary">
                                                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                            <Box sx={{ flex: 1, minWidth: '150px' }}>
                                                <Typography variant="subtitle1" gutterBottom>
                                                    Duration
                                                </Typography>
                                                <Typography variant="body1" color="text.secondary">
                                                    {appointment.service.duration} minutes
                                                </Typography>
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: '150px' }}>
                                                <Typography variant="subtitle1" gutterBottom>
                                                    Price
                                                </Typography>
                                                <Typography variant="body1" color="text.secondary">
                                                    ${appointment.service.price}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {userType === 'provider' && (
                                            <Box>
                                                <Typography variant="subtitle1" gutterBottom>
                                                    Customer Contact
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Email: {appointment.consumer.email}
                                                </Typography>
                                                {appointment.consumer.phone_number && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        Phone: {appointment.consumer.phone_number}
                                                    </Typography>
                                                )}
                                                {appointment.consumer.address && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        Address: {appointment.consumer.address}
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}

                                        {appointment.notes && (
                                            <Box>
                                                <Typography variant="subtitle1" gutterBottom>
                                                    Notes
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {appointment.notes}
                                                </Typography>
                                            </Box>
                                        )}
                                        
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                                Booked on: {format(new Date(appointment.created_at), 'MMMM d, yyyy')}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    {appointment.status === 'confirmed' && (
                                        <Button 
                                            variant="outlined" 
                                            color="error" 
                                            sx={{ mt: 2 }}
                                            onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                                        >
                                            Cancel Appointment
                                        </Button>
                                    )}

                                    {userType === 'provider' && appointment.status === 'confirmed' && (
                                        <Button 
                                            variant="outlined" 
                                            color="primary" 
                                            sx={{ mt: 2, ml: 2 }}
                                            onClick={() => handleStatusChange(appointment.id, 'completed')}
                                        >
                                            Mark as Completed
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default AppointmentList; 