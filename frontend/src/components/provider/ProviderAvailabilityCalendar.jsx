import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppointmentCalendar from '../common/AppointmentCalendar';
import { appointments, api } from '../../services/api';
import { availability as availabilityApi } from '../../services/api';

const ProviderAvailabilityCalendar = ({ onAvailabilityChange,
    providerId,
    initialTimeBlocks }) => {
    const [appointmentList, setAppointmentList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeBlocks, setTimeBlocks] = useState({});
    const timeBlocksRef = useRef(timeBlocks);
    const firstRenderRef = useRef(true);

    // Initialize timeBlocks once when component mounts or initialTimeBlocks changes
    useEffect(() => {
        if (initialTimeBlocks && Object.keys(initialTimeBlocks).length > 0) {
            console.log("ProviderAvailabilityCalendar: Initializing timeBlocks from props", initialTimeBlocks);
            setTimeBlocks(initialTimeBlocks);
        }
    }, []);  // Empty dependency array means this runs once on mount

    // Update ref when timeBlocks changes
    useEffect(() => {
        timeBlocksRef.current = timeBlocks;
        console.log("ProviderAvailabilityCalendar: timeBlocks state updated:", timeBlocks);
    }, [timeBlocks]);

    // Use a callback for handling availability changes to avoid recreating the function
    const handleAvailabilityChange = useCallback((newAvailability) => {
        console.log("ProviderAvailabilityCalendar: received new availability from calendar:", newAvailability);
        
        // Update local state
        setTimeBlocks(newAvailability);
        
        // Pass changes to parent
        if (onAvailabilityChange) {
            console.log("ProviderAvailabilityCalendar: Calling parent onAvailabilityChange");
            onAvailabilityChange(newAvailability);
        }
        
        // If we have a provider ID, save directly to the API
        if (providerId) {
            saveAvailabilityToApi(providerId, newAvailability);
        }
    }, [onAvailabilityChange, providerId]);
    
    // Function to save availability directly to API
    const saveAvailabilityToApi = async (provId, availabilityData) => {
        try {
            console.log("ProviderAvailabilityCalendar: Saving to API directly", availabilityData);
            
            // Convert Date objects to ISO strings for API
            const apiData = {};
            Object.entries(availabilityData).forEach(([dateStr, blocks]) => {
                if (blocks && blocks.length > 0) {
                    apiData[dateStr] = blocks.map(block => ({
                        id: block.id,
                        start: block.start instanceof Date ? block.start.toISOString() : block.start,
                        end: block.end instanceof Date ? block.end.toISOString() : block.end
                    }));
                } else {
                    apiData[dateStr] = [];
                }
            });
            
            const response = await availabilityApi.save(provId, apiData);
            console.log("ProviderAvailabilityCalendar: API save success", response.data);
            
            // Update state with API response
            const formattedData = {};
            Object.entries(response.data).forEach(([dateStr, blocks]) => {
                if (blocks && blocks.length > 0) {
                    formattedData[dateStr] = blocks.map(block => ({
                        id: block.id,
                        start: new Date(block.start),
                        end: new Date(block.end)
                    }));
                } else {
                    formattedData[dateStr] = [];
                }
            });
            
            // Only update state if there are actual changes
            if (JSON.stringify(Object.keys(formattedData).sort()) !== 
                JSON.stringify(Object.keys(timeBlocks).sort())) {
                console.log("ProviderAvailabilityCalendar: Updating state with API response", formattedData);
                setTimeBlocks(formattedData);
            }
            
        } catch (err) {
            console.error("Error saving availability directly:", err);
            setError("Failed to save availability. Please try again.");
        }
    };

    useEffect(() => {
        // Skip first render to avoid conflicts with initialization
        if (firstRenderRef.current) {
            firstRenderRef.current = false;
            return;
        }
        
        // Handle updates to initialTimeBlocks after first render
        if (initialTimeBlocks && Object.keys(initialTimeBlocks).length > 0) {
            console.log("ProviderAvailabilityCalendar: initialTimeBlocks prop changed", initialTimeBlocks);
            
            // Compare with current state to avoid unnecessary updates
            const currentKeys = Object.keys(timeBlocks);
            const newKeys = Object.keys(initialTimeBlocks);
            
            let needsUpdate = false;
            if (currentKeys.length !== newKeys.length) {
                needsUpdate = true;
            } else {
                // Check if any block counts changed
                for (const date of newKeys) {
                    if (!timeBlocks[date] || 
                        timeBlocks[date].length !== initialTimeBlocks[date].length) {
                        needsUpdate = true;
                        break;
                    }
                }
            }
            
            if (needsUpdate) {
                console.log("ProviderAvailabilityCalendar: Updating timeBlocks from prop change");
                setTimeBlocks(initialTimeBlocks);
            }
        }
    }, [initialTimeBlocks]);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!providerId) {
                console.log('No provider ID provided, skipping appointment fetch');
                setLoading(false);
                return;
            }

            try {
                // Debug token and localStorage
                const token = localStorage.getItem('token');
                const userStr = localStorage.getItem('user');
                console.log('Token for appointment fetch:', token ? `${token.substring(0, 5)}...` : 'No token');
                console.log('User data exists:', !!userStr);
                
                if (userStr) {
                    try {
                        const userData = JSON.parse(userStr);
                        console.log('User type:', userData.user_type);
                        console.log('User ID:', userData.id);
                        console.log('Provider profile exists:', !!userData.provider_profile);
                    } catch (e) {
                        console.error('Error parsing user data:', e);
                    }
                }
                
                // Make a direct API call with the token
                console.log(`Making direct API call to /appointments/provider/${providerId}/`);
                const response = await api.get(`/appointments/provider/${providerId}/`, {
                    headers: {
                        'Authorization': `Token ${token}`
                    }
                });
                
                console.log('Appointments fetched successfully:', response.data.length);
                setAppointmentList(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching appointments:', err);
                let errorMsg = 'Failed to load appointments';
                
                // Add more specific error details if available
                if (err.response) {
                    errorMsg += `: ${err.response.status} - ${JSON.stringify(err.response.data)}`;
                    console.error('Error response:', err.response.data);
                    console.error('Status code:', err.response.status);
                }
                
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [providerId]);

    // Directly log the current state of timeBlocks before rendering
    console.log("ProviderAvailabilityCalendar rendering with timeBlocks:", timeBlocks);
    
    return (
        <AppointmentCalendar
            mode="provider"
            providerId={providerId}
            onAvailabilityChange={handleAvailabilityChange}
            initialTimeBlocks={timeBlocks}
            title="Your Availability"
            appointments={appointmentList}
            loading={loading}
            error={error}
        />
    );
};

export default ProviderAvailabilityCalendar; 