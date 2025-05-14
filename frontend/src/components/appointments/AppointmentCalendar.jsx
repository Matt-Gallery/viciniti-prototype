import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { availability, appointments } from '../../services/api';

const locales = {
    'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const AppointmentCalendar = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [providerId, setProviderId] = useState(null);

    useEffect(() => {
        const initializeUserData = async () => {
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userData = JSON.parse(userStr);
                    if (userData.user_type === 'provider' && userData.provider_profile) {
                        setProviderId(userData.provider_profile.id);
                    }
                }
            } catch (err) {
                console.error('Error initializing user data:', err);
                setError('Failed to load user data');
            }
        };

        initializeUserData();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!providerId) return;

            setLoading(true);
            try {
                // Fetch availability
                const availabilityResponse = await availability.getForProvider(providerId);
                const availabilityData = availabilityResponse.data;

                // Fetch appointments
                const appointmentsResponse = await appointments.getByProvider(providerId);
                const appointmentsData = appointmentsResponse.data;

                // Convert availability blocks to events
                const availabilityEvents = Object.entries(availabilityData).flatMap(([day, blocks]) =>
                    blocks.map(block => ({
                        start: new Date(block.start),
                        end: new Date(block.end),
                        title: 'Available',
                        type: 'availability',
                        resource: block
                    }))
                );

                // Convert appointments to events
                const appointmentEvents = appointmentsData.map(appointment => ({
                    start: new Date(appointment.start_time),
                    end: new Date(appointment.end_time),
                    title: `${appointment.service.name} - ${appointment.consumer.username}`,
                    type: 'appointment',
                    status: appointment.status,
                    resource: appointment
                }));

                // Combine and sort all events
                const allEvents = [...availabilityEvents, ...appointmentEvents].sort((a, b) => a.start - b.start);
                setEvents(allEvents);
                setError(null);
            } catch (err) {
                console.error('Error fetching calendar data:', err);
                setError('Failed to load calendar data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [providerId]);

    const eventStyleGetter = (event) => {
        let style = {
            backgroundColor: '#3174ad',
            borderRadius: '5px',
            opacity: 0.8,
            color: 'white',
            border: '0px',
            display: 'block'
        };

        if (event.type === 'availability') {
            style.backgroundColor = '#90EE90'; // Light green for availability
            style.color = 'black';
        } else if (event.type === 'appointment') {
            switch (event.status) {
                case 'pending':
                    style.backgroundColor = '#FFA500'; // Orange for pending
                    break;
                case 'confirmed':
                    style.backgroundColor = '#4CAF50'; // Green for confirmed
                    break;
                case 'cancelled':
                    style.backgroundColor = '#f44336'; // Red for cancelled
                    break;
                case 'completed':
                    style.backgroundColor = '#2196F3'; // Blue for completed
                    break;
                default:
                    style.backgroundColor = '#3174ad';
            }
        }

        return {
            style
        };
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: 'calc(100vh - 200px)', p: 2 }}>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'day']}
                defaultView="week"
                min={new Date(0, 0, 0, 8, 0, 0)} // Start at 8 AM
                max={new Date(0, 0, 0, 20, 0, 0)} // End at 8 PM
            />
        </Box>
    );
};

export default AppointmentCalendar; 