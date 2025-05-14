import React, { useState, useEffect } from 'react';
import AppointmentCalendar from '../common/AppointmentCalendar';
import { appointments } from '../../services/api';

const ProviderAvailabilityCalendar = ({ onAvailabilityChange,
    providerId,
    initialTimeBlocks }) => {
    const [appointmentList, setAppointmentList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!providerId) return;

            try {
                const response = await appointments.getByProvider(providerId);
                setAppointmentList(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching appointments:', err);
                setError('Failed to load appointments');
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [providerId]);

    return (
        <AppointmentCalendar
            mode="provider"
            providerId={providerId}
            onAvailabilityChange={onAvailabilityChange}
            timeBlocks={initialTimeBlocks}
            title="Your Availability"
            appointments={appointmentList}
            loading={loading}
            error={error}
        />
    );
};

export default ProviderAvailabilityCalendar; 