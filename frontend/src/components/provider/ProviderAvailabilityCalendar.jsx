import React from 'react';
import AppointmentCalendar from '../common/AppointmentCalendar';
;


const ProviderAvailabilityCalendar = ({ onAvailabilityChange,
    providerId,
    initialTimeBlocks }) => { return (
        <AppointmentCalendar
            mode="provider"
            providerId={providerId }
            onAvailabilityChange={ onAvailabilityChange }
            timeBlocks={ initialTimeBlocks }
            title="Your Availability"
        />
    );
};

export default ProviderAvailabilityCalendar; 