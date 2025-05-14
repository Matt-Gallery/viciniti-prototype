import React, {useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef} from 'react';
import { Box, 
    Typography, 
    Button, 
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    TextField,
    CircularProgress,
    Alert,
    IconButton,
    Chip,
    Tooltip,
     } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, areIntervalsOverlapping } from 'date-fns';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { availability as availabilityApi, appointments as appointmentsApi } from '../../services/api';
import { availability as availabilityApi, appointments as appointmentsApi } from '../../services/api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const AppointmentCalendar = forwardRef(({ mode,
    onBlockClick,
    onAvailabilityChange,
    providerId,
    serviceId,
    service,
    timeBlocks: initialTimeBlocks,
    daysToShow = 5,
    title,
    serviceAvailabilityUrl  // New prop for custom URL with location parameters
 }, ref) => { const [selectedDay, setSelectedDay] = useState(new Date());
    const [days, setDays] = useState([]);
    const [timeBlocks, setTimeBlocks] = useState({});
    const [userAppointments, setUserAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    // State for manage appointment modal
    const [appointmentDetailsOpen, setAppointmentDetailsOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [cancelInProgress, setCancelInProgress] = useState(false);
    const [cancelError, setCancelError] = useState('');
    const [cancelSuccess, setCancelSuccess] = useState(false);
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [timeError, setTimeError] = useState('');
    
    const WORKING_HOURS_START = 8; // 8 AM
    const WORKING_HOURS_END = 20;  // 8 PM
    const HOUR_HEIGHT = 70;        // Increased from 50 to 70 pixels per hour
    
    const [providerAppointments, setProviderAppointments] = useState([]);
    
    // Add flags to track if data has been fetched to avoid multiple fetches
    const [availabilityFetched, setAvailabilityFetched] = useState(false);
    const [appointmentsFetched, setAppointmentsFetched] = useState(false);
    const dataFetchedRef = useRef(false);
    
    // Define all functions before they are used in useEffect with useCallback
    const fetchProviderAvailability = useCallback(async (provId, forceRefresh = false) => { 
        if (!provId || (availabilityFetched && !forceRefresh) || (loading && !forceRefresh)) {
            console.log('Skipping availability fetch - already fetched, loading, or no provider ID');
            return;
        }
        
        try {
            setLoading(true);
            console.log('Fetching availability for provider ID:', provId);
            const response = await availabilityApi.getForProvider(provId);
            console.log('Provider availability response:', response.data);
            
            // Convert ISO strings to Date objects
            const formattedAvailability = {};
            
            // Check if response data exists and is not empty
            if (response.data && Object.keys(response.data).length > 0) {
                Object.entries(response.data).forEach(([dateStr, blocks]) => {
                    if (Array.isArray(blocks)) {
                        formattedAvailability[dateStr] = blocks.map((block) => {
                            console.log('Processing block:', block);
                            // Ensure start and end are converted to Date objects
                            return {
                                id: block.id || `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        start: new Date(block.start),
                        end: new Date(block.end)
                            };
                        });
                    } else {
                        formattedAvailability[dateStr] = [];
                    }
                });
            } else {
                console.warn('No availability data returned from API');
            }
            
            console.log('Formatted availability:', formattedAvailability);
            
            // Merge with initial availability to ensure all days have entries
            const mergedAvailability = {...timeBlocks};
            
            // Add all the loaded availability to the merged object
            Object.entries(formattedAvailability).forEach(([dateStr, blocks]) => {
                mergedAvailability[dateStr] = blocks;
             });
            
            // Ensure all days in our view have entries (even if empty)
            days.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
            days.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                if (!mergedAvailability[dateStr]) {
                    mergedAvailability[dateStr] = [];
                }
            });
            
            console.log('Setting time blocks with:', mergedAvailability);
            setTimeBlocks(mergedAvailability);
            setAvailabilityFetched(true);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching availability:', err);
            setError('Failed to load availability data');
            setLoading(false);
         }
    }, [days, loading, timeBlocks, availabilityFetched]);
    
    const fetchServiceAvailability = useCallback(async (forceRefresh = false) => {
        if (!serviceId || (loading && !forceRefresh) || (availabilityFetched && !forceRefresh)) {
            console.log('Skipping service availability fetch - loading, already fetched, or no service ID');
            return;
        }
        
        try {
            setLoading(true);
            
            // Use custom URL if provided (for location-based pricing), otherwise use default URL
            let url = serviceAvailabilityUrl;
            if (!url) {
                url = `/services/${serviceId}/availability/`;
            }
            console.log(`Fetching availability from: ${url}`);
            
            // Use a direct API call with fresh headers for authentication
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
            };
            
            if (token) {
                headers['Authorization'] = `Token ${token}`;
            }
            
            // Make a fresh request to ensure we're not hitting a cached response
            const fullUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}${url}`;
            console.log(`Making direct API request to: ${fullUrl}`);
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: headers,
                cache: 'no-store' // Ensure we don't use cached data
            });
            
            if (!response.ok) {
                throw new Error(`Error fetching availability: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Availability data from service endpoint:', data);
            
            // Process the data to ensure dates are properly formatted
            const formattedBlocks = {};
            if (data && Object.keys(data).length > 0) {
                Object.entries(data).forEach(([dateStr, blocks]) => {
                if (Array.isArray(blocks)) {
                        formattedBlocks[dateStr] = blocks.map(block => ({
                            ...block,
                        start: new Date(block.start),
                        end: new Date(block.end)
                    }));
                } else {
                        formattedBlocks[dateStr] = [];
                }
            });
            }
            
            console.log('Formatted service availability blocks:', formattedBlocks);
            setTimeBlocks(formattedBlocks);
            setAvailabilityFetched(true);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching service availability:', error);
            setError('Failed to load availability. Please try again.');
            setLoading(false);
        }
    }, [serviceId, serviceAvailabilityUrl, loading, availabilityFetched]);

    // Fetch user's existing appointments
    const fetchUserAppointments = useCallback(async (forceRefresh = false) => {
        if (appointmentsFetched && !forceRefresh) {
            console.log('Skipping appointment fetch - already fetched');
            return [];
        }
        
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                console.log('No user logged in, skipping appointment fetch');
                return [];
            }

            console.log('Fetching user appointments');
            
            // Make a direct API call with fresh headers to avoid caching issues
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
            };
            
            if (token) {
                headers['Authorization'] = `Token ${token}`;
            }
            
            // Use fetch directly to bypass any caching
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
            const response = await fetch(`${apiUrl}/appointments/`, {
                method: 'GET',
                headers: headers,
                cache: 'no-store' // Ensure we don't use cached data
            });
            
            if (!response.ok) {
                throw new Error(`Error fetching appointments: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('User appointments loaded (direct fetch):', data.length);
            
            // Update state immediately
            setUserAppointments(data);
            setAppointmentsFetched(true);
            
            // Force a re-render
            setTimeout(() => {
                // Force update of timeBlocks to trigger re-render
                setTimeBlocks(prev => ({...prev}));
            }, 50);
            
            return data;
        } catch (err) {
            console.error('Error fetching user appointments:', err);
            
            // Fallback to using the API service if direct fetch failed
            try {
                console.log('Attempting fallback appointments fetch via API service');
                const result = await appointmentsApi.getAll();
                console.log('Fallback user appointments loaded:', result.data.length);
                setUserAppointments(result.data);
                setAppointmentsFetched(true);
                return result.data;
            } catch (fallbackErr) {
                console.error('Fallback appointments fetch also failed:', fallbackErr);
                return [];
            }
        }
    }, [appointmentsFetched]);
    
    // Fetch provider's appointments
    const fetchProviderAppointments = useCallback(async (forceRefresh = false) => { 
        if (mode !== 'provider' || !providerId || (appointmentsFetched && !forceRefresh)) return;
        
        try {
            console.log('Fetching provider appointments');
            const response = await appointmentsApi.getAllForProvider();
            
            console.log('Provider appointments loaded');
            setProviderAppointments(response.data);
            setAppointmentsFetched(true);
         } catch (err) { 
            console.error('Error fetching provider appointments');
            // Don't set error - this is supplementary data
         }
    }, [mode, providerId, appointmentsFetched]);
    
    // Expose methods to parent component via ref with better refresh handling
    useImperativeHandle(ref, () => ({
        fetchUserAppointments: async () => {
            console.log('Calendar refresh requested via ref');
            
            try {
                // Reset flags to force a complete refresh
                dataFetchedRef.current = false;
                setAvailabilityFetched(false);
                setAppointmentsFetched(false);
                
                // Refresh user appointments first for immediate UI update
                console.log('Refreshing appointments data');
                const newAppointments = await fetchUserAppointments(true); // Force refresh
                console.log('Appointments refreshed successfully', newAppointments ? newAppointments.length : 0);
                
                // Then refresh availability data based on mode
                if (mode === 'consumer' && serviceId) {
                    console.log('Refreshing service availability for service:', serviceId);
                    await fetchServiceAvailability(true); // Force refresh
                } else if (mode === 'provider' && providerId) {
                    console.log('Refreshing provider availability for provider:', providerId);
                    await fetchProviderAvailability(providerId, true); // Force refresh
                    await fetchProviderAppointments(true); // Force refresh
                }
                
                // Force a state update to trigger a re-render
                setTimeBlocks(prev => ({...prev}));
                
                return newAppointments;
            } catch (error) {
                console.error('Error refreshing calendar data:', error);
                // Still update the state to trigger a re-render even if there was an error
                setTimeBlocks(prev => ({...prev}));
                // Return an empty array rather than throwing, to handle errors gracefully
                return [];
            }
        }
    }));
    
    // Generate days array (today + next N days)
    useEffect(() => { 
        if (dataFetchedRef.current) return;
        
        const newDays = [];
        for (let i = 0; i < daysToShow; i++) {
            newDays.push(addDays(new Date(), i));
         }
        setDays(newDays);
        
        // Initialize empty availability for each day
        const initialAvailability = {};
        newDays.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            initialAvailability[dateStr] = [];
         });
        
        // Only overwrite timeBlocks with initialTimeBlocks if it exists
        if (initialTimeBlocks && Object.keys(initialTimeBlocks).length > 0) {
            console.log('Initializing with provided time blocks:', initialTimeBlocks);
            setTimeBlocks(initialTimeBlocks);
        } else {
            setTimeBlocks(initialAvailability);
        }
        
        dataFetchedRef.current = true;
    }, [daysToShow, initialTimeBlocks]);
    
    // Initialize data loading once after component mounts
    useEffect(() => {
        // Short-circuit if nothing to load
        if (!mode || (mode === 'provider' && !providerId) || (mode === 'consumer' && !serviceId)) {
            return;
        }
        
        // Prevent multiple renders from causing multiple data loads
        if (availabilityFetched && appointmentsFetched) {
            console.log('[Calendar] Data already fetched, skipping data load');
            return;
        }
        
        // Use a flag to prevent multiple concurrent fetches
        let isMounted = true;
        
        const loadData = async () => {
            if (!isMounted) return;
            
            console.log(`[Calendar] Loading data for mode=${mode}, providerId=${providerId}, serviceId=${serviceId}`);
            
            try {
                // Force loading state
                setLoading(true);
                
                // Load data based on mode
                if (mode === 'provider' && providerId) { 
                    console.log('[Calendar] Provider mode - fetching availability and appointments');
                    if (!availabilityFetched) await fetchProviderAvailability(providerId);
                    if (!appointmentsFetched) await fetchProviderAppointments();
                } else if (mode === 'consumer' && serviceId) { 
                    console.log('[Calendar] Consumer mode - fetching service availability and user appointments');
                    if (!availabilityFetched) await fetchServiceAvailability();
                    if (!appointmentsFetched) await fetchUserAppointments();
                }
                
                setLoading(false);
                console.log('[Calendar] Data loading complete');
            } catch (error) {
                console.error('[Calendar] Error loading data:', error);
                setError('Failed to load calendar data. Please try again.');
                setLoading(false);
            }
        };
        
        loadData();
        
        return () => {
            isMounted = false;
        };
    // Use a more specific set of dependencies to prevent unnecessary reloads
    }, [
        mode, providerId, serviceId, 
        fetchProviderAvailability, fetchProviderAppointments, 
        fetchServiceAvailability, fetchUserAppointments,
        availabilityFetched, appointmentsFetched
    ]);
    
    const saveAvailability = async () => { 
        if (mode !== 'provider' || !providerId) {
            console.error('Cannot save availability in provider mode or providerId is missing');
            return;
        }
        
        try { 
            setLoading(true);
            console.log('Saving availability for provider ID');
            
            // Convert Date objects to ISO strings for API
            const apiAvailability = {};
            Object.entries(timeBlocks).forEach(([dateStr, blocks]) => { 
                if (blocks.length > 0) {
                    console.log(`Processing blocks for ${dateStr}:`, blocks);
                    
                    apiAvailability[dateStr] = blocks.map((block) => {
                        // Ensure both start and end are properly formatted as ISO strings
                        const startDate = block.start instanceof Date ? block.start : new Date(block.start);
                        const endDate = block.end instanceof Date ? block.end : new Date(block.end);
                        
                        return {
                        id: block.id,
                            start: startDate.toISOString(),
                            end: endDate.toISOString()
                        };
                    });
                }
            });
            
            console.log('Sending API availability data:', apiAvailability);
            const response = await availabilityApi.save(providerId, apiAvailability);
            console.log('API response from saving availability:', response.data);
            
            // Process response data to ensure dates are properly converted
            const updatedBlocks = {};
            if (response.data && Object.keys(response.data).length > 0) {
                Object.entries(response.data).forEach(([dateStr, blocks]) => {
                    if (Array.isArray(blocks)) {
                        updatedBlocks[dateStr] = blocks.map(block => ({
                            id: block.id,
                            start: new Date(block.start),
                            end: new Date(block.end)
                        }));
                    } else {
                        updatedBlocks[dateStr] = [];
                    }
                });
                
                // Update our time blocks with the processed data from the server
                setTimeBlocks(updatedBlocks);
            }
            
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            setLoading(false);
        } catch (err) { 
            console.error('Error saving availability:', err);
            setError('Failed to save availability data');
            setLoading(false);
        }
    };
    
    
    const handleAddBlock = (day) => { if (mode !== 'provider') return;
        
        setSelectedDay(day);
        setStartTime(null);
        setEndTime(null);
        setTimeError('');
        setDialogOpen(true);
    };
    
    const handleCloseDialog = () => {
        setDialogOpen(false);
    };
    
    const handleSaveTimeBlock = () => {
        if (mode !== 'provider') {
            console.error('Cannot save time block in provider mode');
            return;
        }
        
        if (!startTime || !endTime) {
            setTimeError('Both start and end times are required');
            return;
        }
        
        if (startTime > endTime) {
            setTimeError('End time must be after start time');
            return;
        }
        
        console.log('Creating new time block for day');
        
        const dateStr = format(selectedDay, 'yyyy-MM-dd');
        console.log('Date string for block');
        
        const newBlock = { id: `block-${Date.now()}`,
            start: new Date(
                selectedDay.getFullYear(),
                selectedDay.getMonth(),
                selectedDay.getDate(),
                startTime.getHours(),
                startTime.getMinutes()
            ),
            end: new Date(
                selectedDay.getFullYear(),
                selectedDay.getMonth(),
                selectedDay.getDate(),
                endTime.getHours(),
                endTime.getMinutes()
            )
        };
        
        console.log('New time block created');
        
        // Check for overlapping blocks
        const existingBlocks = timeBlocks[dateStr] || [];
        const hasOverlap = existingBlocks.some(block => 
            areIntervalsOverlapping(
                { start: block.start, end: block.end },
                { start: newBlock.start, end: newBlock.end }
            )
        );
        
        if (hasOverlap) { 
            setTimeError('Time block overlaps with existing availability');
            return;
        }
        
        const updatedBlocks = [...existingBlocks, newBlock].sort((a, b) => 
            a.start.getTime() - b.start.getTime()
        );
        
        const newAvailability = { ...timeBlocks,
            [dateStr]: updatedBlocks
        };
        
        console.log('Updated availability with new block');
        setTimeBlocks(newAvailability);
        setDialogOpen(false);
        
        // Notify parent component if callback provided
        if (onAvailabilityChange) { 
            console.log('Notifying parent of availability change');
            onAvailabilityChange(newAvailability);
        } else { 
            console.warn('No onAvailabilityChange callback provided');
         }
    };
    
    const handleDeleteBlock = (day, blockId) => { 
        if (mode !== 'provider') return;
        
        console.log(`Deleting block ${blockId} for day:`, day);
        
        const dateStr = format(day, 'yyyy-MM-dd');
        const existingBlocks = timeBlocks[dateStr] || [];
        console.log('Existing blocks:', existingBlocks);
        
        const updatedBlocks = existingBlocks.filter(block => {
            // Handle both string and object IDs for compatibility
            const blockIdString = typeof block.id === 'object' ? block.id.toString() : block.id;
            const targetIdString = typeof blockId === 'object' ? blockId.toString() : blockId;
            return blockIdString !== targetIdString;
        });
        
        console.log('Updated blocks after deletion:', updatedBlocks);
        
        const newAvailability = {
            ...timeBlocks,
            [dateStr]: updatedBlocks
        };
        
        console.log('Setting new availability after deletion:', newAvailability);
        setTimeBlocks(newAvailability);
        
        // Notify parent component if callback provided
        if (onAvailabilityChange) { 
            console.log('Notifying parent of availability change after deletion');
            onAvailabilityChange(newAvailability);
        }
    };
    
    const handleBlockClick = (block, event) => { 
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        
        if (mode === 'consumer' && onBlockClick) {
            console.log('Time block clicked for booking:', block);
            onBlockClick(block);
        }
    };
    
    // Generate time slots for display
    const generateTimeSlots = () => {
        const slots = [];
        for (let hour = WORKING_HOURS_START; hour < WORKING_HOURS_END; hour++) {
            slots.push(hour);
        }
        return slots;
    };
    
    const timeSlots = generateTimeSlots();
    
    // Get blocks for a specific day
    const getBlocksForDay = (day) => { 
        const dateStr = format(day, 'yyyy-MM-dd');
        const blocks = timeBlocks[dateStr] || [];
        
        // Ensure all blocks have proper Date objects
        const processedBlocks = blocks.map(block => {
            // Convert string dates to Date objects if needed
            const start = block.start instanceof Date ? block.start : new Date(block.start);
            const end = block.end instanceof Date ? block.end : new Date(block.end);
            
            return {
                ...block,
                start,
                end
            };
        });
        
        console.log(`Getting blocks for day ${dateStr}:`, processedBlocks);
        return processedBlocks;
     };

    // Get existing user appointments for a specific day
    const getAppointmentsForDay = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return userAppointments.filter(appointment => {
            const appointmentDate = format(new Date(appointment.start_time), 'yyyy-MM-dd');
            return appointmentDate === dateStr;
        });
    };
    
    // Get provider appointments for a specific day
    const getProviderAppointmentsForDay = (day) => {
        if (mode !== 'provider') return [];
        
        const dateStr = format(day, 'yyyy-MM-dd');
        return providerAppointments.filter(appointment => {
            const appointmentDate = format(new Date(appointment.start_time), 'yyyy-MM-dd');
            return appointmentDate === dateStr;
        });
    };
    
    // Calculate position and height for a time block
    const getBlockStyle = (block, isUserAppointment = false, appointment) => {
        // Calculate position and dimensions based on the time
        const startTime = new Date(block.start);
        const endTime = new Date(block.end);
        
        const startHour = startTime.getHours() + startTime.getMinutes() / 60;
        const endHour = endTime.getHours() + endTime.getMinutes() / 60;
        
        const top = ((startHour - WORKING_HOURS_START) * HOUR_HEIGHT);
        const height = (endHour - startHour) * HOUR_HEIGHT;
        
        // Define base style
        const baseStyle = {
            position: 'absolute',
            top: `${top}px`,
            left: 0,
            right: 0,
            height: `${height}px`,
            borderRadius: '4px',
            padding: '4px 8px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            zIndex: 10,
            cursor: isUserAppointment ? 'pointer' : (mode === 'consumer' ? 'pointer' : 'default'),
        };
        
        // Style for user appointments based on status
        if (isUserAppointment || appointment) {
            const status = appointment ? appointment.status : block.status;
            
            switch(status) {
                case 'pending':
                    return {
                        ...baseStyle,
                        backgroundColor: '#fff3cd', // Light orange
                        border: '1px solid #ffc107',
                        color: '#856404',
                    };
                case 'confirmed':
                    return {
                        ...baseStyle,
                        backgroundColor: '#d4edda', // Light green
                        border: '1px solid #28a745',
                color: '#155724',
                    };
                case 'cancelled':
                    return {
                        ...baseStyle,
                        backgroundColor: '#f8d7da', // Light red
                        border: '1px solid #dc3545',
                        color: '#721c24',
                    };
                case 'completed':
                    return {
                        ...baseStyle,
                        backgroundColor: '#d1ecf1', // Light blue-green
                        border: '1px solid #17a2b8',
                        color: '#0c5460',
                    };
                default:
                    return {
                        ...baseStyle,
                        backgroundColor: '#e3f2fd', // Light blue
                        border: '1px solid #2196f3',
                        color: '#0d47a1',
                    };
            }
        }
        
        // Style for provider time blocks (when creating availability)
        if (mode === 'provider') {
            return {
                ...baseStyle,
                backgroundColor: '#e8f5e9', // Light green for provider availability blocks
                border: '1px solid #4caf50',
                color: '#1b5e20',
                cursor: 'pointer', // Make it clear these are interactable
            };
        }
        
        // Check if the block has discount information
        const hasDiscount = block.discount_percentage > 0;
        
        // Style for consumer available time slots
        return {
            ...baseStyle,
            backgroundColor: hasDiscount ? '#fff8e1' : '#e3f2fd',  // Yellow for discounted, blue for regular
            border: hasDiscount ? '1px solid #ffc107' : '1px solid #2196f3',
            color: hasDiscount ? '#ff6f00' : '#0d47a1',
            boxShadow: hasDiscount ? '0 0 4px rgba(255, 193, 7, 0.5)' : 'none',
        };
    };
    
    // Handle provider appointment click
    const handleProviderAppointmentClick = (appointment) => {
        if (mode === 'provider') {
            setSelectedAppointment(appointment);
            setCancelError('');
            setCancelSuccess(false);
            setAppointmentDetailsOpen(true);
        }
    };
    
    // Handle appointment click to show details
    const handleAppointmentClick = (appointment) => {
        if (mode === 'consumer') {
            setSelectedAppointment(appointment);
            setCancelError('');
            setCancelSuccess(false);
            setAppointmentDetailsOpen(true);
        }
    };
    
    // Function to update appointment status in local state to immediately reflect changes
    const updateAppointmentStatus = useCallback((appointmentId, newStatus) => {
        console.log(`Updating local appointment status: ${appointmentId} to ${newStatus}`);
        
        // Update in user appointments without affecting other appointments
        setUserAppointments(prevAppointments => 
            prevAppointments.map(appointment => 
                appointment.id === appointmentId 
                    ? { ...appointment, status: newStatus } 
                    : appointment
            )
        );
        
        // Also update in provider appointments if relevant
        if (mode === 'provider') {
            setProviderAppointments(prevAppointments => 
                prevAppointments.map(appointment => 
                    appointment.id === appointmentId 
                        ? { ...appointment, status: newStatus } 
                        : appointment
                )
            );
        }
        
        // Update the selectedAppointment state if it's the one being modified
        if (selectedAppointment && selectedAppointment.id === appointmentId) {
            setSelectedAppointment(prev => ({
                ...prev,
                status: newStatus
            }));
        }
    }, [mode, selectedAppointment]);
    
    // Handle cancellation of appointment with better error handling and UI updates
    const handleCancelAppointment = async () => { 
        if (!selectedAppointment) {
            console.error('No appointment selected for cancellation');
            return;
        }
        
        try {
            setCancelInProgress(true);
            setCancelError('');
            
            // Log the appointment ID and full appointment object to help debug
            console.log('Cancelling appointment with ID:', selectedAppointment.id);
            
            // Immediately update local UI state to show cancelled status
            // This creates a better user experience by showing immediate feedback
            updateAppointmentStatus(selectedAppointment.id, 'cancelled');
            
            // Use the appointmentsApi service directly
            console.log('Calling updateStatus API with status "cancelled"');
            
            // UUID is already a string, no need to parse it
            const appointmentId = selectedAppointment.id;
            
            // Make the API call in the background
            const response = await appointmentsApi.updateStatus(appointmentId, 'cancelled');
            console.log('Appointment cancelled successfully, response:', response.data);
            
            setCancelSuccess(true);
            setCancelInProgress(false);
            
            // No need to immediately force refresh - the UI is already updated
            // We'll do a background refresh to ensure data consistency
            setTimeout(() => {
                // Refresh data in the background without blocking UI
                fetchUserAppointments(true).catch(err => 
                    console.error('Background refresh of appointments failed:', err)
                );
                
                // If in consumer mode, also refresh service availability
                if (mode === 'consumer' && serviceId) {
                    fetchServiceAvailability(true).catch(err => 
                        console.error('Background refresh of availability failed:', err)
                    );
                }
            }, 500);
            
            // Close modal after short delay
            setTimeout(() => {
                setAppointmentDetailsOpen(false);
            setTimeout(() => {
                setAppointmentDetailsOpen(false);
                setSelectedAppointment(null);
            }, 1500);
            
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            
            // If there was an error, revert the optimistic UI update
            if (selectedAppointment) {
                updateAppointmentStatus(selectedAppointment.id, selectedAppointment.status);
            }
            
            let errorMessage = 'Failed to cancel appointment. Please try again.';
            
            // Add more detailed error message if available
            if (error.response) {
                console.error('Error response data:', error.response.data);
                console.error('Status code:', error.response.status);
                
                if (error.response.status === 404) {
                    // For 404 errors, provide a more helpful message
                    errorMessage = `Appointment not found. It may have been already cancelled or deleted.`;
                } else {
                    errorMessage += ` (Status: ${error.response.status})`;
                }
                
                // Try to extract a meaningful error message if available
                if (error.response.data && typeof error.response.data === 'object') {
                    const errorValues = Object.values(error.response.data).flat().join(', ');
                    if (errorValues) {
                        errorMessage += ` - ${errorValues}`;
                    }
                } else if (typeof error.response.data === 'string') {
                    errorMessage += ` - ${error.response.data}`;
                }
            }
            
            setCancelError(errorMessage);
            setCancelInProgress(false);
            
            // Still attempt to refresh the data
            try {
                await fetchUserAppointments(true);
            } catch (refreshError) {
                console.error('Error refreshing appointments after cancel error:', refreshError);
            }
        }
    };
    
    // Handle status change for provider appointments
    const handleStatusChange = async (newStatus) => { 
        if (!selectedAppointment) {
            console.error('No appointment selected for status change');
            return;
        }
        
        try {
            setCancelInProgress(true);
            setCancelError('');
            
            console.log(`Updating appointment ${selectedAppointment.id} status to ${newStatus}`);
            console.log(`Updating appointment ${selectedAppointment.id} status to ${newStatus}`);
            
            // Update UI immediately for better user experience
            updateAppointmentStatus(selectedAppointment.id, newStatus);
            
            // Use the appointmentsApi service directly - it's already configured correctly
            console.log(`Calling updateStatus API with status "${newStatus}"`);
            // Use ID as is - it's a UUID string, no need for conversion
            const response = await appointmentsApi.updateStatus(selectedAppointment.id, newStatus);
            console.log('Appointment status updated successfully, response:', response.data);
            
            setCancelSuccess(true);
            setCancelInProgress(false);
            
            // Refresh data in background after a delay
            setTimeout(() => {
                // Refresh in the background
                if (mode === 'provider') {
                    fetchProviderAppointments(true).catch(err => 
                        console.error('Background refresh of provider appointments failed:', err)
                    );
                } else {
                    fetchUserAppointments(true).catch(err => 
                        console.error('Background refresh of user appointments failed:', err)
                    );
                }
            }, 500);
            
            // Close modal after short delay
            setTimeout(() => {
                setAppointmentDetailsOpen(false);
            setTimeout(() => {
                setAppointmentDetailsOpen(false);
                setSelectedAppointment(null);
            }, 1500);
            
        } catch (error) {
            console.error('Error updating appointment status:', error);
            
            // If there was an error, revert the optimistic UI update
            if (selectedAppointment) {
                updateAppointmentStatus(selectedAppointment.id, selectedAppointment.status);
            }
            
            let errorMessage = `Failed to update appointment status to ${newStatus}. Please try again.`;
            
            // Add more detailed error message if available
            if (error.response) {
                console.error('Error response data:', error.response.data);
                console.error('Status code:', error.response.status);
                errorMessage += ` (Status: ${error.response.status})`;
                
                // Try to extract a meaningful error message if available
                if (error.response.data && typeof error.response.data === 'object') {
                    const errorValues = Object.values(error.response.data).flat().join(', ');
                    if (errorValues) {
                        errorMessage += ` - ${errorValues}`;
                    }
                }
            }
            
            setCancelError(errorMessage);
            setCancelInProgress(false);
            
            // Still attempt to refresh the data
            try {
                if (mode === 'provider') {
                    await fetchProviderAppointments(true);
                } else {
                    await fetchUserAppointments(true);
                }
            } catch (refreshError) {
                console.error('Error refreshing appointments after status update error:', refreshError);
            }
        }
    };
    
    // Render a time block with price information
    const renderTimeBlock = (block, day) => {
        const startHour = format(new Date(block.start), 'h:mm a');
        
        // Check if block has discount
        const hasDiscount = block.discount_percentage > 0;
        
        return (
            <Box 
                key={block.id} 
                sx={getBlockStyle(block)}
                onClick={(event) => handleBlockClick(block, event)}
            >
                <Box>
                    <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                        {startHour}
                    </Typography>
                </Box>
                {hasDiscount ? (
                    <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', textDecoration: 'line-through', color: 'text.secondary' }}>
                            ${block.original_price}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'warning.dark' }}>
                            ${block.final_price} ({block.discount_percentage}% off)
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="caption" sx={{ mt: 'auto', fontSize: '0.7rem', fontWeight: 'bold', color: 'primary.main' }}>
                        ${block.original_price}
                    </Typography>
                )}
            </Box>
        );
    };
    
    if (loading && Object.keys(timeBlocks).length === 0) { return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <CircularProgress />
            </Box>
        );
    }
    
    return (
        <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            bgcolor: '#f5f5f5', 
            p: 2, 
            borderRadius: 1, 
            width: '100%', 
            maxWidth: '100%',
            overflowX: 'hidden',
            mr: 0,
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                // Only show title if we're in provider mode or no service is provided
                {(mode === 'provider' || !service) && (
                    <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                        {title || (mode === 'provider' ? 'Your Availability' : '')}
                    </Typography>
                )}
                // Empty space div to maintain layout when title is hidden
                {mode === 'consumer' && service && (
                    <div></div>
                )}
                {mode === 'provider' && providerId && (
                    <Button 
                        variant="contained"
                        color="primary"
                        onClick={saveAvailability}
                        disabled={loading}
                        size="small"
                    >
                        {loading ? <CircularProgress size={20} /> : 'Save Availability'}
                    </Button>
                )}
            </Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2, py: 1, fontSize: '0.75rem' }}>
                    {error}
                </Alert>
            )}
            
            {saveSuccess && (
                <Alert severity="success" sx={{ mb: 2, py: 1, fontSize: '0.75rem' }}>
                    Availability saved successfully
                </Alert>
            )}
            
            <Box sx={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', width: '100%' }}>
                { /* Main scrollable container with time labels and day columns */ }
                <Box sx={{ display: 'flex', 
                    flexDirection: 'row',
                    flex: 1, 
                    overflow: 'hidden',
                    width: '100%',
                    position: 'relative'
                }}>
                    { /* Scrollable area containing time labels and day columns */ }
                    <Box sx={{ display: 'flex', 
                        flexDirection: 'row',
                        width: '100%',
                        height: '400px',
                        overflow: 'auto',
                        position: 'relative'
                    }}>
                        { /* Time labels column - inside the scrollable area */ }
                        <Box sx={{ width: '30px', flexShrink: 0, position: 'sticky', left: 0, zIndex: 5, bgcolor: '#f5f5f5'   }}>
                            { /* Day header placeholder to align with day columns */ }
                            <Box sx={{ 
                                height: '39px', 
                                borderBottom: '2px solid rgba(0, 0, 0, 0.1)', 
                                position: 'sticky',
                                top: 0,
                                zIndex: 100,
                                bgcolor: '#f5f5f5',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}></Box> { /* Match day header height */ }
                            
                            { /* Time slots */ }
                            <Box sx={{ 
                                height: (WORKING_HOURS_END - WORKING_HOURS_START) * HOUR_HEIGHT,
                                position: 'relative',
                                zIndex: 10 /* Lower z-index so it scrolls behind the header */
                            }}>
                                {timeSlots.map((hour) => (
                                    <Box 
                                        key={hour } 
                                        sx={{ 
                                            height: HOUR_HEIGHT, 
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-end',
                                            pr: 1,
                                            borderTop: '1px solid #ddd',
                                            bgcolor: '#f5f5f5'
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', pt: 1   }}>
                                            {format(new Date().setHours(hour, 0, 0), 'h a')}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        { /* Day columns container */ }
                        <Box sx={{ 
                            display: 'flex', 
                            flex: 1,
                            width: 'calc(100% - 30px)',
                            position: 'relative'
                        }}>
                            {days.map((day, index) => {
                                // Calculate flex basis to spread columns evenly
                                const flexBasis = `${100 / days.length}%`;
                                
                                return (
                                    <Box key={index} sx={{ 
                                        flex: `1 1 ${flexBasis}`,
                                        minWidth: '100px',
                                        marginRight: index < days.length - 1 ? '0.5rem' : 0,
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        bgcolor: index % 2 === 0 ? 'rgba(0, 0, 0, 0.01)' : 'transparent', // Alternate background colors
                                        ...(index < days.length - 1 && { borderRight: '1px solid rgba(0, 0, 0, 0.12)' }) // Simple border approach
                                    }}>
                                        { /* Day header - sticky at top with higher z-index */ }
                                        <Box sx={{ p: 1, 
                                            bgcolor: 'primary.main', 
                                            color: 'white',
                                            borderRadius: '4px 4px 0 0',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 10, // Higher z-index to ensure it stays on top
                                            height: '39px',
                                            borderBottom: '2px solid rgba(255, 255, 255, 0.2)', // Add bottom border to day header
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' // Add subtle shadow for depth
                                        }}>
                                            <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.8rem'   }}>
                                                {format(day, 'EEE, MMM d')}
                                            </Typography>
                                            {mode === 'provider' && (
                                                <Button 
                                                    size="small" 
                                                    variant="contained" 
                                                    color="inherit"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddBlock(day);
                                                    }}
                                                    sx={ { 
                                                        minWidth: 'auto',
                                                        p: '2px',
                                                        bgcolor: 'rgba(255,255,255,0.2)',
                                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)'  } 
                                                    }}
                                                >
                                                    <AddIcon sx={{ fontSize: '1rem'   }} />
                                                </Button>
                                            )}
                                        </Box>
                                        { /* Day time grid */ }
                                        <Box sx={{ 
                                            position: 'relative',
                                            height: (WORKING_HOURS_END - WORKING_HOURS_START) * HOUR_HEIGHT,
                                            minHeight: (WORKING_HOURS_END - WORKING_HOURS_START) * HOUR_HEIGHT,
                                            width: '100%',
                                            flex: 1,
                                            paddingRight: index < days.length - 1 ? '1rem' : 0, // Add padding to the right for columns with separators
                                            zIndex: 10, // Lower z-index so content scrolls behind headers
                                            borderRight: 'none' 
                                        }}>
                                            { /* Hour lines */ }
                                            {timeSlots.map((hour) => (
                                                <Box 
                                                    key={hour} 
                                                    sx={{ position: 'absolute', 
                                                        top: ((hour - WORKING_HOURS_START) * HOUR_HEIGHT), 
                                                        left: 0, 
                                                        right: 0, 
                                                        borderTop: '1px solid #ddd',
                                                        height: HOUR_HEIGHT,
                                                        zIndex: 1,
                                                    }}
                                                />
                                            ))}
                                            
                                            { /* Time blocks for available slots - show in both provider and consumer modes */ }
                                            {getBlocksForDay(day).map(block => {
                                                if (mode === 'consumer') {
                                                    return renderTimeBlock(block, day);
                                                } else if (mode === 'provider') {
                                                    // For provider mode, render blocks differently
                                                    try {
                                                        const blockStart = block.start instanceof Date ? block.start : new Date(block.start);
                                                        const blockEnd = block.end instanceof Date ? block.end : new Date(block.end);
                                                        
                                                        // Format times for display
                                                        const startHour = format(blockStart, 'h:mm a');
                                                        const endHour = format(blockEnd, 'h:mm a');
                                                        
                                                        console.log(`Rendering provider block: ${startHour} - ${endHour}`);
                                                        
                                                        return (
                                                <Box 
                                                    key={block.id} 
                                                    sx={getBlockStyle(block)}
                                                            >
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                                                                        {startHour}
                                                        </Typography>
                                                            <IconButton 
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteBlock(day, block.id);
                                                                 }}
                                                                        sx={{ 
                                                                            p: 0, 
                                                                            m: 0, 
                                                                            '& svg': { fontSize: '0.8rem' }
                                                                        }}
                                                                    >
                                                                        <DeleteIcon />
                                                            </IconButton>
                                                    </Box>
                                                                <Typography variant="caption" sx={{ mt: 'auto', fontSize: '0.7rem' }}>
                                                                    {endHour}
                                                                </Typography>
                                                </Box>
                                                        );
                                                    } catch (error) {
                                                        console.error('Error rendering block:', error, block);
                                                        return null;
                                                    }
                                                }
                                                return null;
                                            })}

                                            { /* Render existing user appointments in consumer mode */ }
                                            {mode === 'consumer' && getAppointmentsForDay(day).map((appointment) => {
                                                const startTime = new Date(appointment.start_time);
                                                const endTime = new Date(appointment.end_time);
                                                const apptBlock = {
                                                    id: `booked-${appointment.id}`,
                                                    start: startTime,
                                                    end: endTime
                                                };
                                                
                                                return (
                                                    <Box 
                                                        key={apptBlock.id} 
                                                        sx={getBlockStyle(apptBlock, true)}
                                                        onClick={(e) => handleAppointmentClick(appointment)}
                                                    >
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', top: '-2px' }}>
                                                            <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                                                                {format(startTime, 'h:mm a')}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'primary.main' }}>
                                                                ${appointment.service.price}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: '-5px', position: 'relative', top: '-1px' }}>
                                                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                                                {appointment.service.name}
                                                            </Typography>
                                                            <Chip 
                                                                label={
                                                                    appointment.status 
                                                                        ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)
                                                                        : ""
                                                                }
                                                                size="small"
                                                                color={appointment.status === 'confirmed' ? 'success' :
                                                                    appointment.status === 'pending' ? 'warning' :
                                                                    appointment.status === 'cancelled' ? 'error' : 'info'
                                                                }
                                                                sx={{ 
                                                                    height: '20px', 
                                                                    fontSize: '0.7rem',
                                                                    mr: 2
                                                                }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                            
                                            {/* Render provider's appointments in provider mode */}
                                            {mode === 'provider' && getProviderAppointmentsForDay(day).map((appointment) => {
                                                const startTime = new Date(appointment.start_time);
                                                const endTime = new Date(appointment.end_time);
                                                const apptBlock = {
                                                    id: `provider-appt-${appointment.id}`,
                                                    start: startTime,
                                                    end: endTime
                                                };
                                                
                                                return (
                                                    <Tooltip 
                                                        title={`${appointment.service.name} - ${appointment.consumer.email || "Anonymous client"} (${appointment.status})`}
                                                        key={apptBlock.id}
                                                    >
                                                        <Box 
                                                            sx={getBlockStyle(apptBlock, false, appointment)}
                                                            onClick={(e) => handleProviderAppointmentClick(appointment)}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', top: '-2px' }}>
                                                                <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                                                                    {format(startTime, 'h:mm a')}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'primary.main' }}>
                                                                    ${appointment.service.price}
                                                                </Typography>
                                                            </Box>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: '-5px', position: 'relative', top: '-1px' }}>
                                                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }} noWrap>
                                                                    {appointment.service.name}
                                                                </Typography>
                                                                <Chip 
                                                                    label={
                                                                        appointment.status 
                                                                            ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)
                                                                            : ""
                                                                    }
                                                                    size="small"
                                                                    color={appointment.status === 'confirmed' ? 'success' :
                                                                        appointment.status === 'pending' ? 'warning' :
                                                                        appointment.status === 'cancelled' ? 'error' : 'info'
                                                                    }
                                                                    sx={{ 
                                                                        height: '20px', 
                                                                        fontSize: '0.7rem',
                                                                        mr: 2
                                                                    }}
                                                                />
                                                            </Box>
                                                        </Box>
                                                    </Tooltip>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                </Box>
            </Box>
            { /* Provider dialog for adding availability */ }
            {mode === 'provider' && (
                <Dialog open={dialogOpen} onClose={handleCloseDialog}>
                    <DialogTitle>
                        {format(selectedDay, 'EEEE, MMMM d')}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText sx={{ mb: 2 }}>
                            Set a time block when you're available to provide services.
                        </DialogContentText>
                        {timeError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {timeError}
                            </Alert>
                        )}
                        
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <TextField
                                        label="Start Time"
                                        type="time"
                                        fullWidth
                                        value={startTime ? format(startTime, 'HH:mm') : ''}
                                        onChange={(e) => {
                                            const [hours, minutes] = e.target.value.split(':');
                                            const newTime = new Date();
                                            newTime.setHours(Number(hours), Number(minutes));
                                            setStartTime(newTime);
                                        }}
                                        InputLabelProps={{
                                            shrink: true,
                                        }}
                                        inputProps={{
                                            step: 300, // 5 min
                                        }}
                                    />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <TextField
                                        label="End Time"
                                        type="time"
                                        fullWidth
                                        value={endTime ? format(endTime, 'HH:mm') : ''}
                                        onChange={(e) => {
                                            const [hours, minutes] = e.target.value.split(':');
                                            const newTime = new Date();
                                            newTime.setHours(Number(hours), Number(minutes));
                                            setEndTime(newTime);
                                        }}
                                        InputLabelProps={{
                                            shrink: true,
                                        }}
                                        inputProps={{
                                            step: 300, // 5 min
                                        }}
                                    />
                                </Box>
                            </Box>
                        </LocalizationProvider>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button onClick={handleSaveTimeBlock} color="primary" variant="contained">
                            Add Time Block
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
            
            {mode === 'consumer' && (
                <Box sx={{ mt: 2, px: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Each appointment includes a 15-minute buffer time afterward to prevent back-to-back bookings.
                    </Typography>
                    <Box sx={{ display: 'flex', mt: 2, gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, 
                                height: 12, 
                                backgroundColor: '#e3f2fd', 
                                display: 'inline-block', 
                                mr: 1, 
                                border: '1px solid #2196f3' 
                              }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Available Slots
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, 
                                height: 12, 
                                backgroundColor: '#d4edda', 
                                display: 'inline-block', 
                                mr: 1, 
                                border: '1px solid #28a745' 
                              }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Your Booked Appointments
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            )}
            
            { /* Provider mode legend */ }
            {mode === 'provider' && (
                <Box sx={{ mt: 2, px: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Your availability is displayed with appointment bookings overlaid.
                    </Typography>
                    <Box sx={{ display: 'flex', mt: 2, flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, 
                                height: 12, 
                                backgroundColor: '#e8f5e9', 
                                display: 'inline-block', 
                                mr: 1, 
                                border: '1px solid #4caf50' 
                              }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Available Blocks
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, 
                                height: 12, 
                                backgroundColor: '#d4edda', 
                                display: 'inline-block', 
                                mr: 1, 
                                border: '1px solid #28a745' 
                              }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Confirmed
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, 
                                height: 12, 
                                backgroundColor: '#fff3cd', 
                                display: 'inline-block', 
                                mr: 1, 
                                border: '1px solid #ffc107' 
                              }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Pending
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, 
                                height: 12, 
                                backgroundColor: '#f8d7da', 
                                display: 'inline-block', 
                                mr: 1, 
                                border: '1px solid #dc3545' 
                              }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Cancelled
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            )}
            
            { /* Appointment details modal */ }
            {appointmentDetailsOpen && (
                <Dialog open={appointmentDetailsOpen} onClose={() => !cancelInProgress && setAppointmentDetailsOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        {cancelSuccess ? "Appointment Cancelled" : "Appointment Details"}
                    </DialogTitle>
                    {cancelSuccess ? (
                        <DialogContent>
                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                <CheckCircleIcon color="success" sx={{ fontSize: '3rem', mb: 2 }} />
                                <Typography variant="h6" gutterBottom>
                                    {mode === 'provider' ? 
                                        "The appointment has been cancelled successfully!" : 
                                        "Your appointment has been cancelled successfully!"}
                                </Typography>
                            </Box>
                        </DialogContent>
                    ) : (
                        <>
                            {cancelError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {cancelError}
                                </Alert>
                            )}
                            
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    {selectedAppointment?.service?.name || "Appointment"}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Chip 
                                        label={
                                            selectedAppointment?.status 
                                                ? selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)
                                                : ""
                                        }
                                        size="small"
                                        color={selectedAppointment?.status === 'confirmed' ? 'success' :
                                            selectedAppointment?.status === 'pending' ? 'warning' :
                                            selectedAppointment?.status === 'cancelled' ? 'error' : 'info'
                                        }
                                        sx={{ 
                                            height: '20px', 
                                            fontSize: '0.7rem',
                                            mr: 2
                                        }}
                                    />
                                    <Typography variant="body2">
                                        {selectedAppointment?.start_time && 
                                           format(new Date(selectedAppointment.start_time), 'h')}
                                    </Typography>
                                </Box>
                                <Typography variant="body2">
                                    {selectedAppointment?.start_time && 
                                       format(new Date(selectedAppointment.start_time), 'MMMM d, yyyy')}
                                </Typography>
                            </Box>
                            {mode === 'provider' ? (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Client Information
                                    </Typography>
                                    <Typography variant="body1">
                                        {selectedAppointment?.consumer?.username || selectedAppointment?.consumer?.email || "Anonymous"}
                                    </Typography>
                                    {selectedAppointment?.consumer?.phone_number && (
                                        <Typography variant="body2">
                                            Phone: {selectedAppointment.consumer.phone_number}
                                        </Typography>
                                    )}
                                    {selectedAppointment?.consumer?.address && (
                                        <Typography variant="body2">
                                            Address: {selectedAppointment.consumer.address}
                                        </Typography>
                                    )}
                                </Box>
                            ) : (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Provider
                                    </Typography>
                                    <Typography variant="body1">
                                        {selectedAppointment?.service?.provider?.business_name || ""}
                                    </Typography>
                                </Box>
                            )}
                            
                            <Box sx={{ display: 'flex', mb: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Duration
                                    </Typography>
                                    <Typography variant="body1">
                                        {selectedAppointment?.service?.duration || 0} minutes
                                    </Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Price
                                    </Typography>
                                    <Typography variant="body1">
                                        ${selectedAppointment?.service?.price || 0}
                                    </Typography>
                                </Box>
                            </Box>
                            {selectedAppointment?.notes && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Notes
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedAppointment.notes}
                                    </Typography>
                                </Box>
                            )}
                            
                            <Typography variant="caption" color="text.secondary">
                                Booked on: {selectedAppointment?.created_at && 
                                   format(new Date(selectedAppointment.created_at), 'MMMM d, yyyy')}
                            </Typography>
                        </>
                    )}
                    
                    <DialogActions>
                        <Button 
                            onClick={() => setAppointmentDetailsOpen(false)} 
                            disabled={cancelInProgress}
                        >
                            Close
                        </Button>
                        {/* Consumer cancel button */}
                        {mode === 'consumer' && (selectedAppointment?.status === 'confirmed' || selectedAppointment?.status === 'pending') && (
                            <Button 
                                onClick={handleCancelAppointment} 
                                variant="contained" 
                                color="error"
                                disabled={cancelInProgress}
                            >
                                {cancelInProgress ? <CircularProgress size={24} /> : 'Cancel Appointment'}
                            </Button>
                        )}
                        
                        {/* Provider status update buttons */}
                        {mode === 'provider' && selectedAppointment?.status === 'pending' && (
                            <Button
                                onClick={() => handleStatusChange('confirmed')}
                                variant="contained"
                                color="success"
                                disabled={cancelInProgress}
                            >
                                {cancelInProgress ? <CircularProgress size={24} /> : 'Confirm Appointment'}
                            </Button>
                        )}
                        
                        {mode === 'provider' && 
                         (selectedAppointment?.status === 'confirmed' || selectedAppointment?.status === 'pending') && (
                            <Button 
                                onClick={() => handleStatusChange('cancelled')} 
                                variant="contained" 
                                color="error"
                                disabled={cancelInProgress}
                            >
                                {cancelInProgress ? <CircularProgress size={24} /> : 'Cancel Appointment'}
                            </Button>
                        )}
                        
                        {mode === 'provider' && selectedAppointment?.status === 'confirmed' && (
                            <Button
                                onClick={() => handleStatusChange('completed')}
                                variant="contained"
                                color="primary"
                                disabled={cancelInProgress}
                            >
                                {cancelInProgress ? <CircularProgress size={24} /> : 'Mark as Completed'}
                            </Button>
                        )}
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
});

// Add display name for DevTools
AppointmentCalendar.displayName = 'AppointmentCalendar';

export default AppointmentCalendar; 