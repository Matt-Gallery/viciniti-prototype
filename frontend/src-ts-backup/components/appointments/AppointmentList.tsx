import React, { useState, useEffect } from 'react';
import { 
    Box, 
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
import { Appointment } from '../../types';
import { useNavigate } from 'react-router-dom';

const AppointmentList: React.FC = () => {
    const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [userType, setUserType] = useState<'provider' | 'consumer'>('consumer');
    const navigate = useNavigate();

    useEffect(() => {
        // Determine user type
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                setUserType(userData.user_type);
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }

        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const response = await appointments.getAll();
            console.log('Fetched appointments:', response.data);
            
            // Sort appointments by date (most recent first)
            const sortedAppointments = response.data.sort((a: Appointment, b: Appointment) => {
                return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
            });
            
            setUserAppointments(sortedAppointments);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError('Failed to load your appointments. Please try again later.');
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return format(date, 'EEEE, MMMM d, yyyy');
    };

    const formatTime = (dateString: string) => {
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
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
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
                                    action={
                                        <Chip 
                                            label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)} 
                                            color={getStatusColor(appointment.status) as any}
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
                                                    console.error('Error cancelling appointment:', err);
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
                                                    console.error('Error completing appointment:', err);
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