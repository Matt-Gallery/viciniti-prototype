import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    CircularProgress,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
} from '@mui/material';
import { appointments } from '../../services/api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const AppointmentList = () => {
    const [appointmentList, setAppointmentList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userType, setUserType] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    // Status update state
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusInProgress, setStatusInProgress] = useState(false);
    const [updatedStatus, setUpdatedStatus] = useState('');

    const fetchAppointments = useCallback(async () => {
        if (!isInitialized) return;
        
        setLoading(true);
        try {
            const response = await appointments.getAll();
            setAppointmentList(response.data);
        } catch (err) {
            console.error('Error fetching appointments:', err);
        } finally {
            setLoading(false);
        }
    }, [isInitialized]);

    useEffect(() => {
        const initializeUserData = async () => {
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userData = JSON.parse(userStr);
                    setUserType(userData.user_type);
                }
                setIsInitialized(true);
            } catch (err) {
                console.error('Error initializing user data:', err);
                setIsInitialized(true);
            }
        };

        initializeUserData();
    }, []);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const handleStatusUpdate = async (appointmentId, newStatus) => {
        try {
            setStatusInProgress(true);
            setUpdatedStatus(newStatus);
            
            console.log(`Updating appointment ${appointmentId} status to ${newStatus}`);
            
            // Update the status through the API
            await appointments.updateStatus(appointmentId, newStatus);
            
            // Show confirmation dialog
            setStatusDialogOpen(true);
            
            // First refresh the list in the background
            await fetchAppointments();
            
            // Auto-close after 2 seconds and ensure list is refreshed
            setTimeout(async () => {
                setStatusDialogOpen(false);
                setStatusInProgress(false);
                
                // Refresh the list again after modal closes to ensure latest state
                await fetchAppointments();
            }, 2000);
        } catch (err) {
            console.error('Error updating appointment status:', err);
            alert(`Failed to update appointment status: ${err.message || 'Unknown error'}`);
            setStatusInProgress(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'warning';
            case 'confirmed':
                return 'success';
            case 'cancelled':
                return 'error';
            case 'completed':
                return 'info';
            default:
                return 'default';
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
        <Box>
            <Typography variant="h4" gutterBottom>
                {userType === 'provider' ? 'My Appointments' : 'My Bookings'}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {appointmentList.map((appointment) => (
                    <Card key={appointment.id}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        {appointment.service.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {new Date(appointment.start_time).toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Duration: {appointment.service.duration} minutes
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Price: ${appointment.service.price}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={appointment.status}
                                    color={getStatusColor(appointment.status)}
                                    sx={{ ml: 2 }}
                                />
                            </Box>

                            {userType === 'provider' && appointment.status === 'pending' && (
                                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                                    >
                                        Confirm
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                                    >
                                        Cancel
                                    </Button>
                                </Box>
                            )}

                            {userType === 'consumer' && appointment.status === 'pending' && (
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                                    sx={{ mt: 2 }}
                                >
                                    Cancel Booking
                                </Button>
                            )}

                            {userType === 'provider' && appointment.status === 'confirmed' && (
                                new Date(appointment.end_time) <= new Date() && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                                        sx={{ mt: 2 }}
                                    >
                                        Mark as Completed
                                    </Button>
                                )
                            )}
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Status Update Confirmation Dialog */}
            <Dialog
                open={statusDialogOpen}
                onClose={() => !statusInProgress && setStatusDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Appointment Status Updated
                </DialogTitle>
                <DialogContent sx={{ pl: 4, pr: 2 }}>
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                        <CheckCircleIcon color="success" sx={{ fontSize: '3rem', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            {updatedStatus === 'confirmed' 
                                ? "The appointment has been confirmed successfully!" 
                                : updatedStatus === 'cancelled'
                                ? "The appointment has been cancelled successfully!"
                                : updatedStatus === 'completed'
                                ? "The appointment has been marked as completed!"
                                : "The appointment status has been updated successfully!"}
                        </Typography>
                    </Box>
                </DialogContent>
                {/* No buttons in the confirmation dialog as per requirement */}
            </Dialog>
        </Box>
    );
};

export default AppointmentList; 