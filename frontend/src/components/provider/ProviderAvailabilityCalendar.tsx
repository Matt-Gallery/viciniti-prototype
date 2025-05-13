import React from 'react';
import AppointmentCalendar from '../common/AppointmentCalendar';
import { TimeBlock } from '../../types';

interface ProviderAvailabilityCalendarProps {
    onAvailabilityChange?: (availability: Record<string, TimeBlock[]>) => void;
    providerId?: number;
    initialTimeBlocks?: Record<string, TimeBlock[]>;
}

const ProviderAvailabilityCalendar: React.FC<ProviderAvailabilityCalendarProps> = ({ 
    onAvailabilityChange,
    providerId,
    initialTimeBlocks
}) => {
    return (
        <AppointmentCalendar
            mode="provider"
            providerId={providerId}
            onAvailabilityChange={onAvailabilityChange}
            timeBlocks={initialTimeBlocks}
            title="Your Availability"
        />
    );
};

export default ProviderAvailabilityCalendar; 