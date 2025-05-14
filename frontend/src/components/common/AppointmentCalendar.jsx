import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Box, 
    Typography, 
    Paper, 
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
    Divider,
    Tooltip,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, areIntervalsOverlapping } from 'date-fns';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { availability as availabilityApi, appointments as appointmentsApi } from '../../services/api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const AppointmentCalendar = forwardRef(({ mode,
    onBlockClick,
    onAvailabilityChange,
    providerId,
    serviceId,
    service,
    initialTimeBlocks,
    appointments = [],
    loading: appointmentsLoading,
    error: appointmentsError,
    daysToShow = 5,
    title
}, ref) => {
    const [selectedDay, setSelectedDay] = useState(new Date());
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

    // Define fetch functions before useEffect
    const fetchProviderAvailability = async (provId) => {
        try {
            setLoading(true);
            console.log('Fetching availability for provider ID');
            const response = await availabilityApi.getForProvider(provId);
            
            // Convert ISO strings to Date objects
            const formattedAvailability = {};
            Object.entries(response.data).forEach(([dateStr, blocks]) => {
                if (Array.isArray(blocks)) {
                    formattedAvailability[dateStr] = blocks.map((block) => ({
                        id: block.id,
                        start: new Date(block.start),
                        end: new Date(block.end)
                    }));
                } else {
                    formattedAvailability[dateStr] = [];
                }
            });
            
            // Merge with initial availability to ensure all days have entries
            const mergedAvailability = { ...timeBlocks };
            
            // Add all the loaded availability to the merged object
            Object.entries(formattedAvailability).forEach(([dateStr, blocks]) => {
                mergedAvailability[dateStr] = blocks;
            });
            
            // Ensure all days in our view have entries (even if empty)
            days.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                if (!mergedAvailability[dateStr]) {
                    mergedAvailability[dateStr] = [];
                }
            });
            
            setTimeBlocks(mergedAvailability);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching availability');
            setError('Failed to load availability data');
            setLoading(false);
        }
    };
    
    const fetchServiceAvailability = async (servId) => {
        try {
            setLoading(true);
            console.log('Fetching availability for service ID');
            const response = await availabilityApi.getForService(servId);
            
            // Convert ISO strings to Date objects
            const formattedAvailability = {};
            Object.entries(response.data).forEach(([dateStr, blocks]) => {
                if (Array.isArray(blocks)) {
                    formattedAvailability[dateStr] = blocks.map((block) => ({
                        id: block.id,
                        start: new Date(block.start),
                        end: new Date(block.end)
                    }));
                } else {
                    formattedAvailability[dateStr] = [];
                }
            });
            
            console.log('Service availability loaded');
            setTimeBlocks(formattedAvailability);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching service availability');
            setError('Failed to load appointment options');
            setLoading(false);
        }
    };

    const fetchUserAppointments = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                console.log('No user logged in, skipping appointment fetch');
                return;
            }

            console.log('Fetching user appointments');
            const result = await appointmentsApi.getAll();
            
            console.log('User appointments loaded');
            setUserAppointments(result.data);
            return result.data;
        } catch (err) {
            console.error('Error fetching user appointments');
            // Don't set error - this is supplementary data
            return [];
        }
    };

    const fetchProviderAppointments = async () => {
        if (mode !== 'provider' || !providerId) return;
        
        try {
            console.log('Fetching provider appointments');
            const response = await appointmentsApi.getAllForProvider();
            
            console.log('Provider appointments loaded');
            setProviderAppointments(response.data);
        } catch (err) {
            console.error('Error fetching provider appointments');
            // Don't set error - this is supplementary data
        }
    };
    
    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
        fetchUserAppointments: async () => {
            console.log('Refreshing appointments and availability');
            // Refresh user appointments first
            const appointments = await fetchUserAppointments();
            console.log('Appointments refreshed:', appointments);
            
            // Also refresh service availability if in consumer mode
            if (mode === 'consumer' && serviceId) {
                console.log('Refreshing service availability for service:', serviceId);
                await fetchServiceAvailability(serviceId);
            }
            
            return appointments;
        }
    }));
    
    // Generate days array (today + next N days)
    useEffect(() => {
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
        
        setTimeBlocks(initialTimeBlocks || initialAvailability);
        
        // Load data based on mode
        if (mode === 'provider' && providerId) {
            fetchProviderAvailability(providerId);
            fetchProviderAppointments(); // Fetch provider's appointments
        } else if (mode === 'consumer' && serviceId) {
            fetchServiceAvailability(serviceId);
            fetchUserAppointments(); // Fetch user's existing appointments
        }
    }, [mode, providerId, serviceId, daysToShow, initialTimeBlocks]);
    
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
                    apiAvailability[dateStr] = blocks.map((block) => ({
                        id: block.id,
                        start: block.start.toISOString(),
                        end: block.end.toISOString()
                    }));
                }
            });
            
            console.log('Sending API availability data');
            const response = await availabilityApi.save(providerId, apiAvailability);
            console.log('API response from saving availability');
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            setLoading(false);
        } catch (err) {
            console.error('Error saving availability');
            setError('Failed to save availability data');
            setLoading(false);
        }
    };
    
    const handleDaySelect = (day) => {
        if (mode !== 'provider') return;
        
        setSelectedDay(day);
        setDialogOpen(true);
        setStartTime(null);
        setEndTime(null);
        setTimeError('');
    };
    
    const handleAddBlock = (day) => {
        if (mode !== 'provider') return;
        
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
        
        const newBlock = {
            id: `block-${Date.now()}`,
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
                { start: block.start, end: block.end }
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
        
        const dateStr = format(day, 'yyyy-MM-dd');
        const existingBlocks = timeBlocks[dateStr] || [];
        const updatedBlocks = existingBlocks.filter(block => block.id !== blockId);
        
        const newAvailability = {
            ...timeBlocks,
            [dateStr]: updatedBlocks
        };
        
        setTimeBlocks(newAvailability);
        
        // Notify parent component if callback provided
        if (onAvailabilityChange) {
            onAvailabilityChange(newAvailability);
        }
    };
    
    const handleBlockClick = (block) => {
        if (mode === 'consumer' && onBlockClick) {
            console.log('Block clicked for booking');
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
        return timeBlocks[dateStr] || [];
    };

    // Get existing user appointments for a specific day
    const getAppointmentsForDay = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return appointments.filter(appointment => {
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
        const startMinutes = block.start.getHours() * 60 + block.start.getMinutes();
        const endMinutes = block.end.getHours() * 60 + block.end.getMinutes();
        
        const top = ((startMinutes / 60) - WORKING_HOURS_START) * HOUR_HEIGHT;
        const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
        
        const commonStyles = {
            position: 'absolute',
            top: `${top}px`,
            height: `${height}px`,
            width: 'calc(100% - 8px)',
            borderRadius: '3px',
            padding: '2px 4px',
            paddingTop: '0px', // Reduce top padding to move content up
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            fontSize: '0.75rem',
            zIndex: 3, // Ensure all blocks have z-index lower than headers
            cursor: 'pointer',
        };
        
        if (appointment) { // For provider mode, show different colors based on appointment status
            const statusColors = {
                confirmed: {
                    bg: '#d4edda', // Light green
                    border: '#c3e6cb',
                    hover: '#c3e6cb',
                    text: '#155724'
                },
                pending: { bg: '#fff3cd', // Light yellow
                    border: '#ffeeba',
                    hover: '#ffeeba',
                    text: '#856404'
                },
                cancelled: { bg: '#f8d7da', // Light red
                    border: '#f5c6cb',
                    hover: '#f5c6cb',
                    text: '#721c24'
                },
                completed: { bg: '#cce5ff', // Light blue
                    border: '#b8daff',
                    hover: '#b8daff',
                    text: '#004085'
                }
            };
            
            const colorSet = statusColors[appointment.status] || statusColors.confirmed;
            
            return {
                ...commonStyles,
                backgroundColor: colorSet.bg,
                border: `1px solid ${colorSet.border}`,
                color: colorSet.text,
                zIndex: 4, // Higher than availability blocks but still below headers
                '&:hover': { backgroundColor: colorSet.hover },
                // Make it slightly narrower than availability blocks
                width: 'calc(100% - 12px)',
                left: '2px'
            };
        } else if (isUserAppointment) {
            return {
                ...commonStyles,
                backgroundColor: '#d4edda', // Light green color for user's booked appointments
                border: '1px solid #c3e6cb',
                color: '#155724',
                cursor: 'default',
                '&:hover': {
                    backgroundColor: '#c3e6cb',
                }
            };
        } else if (mode === 'consumer') {
            return {
                ...commonStyles,
                backgroundColor: '#e3f2fd',
                border: '1px solid #90caf9',
                '&:hover': {
                    backgroundColor: '#bbdefb',
                    borderColor: '#1976d2',
                }
            };
        } else {
            return {
                ...commonStyles,
                backgroundColor: '#bbdefb',
                '&:hover': {
                    backgroundColor: '#90caf9',
                }
            };
        }
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
    
    // Handle cancellation of appointment
    const handleCancelAppointment = async () => {
        if (!selectedAppointment) return;
        
        try {
            setCancelInProgress(true);
            setCancelError('');
            
            console.log('Cancelling appointment');
            
            // Call API to update appointment status
            await appointmentsApi.updateStatus(selectedAppointment.id, 'cancelled');
            console.log('Appointment cancelled successfully');
            
            setCancelSuccess(true);
            setCancelInProgress(false);
            
            // Refresh appointments after cancellation
            await fetchUserAppointments();
            
            // If refreshing service availability is needed
            if (serviceId) {
                fetchServiceAvailability(serviceId);
            }
            
            // Close modal after short delay
            setTimeout(() => {
                setAppointmentDetailsOpen(false);
                setSelectedAppointment(null);
            }, 2000);
            
        } catch (err) {
            console.error('Error cancelling appointment');
            setCancelError('Failed to cancel appointment. Please try again.');
            setCancelInProgress(false);
        }
    };
    
    // Handle status change for provider appointments
    const handleStatusChange = async (newStatus) => {
        if (!selectedAppointment) return;
        
        try {
            setCancelInProgress(true);
            setCancelError('');
            
            console.log(`Updating appointment ${selectedAppointment.id} status to ${newStatus}`);
            
            // Call API to update appointment status
            await appointmentsApi.updateStatus(selectedAppointment.id, newStatus);
            console.log('Appointment status updated successfully');
            
            setCancelSuccess(true);
            setCancelInProgress(false);
            
            // Refresh provider appointments
            await fetchProviderAppointments();
            
            // Close modal after short delay
            setTimeout(() => {
                setAppointmentDetailsOpen(false);
                setSelectedAppointment(null);
            }, 2000);
            
        } catch (err) {
            console.error('Error updating appointment status');
            setCancelError(`Failed to update appointment status to ${newStatus}. Please try again.`);
            setCancelInProgress(false);
        }
    };
    
    // Update the block rendering to include appointments
    const renderTimeBlock = (day, hour) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const blocks = timeBlocks[dateStr] || [];
        const dayAppointments = getAppointmentsForDay(day);

        // Find if there's an appointment at this hour
        const appointment = dayAppointments.find(apt => {
            const aptStart = new Date(apt.start_time);
            const aptEnd = new Date(apt.end_time);
            const blockStart = new Date(day);
            blockStart.setHours(hour, 0, 0);
            const blockEnd = new Date(day);
            blockEnd.setHours(hour + 1, 0, 0);
            return areIntervalsOverlapping(
                { start: aptStart, end: aptEnd },
                { start: blockStart, end: blockEnd }
            );
        });

        // Find if there's an availability block at this hour
        const block = blocks.find(block => {
            const blockStart = new Date(block.start);
            const blockEnd = new Date(block.end);
            const hourStart = new Date(day);
            hourStart.setHours(hour, 0, 0);
            const hourEnd = new Date(day);
            hourEnd.setHours(hour + 1, 0, 0);
            return areIntervalsOverlapping(
                { start: blockStart, end: blockEnd },
                { start: hourStart, end: hourEnd }
            );
        });

        if (appointment) {
            const startTime = new Date(appointment.start_time);
            const endTime = new Date(appointment.end_time);
            const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
            const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
            
            const top = ((startMinutes / 60) - WORKING_HOURS_START) * HOUR_HEIGHT;
            const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

            return (
                <Box
                    key={`${dateStr}-${appointment.id}`}
                    sx={{
                        position: 'absolute',
                        top: `${top}px`,
                        height: `${height}px`,
                        left: 0,
                        right: 0,
                        backgroundColor: appointment.status === 'pending' ? '#fff3cd' :
                            appointment.status === 'confirmed' ? '#d4edda' :
                            appointment.status === 'cancelled' ? '#f8d7da' :
                            appointment.status === 'completed' ? '#cce5ff' : '#e3f2fd',
                        border: '1px solid',
                        borderColor: appointment.status === 'pending' ? '#ffeeba' :
                            appointment.status === 'confirmed' ? '#c3e6cb' :
                            appointment.status === 'cancelled' ? '#f5c6cb' :
                            appointment.status === 'completed' ? '#b8daff' : '#90caf9',
                        borderRadius: '4px',
                        padding: '2px 4px',
                        fontSize: '0.75rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        zIndex: 2,
                        '&:hover': {
                            backgroundColor: appointment.status === 'pending' ? '#ffeeba' :
                                appointment.status === 'confirmed' ? '#c3e6cb' :
                                appointment.status === 'cancelled' ? '#f5c6cb' :
                                appointment.status === 'completed' ? '#b8daff' : '#90caf9',
                        }
                    }}
                    onClick={() => handleAppointmentClick(appointment)}
                >
                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block' }}>
                        {appointment.service.name} - {appointment.consumer.username}
                    </Typography>
                </Box>
            );
        } else if (block) {
            const startMinutes = block.start.getHours() * 60 + block.start.getMinutes();
            const endMinutes = block.end.getHours() * 60 + block.end.getMinutes();
            
            const top = ((startMinutes / 60) - WORKING_HOURS_START) * HOUR_HEIGHT;
            const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

            return (
                <Box
                    key={`${dateStr}-${block.id}`}
                    sx={{
                        position: 'absolute',
                        top: `${top}px`,
                        height: `${height}px`,
                        left: 0,
                        right: 0,
                        backgroundColor: '#e3f2fd',
                        border: '1px solid #90caf9',
                        borderRadius: '4px',
                        padding: '2px 4px',
                        fontSize: '0.75rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: mode === 'provider' ? 'pointer' : 'pointer', // Changed to always be pointer
                        zIndex: 1,
                        '&:hover': {
                            backgroundColor: '#bbdefb',
                            borderColor: '#1976d2',
                        }
                    }}
                    onClick={() => {
                        if (mode === 'provider') {
                            handleBlockClick(block);
                        } else if (mode === 'consumer' && onBlockClick) {
                            onBlockClick(block);
                        }
                    }}
                >
                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {format(block.start, 'h:mm a')} - {format(block.end, 'h:mm a')}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block' }}>
                        Available
                    </Typography>
                    {mode === 'consumer' && service && (
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', color: 'primary.main' }}>
                            ${service.price}
                        </Typography>
                    )}
                </Box>
            );
        }

        return null;
    };
    
    if (loading && Object.keys(timeBlocks).length === 0) {
        return (
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
            
            {appointmentsError && (
                <Alert severity="error" sx={{ mb: 2, py: 1, fontSize: '0.75rem' }}>
                    {appointmentsError}
                </Alert>
            )}
            
            {appointmentsLoading && (
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
                    <CircularProgress size={24} />
                </Box>
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
                                                    onClick={() => handleAddBlock(day) }
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
                                            
                                            { /* Time blocks for available slots */ }
                                            {renderTimeBlock(day, 8)}
                                            {renderTimeBlock(day, 9)}
                                            {renderTimeBlock(day, 10)}
                                            {renderTimeBlock(day, 11)}
                                            {renderTimeBlock(day, 12)}
                                            {renderTimeBlock(day, 13)}
                                            {renderTimeBlock(day, 14)}
                                            {renderTimeBlock(day, 15)}
                                            {renderTimeBlock(day, 16)}
                                            {renderTimeBlock(day, 17)}
                                            {renderTimeBlock(day, 18)}
                                            {renderTimeBlock(day, 19)}
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
                                border: '1px solid #90caf9' 
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
                                border: '1px solid #c3e6cb' 
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
                            <Box component="span" sx={{ width: 12, height: 12, backgroundColor: '#e3f2fd', display: 'inline-block', mr: 1, border: '1px solid #90caf9' }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Available Blocks
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, height: 12, backgroundColor: '#fff3cd', display: 'inline-block', mr: 1, border: '1px solid #ffeeba' }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Pending
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, height: 12, backgroundColor: '#d4edda', display: 'inline-block', mr: 1, border: '1px solid #c3e6cb' }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Confirmed
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, height: 12, backgroundColor: '#f8d7da', display: 'inline-block', mr: 1, border: '1px solid #f5c6cb' }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Cancelled
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, height: 12, backgroundColor: '#cce5ff', display: 'inline-block', mr: 1, border: '1px solid #b8daff' }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Completed
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
                                        sx={{ 
                                            height: '16px', 
                                            fontSize: '0.6rem',
                                            maxWidth: '70%'
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