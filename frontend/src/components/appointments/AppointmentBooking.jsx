import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Box,
    Paper,
    Alert,
    CircularProgress,
    Snackbar
} from '@mui/material';
import { services, appointments as appointmentsApi } from '../../services/api';
import ConsumerAppointmentCalendar from './ConsumerAppointmentCalendar';

const AppointmentBooking = () => {
    const { serviceId } = useParams();
    const navigate = useNavigate();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [forceRefresh, setForceRefresh] = useState(0);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const calendarRef = useRef(null);

    const fetchService = useCallback(async () => {
        if (!serviceId) return;
        try {
            const response = await services.getById(parseInt(serviceId));
            setService(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching service:', err);
            if (err.response && err.response.status === 401) {
                // If unauthorized, redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login', { replace: true });
            } else {
                setError('Failed to load service details');
                setLoading(false);
            }
        }
    }, [serviceId, navigate, setService, setLoading, setError]);

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            // If not logged in, redirect to login page
            navigate('/login', { replace: true });
            return;
        }
        
        fetchService();
    }, [navigate, fetchService]);

    // Force refresh calendars and fetch latest appointments directly
    const forceFetchAppointments = async () => {
        try {
            console.log('Force-fetching all appointments');
            // Make a direct API call to get the latest appointments
            const freshAppointments = await appointmentsApi.getAll();
            console.log('Fresh appointments loaded:', freshAppointments.data.length);
            
            // Refresh the calendar component
            if (calendarRef.current && typeof calendarRef.current.fetchUserAppointments === 'function') {
                console.log('Refreshing calendar from parent');
                await calendarRef.current.fetchUserAppointments();
            }
            
            // Force a re-render with a state update
            setForceRefresh(prev => prev + 1);
            
            return freshAppointments.data;
        } catch (error) {
            console.error('Error force-fetching appointments:', error);
            return [];
        }
    };

    const handleAppointmentBooked = async (appointmentData) => {
        console.log('Appointment booked callback called with data:', appointmentData);
        
        try {
            // Show success message
            setBookingSuccess(true);
            
            // First, force fetch latest appointments to update the UI
            await forceFetchAppointments();
            
            // Increment the force refresh to trigger a full re-render with new key
            setForceRefresh(prev => prev + 1);
            
            // Give UI time to update before navigating
            setTimeout(() => {
                console.log('Navigating to appointments page');
                navigate('/appointments');
            }, 2500);
        } catch (error) {
            console.error('Error handling appointment booking:', error);
            // Still navigate after a delay
            setTimeout(() => {
                navigate('/appointments');
            }, 1500);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!service || !serviceId) {
        return (
            <Alert severity="error">
                Service not found
            </Alert>
        );
    }

    if (error) {
        return (
            <Box sx={{ maxWidth: '800px', mx: 'auto', mt: 3 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: '100%', height: 'calc(100vh - 120px)', mx: 'auto' }}>
            <Paper>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <ConsumerAppointmentCalendar 
                        ref={calendarRef}
                        serviceId={parseInt(serviceId)}
                        daysToShow={5}
                        onAppointmentBooked={handleAppointmentBooked}
                        key={`calendar-${forceRefresh}`}
                    />
                </Box>
            </Paper>
            
            {/* Success message */}
            <Snackbar
                open={bookingSuccess}
                autoHideDuration={2000}
                message="Appointment booked successfully! Redirecting to appointments..."
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            />
        </Box>
    );
};

export default AppointmentBooking; 