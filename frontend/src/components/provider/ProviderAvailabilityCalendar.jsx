import React from 'react';
import AppointmentCalendar from '../common/AppointmentCalendar';

const ProviderAvailabilityCalendar = ({ onAvailabilityChange,
    providerId,
    initialTimeBlocks }) => { 
    
    console.log('ProviderAvailabilityCalendar got initialTimeBlocks:', initialTimeBlocks);
    
    return (
        <AppointmentCalendar
            mode="provider"
            providerId={providerId}
            onAvailabilityChange={onAvailabilityChange}
            initialTimeBlocks={initialTimeBlocks}
            title="Your Availability"
        />
    );
};

export default ProviderAvailabilityCalendar; 