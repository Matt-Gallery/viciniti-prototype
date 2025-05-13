import React, { useState, useEffect } from 'react';
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
    Button,
    Tabs,
    Tab
     } from '@mui/material';
import { format } from 'date-fns';
import { appointments } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const AppointmentList = () => {
    const [userAppointments, setUserAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userType, setUserType] = useState('consumer');
    const navigate = useNavigate();

    useEffect(() => {
        // Determine user type
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                setUserType(userData.user_type);
            } catch (e) {
                console.error('Error parsing user data');
            }
        }

        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const response = await appointments.getAll();
            console.log('Fetched appointments');
            
            // Get current user from localStorage
            const userStr = localStorage.getItem('user');
            let currentUserId = null;
            if (userStr) {
                try {
                    const userData = JSON.parse(userStr);
                    currentUserId = userData.id;
                } catch (e) {
                    console.error('Error parsing user data');
                }
            }
            
            // Filter appointments based on user type and current user
            let filteredAppointments = response.data;
            if (userType === 'consumer') {
                filteredAppointments = response.data.filter(appointment => 
                    appointment.consumer.id === currentUserId
                );
            } else if (userType === 'provider') {
                filteredAppointments = response.data.filter(appointment => 
                    appointment.service.provider.user.id === currentUserId
                );
            }
            
            // Sort appointments by date (most recent first)
            const sortedAppointments = filteredAppointments.sort((a, b) => {
                return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
            });
            
            setUserAppointments(sortedAppointments);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching appointments');
            setError('Failed to load your appointments. Please try again later.');
            setLoading(false);
        }
    };

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
                                        ? `Customer: ${appointment.consumer.username || appointment.consumer.email || "Anonymous"}`
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
                                            onClick={async () => {
                                                try {
                                                    await appointments.updateStatus(appointment.id, 'cancelled');
                                                    fetchAppointments();
                                                } catch (err) {
                                                    console.error('Error cancelling appointment');
                                                    setError('Failed to cancel appointment. Please try again later.');
                                                }
                                            }}
                                        >
                                            Cancel Appointment
                                        </Button>
                                    )}

                                    {userType === 'provider' && appointment.status === 'confirmed' && (
                                        <Button 
                                            variant="outlined" 
                                            color="primary" 
                                            sx={{ mt: 2, ml: 2 }}
                                            onClick={async () => {
                                                try {
                                                    await appointments.updateStatus(appointment.id, 'completed');
                                                    fetchAppointments();
                                                } catch (err) {
                                                    console.error('Error completing appointment');
                                                    setError('Failed to mark appointment as completed. Please try again later.');
                                                }
                                            }}
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