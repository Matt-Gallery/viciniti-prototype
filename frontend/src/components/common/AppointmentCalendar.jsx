import React, { useState, useEffect, useCallback, forwardRef, useRef, useImperativeHandle } from 'react';
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
    Chip,
    IconButton,
    Tooltip
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, areIntervalsOverlapping } from 'date-fns';
import AddIcon from '@mui/icons-material/Add';
import { availability as availabilityApi, appointments as appointmentsApi } from '../../services/api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Add a utility function to check if a time range overlaps with a given hour
const isTimeRangeOverlappingHour = (start, end, day, hour) => {
    const hourStart = new Date(day);
    hourStart.setHours(hour, 0, 0);
    const hourEnd = new Date(day);
    hourEnd.setHours(hour + 1, 0, 0);
    
    return areIntervalsOverlapping(
        { start, end },
        { start: hourStart, end: hourEnd }
    );
};

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
    // Add a forceUpdate counter to trigger re-renders
    const [forceUpdate, setForceUpdate] = useState(0);
    
    // State for manage appointment modal
    const [appointmentDetailsOpen, setAppointmentDetailsOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [cancelInProgress, setCancelInProgress] = useState(false);
    const [cancelError, setCancelError] = useState('');
    const [cancelSuccess, setCancelSuccess] = useState(false);
    const [updatedStatus, setUpdatedStatus] = useState('');
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [timeError, setTimeError] = useState('');
    
    // Add state for block editing
    const [editingBlock, setEditingBlock] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    
    // Add state for block deletion
    const [deletingBlock, setDeletingBlock] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    
    const WORKING_HOURS_START = 5; // 5 AM
    const WORKING_HOURS_END = 23;  // 11 PM
    const HOUR_HEIGHT = 70;        // Increased from 50 to 70 pixels per hour
    
    const [providerAppointments, setProviderAppointments] = useState([]);
    
    // Add new state variables for drag functionality
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartTime, setDragStartTime] = useState(null);
    const [dragCurrentTime, setDragCurrentTime] = useState(null);
    const [dragDay, setDragDay] = useState(null);
    
    // Add refs to access DOM elements for drag calculations
    const dayColumnsRef = useRef({});
    
    // Add ref to scrollable container
    const scrollContainerRef = useRef(null);
    
    // Add state for auto-scrolling
    const [autoScrolling, setAutoScrolling] = useState(false);
    const scrollAnimationRef = useRef(null);
    // Added to smooth out drag operations
    const dragThrottleRef = useRef(false);
    
    const fetchUserAppointments = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                return [];
            }

            const result = await appointmentsApi.getAll();
            
            if (result.data && result.data.length > 0) {
                // Check for cancelled appointments
                const cancelledAppointments = result.data.filter(a => a.status === 'cancelled');
                if (cancelledAppointments.length > 0) {
                    // Silently process cancelled appointments
                }
            }
            
            // Update state, but only if data actually changed
            if (Array.isArray(result.data)) {
                // NEVER filter out cancelled appointments - we need to keep them for display
                const newAppointments = result.data;
                
                // Update the state with the new data to ensure cancelled appointments are included
                setUserAppointments(newAppointments);
            }
            
            return result.data;
        } catch (err) {
            // Silent error handling
            return [];
        }
    };
    
    const fetchProviderAvailability = async (provId) => {
        // Prevent unnecessary rerenders and API calls
        if (!provId || loading) return;
        
        try {
            setLoading(true);
            const response = await availabilityApi.getForProvider(provId);
            
            // Process data only if component is still mounted (use a flag if necessary)
            // Convert ISO strings to Date objects
            const formattedAvailability = {};
            Object.entries(response.data || {}).forEach(([dateStr, blocks]) => {
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
            
            // Batch state updates to minimize renders
            setTimeBlocks(prevTimeBlocks => {
                // Merge with initial availability to ensure all days have entries
                const mergedAvailability = { ...prevTimeBlocks };
                
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
                
                return mergedAvailability;
            });
            
            setLoading(false);
        } catch (err) {
            setError('Failed to load availability data');
            setLoading(false);
         }
    };
    
    const fetchServiceAvailability = async (servId) => {
        try {
            setLoading(true);
            
            // Use the discount-enabled endpoint when in consumer mode
            const response = mode === 'consumer' 
                ? await availabilityApi.getForServiceWithDiscount(servId)
                : await availabilityApi.getForService(servId);
            
                
            // Debug logging to see what's in the data
            Object.keys(response.data).forEach(date => {
            });
            
            // Convert ISO strings to Date objects
            const formattedAvailability = {};
            Object.entries(response.data).forEach(([dateStr, blocks]) => {
                if (Array.isArray(blocks)) {
                    formattedAvailability[dateStr] = blocks.map((block, index) => {
                        return {
                            // Ensure each block has a truly unique ID by incorporating both date and index
                            id: `${dateStr}-${block.id}-${index}`,
                            start: new Date(block.start),
                            end: new Date(block.end),
                            // Add discount information if available
                            originalPrice: block.original_price,
                            discountPercentage: block.discount_percentage || 0,
                            discountedPrice: block.discounted_price || block.original_price
                        };
                    });
                } else {
                    formattedAvailability[dateStr] = [];
                }
            });
            
            // Debug logging to check availability by date
            Object.keys(formattedAvailability).forEach(date => {
                if (formattedAvailability[date].length > 0) {
                }
            });
            
            setTimeBlocks(formattedAvailability);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching service availability:', err);
            setError('Failed to load appointment options');
            setLoading(false);
        }
    };
    
    const fetchProviderAppointments = async () => {
        if (mode !== 'provider' || !providerId) return;
        
        try {
            const response = await appointmentsApi.getAllForProvider();
            
            // Check if we have any cancelled appointments
            const cancelledAppointments = response.data.filter(apt => apt.status === 'cancelled');
            if (cancelledAppointments.length > 0) {
                // Silently process cancelled appointments
            }
            
            // Ensure we're setting the appointments in state without filtering
            // Use functional state update to prevent race conditions
            setProviderAppointments(response.data || []);
        } catch (err) {
            // Silent error handling, don't trigger state updates
        }
    };
    
    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
        fetchUserAppointments: async () => {
            
            // First refresh service availability to update available slots
            if (mode === 'consumer' && serviceId) {
                await fetchServiceAvailability(serviceId);
            }
            
            // Then refresh appointments
            const appointments = await fetchUserAppointments();
            
            // Return the fetched appointments
            return appointments;
        }
    }), [fetchUserAppointments, fetchServiceAvailability, mode, serviceId]); // Added missing dependencies
    
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
        
        if (initialTimeBlocks) {
            // Merge the initial time blocks with empty slots for days that don't have any blocks
            const mergedBlocks = { ...initialAvailability, ...initialTimeBlocks };
            setTimeBlocks(mergedBlocks);
        } else {
            setTimeBlocks(initialAvailability);
        }
        
        // Load data based on mode
        if (mode === 'provider' && providerId) {
            fetchProviderAvailability(providerId);
            fetchProviderAppointments(); // Fetch provider's appointments
        } else if (mode === 'consumer' && serviceId) {
            fetchServiceAvailability(serviceId);
            fetchUserAppointments(); // Fetch user's existing appointments
        }
    }, [mode, providerId, serviceId, daysToShow, initialTimeBlocks]); // eslint-disable-line react-hooks/exhaustive-deps
    
    // Update timeBlocks when initialTimeBlocks prop changes
    useEffect(() => {
        
        if (initialTimeBlocks && Object.keys(initialTimeBlocks).length > 0) {
            
            // Deep check if the timeBlocks have actually changed to avoid unnecessary re-renders
            let hasChanged = false;
            for (const date in initialTimeBlocks) {
                if (!timeBlocks[date] || 
                    timeBlocks[date].length !== initialTimeBlocks[date].length) {
                    hasChanged = true;
                    break;
                }
            }
            
            if (hasChanged) {
                // Create a deep copy with properly instantiated Date objects
                const formattedBlocks = {};
                Object.entries(initialTimeBlocks).forEach(([dateStr, blocks]) => {
                    if (Array.isArray(blocks)) {
                        formattedBlocks[dateStr] = blocks.map(block => ({
                            id: block.id,
                            start: block.start instanceof Date ? new Date(block.start) : new Date(block.start),
                            end: block.end instanceof Date ? new Date(block.end) : new Date(block.end),
                            originalPrice: block.originalPrice,
                            discountPercentage: block.discountPercentage || 0,
                            discountedPrice: block.discountedPrice || block.originalPrice
                        }));
                    } else {
                        formattedBlocks[dateStr] = [];
                    }
                });
                
                setTimeBlocks(formattedBlocks);
            }
        }
    }, [initialTimeBlocks]);
    
    const saveAvailability = async () => {
        if (mode !== 'provider' || !providerId) {
            console.error('Cannot save availability in provider mode or providerId is missing');
            return;
         }
        
        try {
            setLoading(true);
            
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
            
            await availabilityApi.save(providerId, apiAvailability);
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
        
        
        const dateStr = format(selectedDay, 'yyyy-MM-dd');
        
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
        

        setTimeBlocks(newAvailability);
        setDialogOpen(false);
        
        // Notify parent component if callback provided
        if (onAvailabilityChange) {

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

    // Update the getAppointmentsForDay function to be more robust
    const getAppointmentsForDay = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // Create a combined array without duplicates
        const allAppointments = [...appointments];
        
        // Add user appointments that aren't already included
        const appointmentIds = new Set(appointments.map(a => a.id));
        userAppointments.forEach(userAppt => {
            if (!appointmentIds.has(userAppt.id)) {
                allAppointments.push(userAppt);
            }
        });
        
        // Filter for the current day, but keep ALL statuses including cancelled
        const dayAppointments = allAppointments.filter(appointment => {
            const appointmentDate = format(new Date(appointment.start_time), 'yyyy-MM-dd');
            const matchesDay = appointmentDate === dateStr;
            
            if (appointment.status === 'cancelled' && matchesDay) {
            }
            
            return matchesDay;
        });
        
        return dayAppointments;
    };
    
    // Get provider appointments for a specific day
    const getProviderAppointmentsForDay = (day) => {
        if (mode !== 'provider') return [];
        
        const dateStr = format(day, 'yyyy-MM-dd');
        
        const dayAppointments = providerAppointments.filter(appointment => {
            const appointmentDate = format(new Date(appointment.start_time), 'yyyy-MM-dd');
            return appointmentDate === dateStr;
        });
        
        return dayAppointments;
    };
    
    // Handle mouse leave event
    const handleMouseLeave = () => {
        if (isDragging) {
            setIsDragging(false);
            setDragStartTime(null);
            setDragCurrentTime(null);
            setDragDay(null);
            
            // Cancel any ongoing auto-scroll
            if (scrollAnimationRef.current) {
                cancelAnimationFrame(scrollAnimationRef.current);
                setAutoScrolling(false);
            }
        }
    };
    
    // Calculate position and height for a time block
    const getBlockStyle = (block, isUserAppointment = false, appointment) => {
        // Determine if we're dealing with an appointment object or a block
        let startDate, endDate;
        
        if (appointment) {
            // For appointments, use start_time and end_time
            startDate = new Date(appointment.start_time);
            endDate = new Date(appointment.end_time);
        } else {
            // For regular blocks, use start and end
            startDate = block.start instanceof Date ? block.start : new Date(block.start);
            endDate = block.end instanceof Date ? block.end : new Date(block.end);
        }
        
        const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
        const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
        
        const top = ((startMinutes / 60) - WORKING_HOURS_START) * HOUR_HEIGHT;
        const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
        
        const commonStyles = {
            position: 'absolute',
            top: `${top}px`,
            height: `${height}px`,
            width: 'calc(100% - 8px)',
            left: '4px',
            borderRadius: '6px',
            padding: '4px 2px',
            minHeight: '32px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px 0 rgba(36,81,255,0.10)',
            border: '1.5px solid rgba(36,81,255,0.15)',
            overflow: 'hidden',
            position: 'relative', // Add relative positioning for buffer indicators
        };
        
        if (appointment) {
            // Appointment block styling based on status
            const statusColors = {
                pending: {
                    bg: '#fff3cd',
                    border: '#ffeeba',
                    text: '#856404'
                },
                confirmed: {
                    bg: '#d4edda',
                    border: '#c3e6cb',
                    text: '#155724'
                },
                cancelled: {
                    bg: '#f8d7da',
                    border: '#f5c6cb',
                    text: '#721c24'
                },
                completed: {
                    bg: '#cce5ff',
                    border: '#b8daff',
                    text: '#004085'
                }
            };

            const status = appointment.status || 'pending';
            const colors = statusColors[status] || statusColors.pending;

            // For cancelled appointments - make them visible but with a lower z-index
            // Make sure the z-index is lower than availability blocks in consumer mode
            const zIndexValue = status === 'cancelled' ? 1 : 4;

            return {
                ...commonStyles,
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1.5px solid ${colors.border}`,
                zIndex: zIndexValue, // Use the determined z-index based on status
                opacity: status === 'cancelled' ? 0.9 : 1, // Slightly transparent for cancelled, but still visible
            };
        } else if (isUserAppointment) {
            return {
                ...commonStyles,
                backgroundColor: '#ffd200',
                color: '#23203a',
                border: '1.5px solid #ffd200',
                zIndex: 4,
            };
        } else if (mode === 'consumer') {
            // For consumer mode, show available blocks with optional buffer indication
            const hasBuffer = block.buffer_info && block.buffer_info.has_buffer;
            const baseStyle = {
                ...commonStyles,
                // Use different styles for discounted slots
                backgroundColor: block.discountPercentage > 0 ? '#388e3c' : '#232a5c',
                color: '#fff',
                border: `1.5px solid ${block.discountPercentage > 0 ? '#388e3c' : '#232a5c'}`,
                zIndex: 5, // Higher than cancelled appointments (z-index 2) and normal appointments (z-index 4)
            };
            
            // If this block has buffer information, we'll indicate it
            if (hasBuffer && mode === 'consumer') {
                return {
                    ...baseStyle,
                    // Add a subtle indicator for the buffer zone
                    '&::before, &::after': {
                        content: '""',
                        position: 'absolute',
                        width: '100%',
                        height: '5px',
                        left: 0,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        zIndex: 1,
                    },
                    // Add buffer indicator at top (before buffer)
                    '&::before': {
                        top: '-5px',
                    },
                    // Add buffer indicator at bottom (after buffer)
                    '&::after': {
                        bottom: '-5px',
                    },
                };
            }
            
            return baseStyle;
        } else {
            // Provider mode (availability blocks)
            if (block.discountPercentage > 0) {
                return {
                    ...commonStyles,
                    backgroundColor: '#388e3c',
                    color: '#fff',
                    border: '1.5px solid #388e3c',
                    zIndex: 3,
                };
            } else {
                return {
                    ...commonStyles,
                    backgroundColor: '#232a5c',
                    color: '#fff',
                    border: '1.5px solid #232a5c',
                    zIndex: 3,
                };
            }
        }
    };

    // Memoize handlers with useCallback to prevent unnecessary re-renders
    const handleProviderAppointmentClick = useCallback((appointment) => {
        if (mode === 'provider') {
            setSelectedAppointment(appointment);
            setCancelError('');
            setCancelSuccess(false);
            setAppointmentDetailsOpen(true);
        }
    }, [mode]);

    // Handle appointment click to show details
    const handleAppointmentClick = useCallback((appointment) => {
        if (mode === 'consumer') {
            setSelectedAppointment(appointment);
            setCancelError('');
            setCancelSuccess(false);
            setAppointmentDetailsOpen(true);
        }
    }, [mode]);

    // Handle status change for provider appointments
    const handleStatusChange = useCallback(async (newStatus) => {
        if (!selectedAppointment) return;
        
        try {
            setCancelInProgress(true);
            setCancelError('');
            
            // Ensure ID is treated as a string
            const appointmentId = selectedAppointment.id.toString();
            
            // Call API to update appointment status
            await appointmentsApi.updateStatus(appointmentId, newStatus);
            
            // Store the updated status for the confirmation message
            setUpdatedStatus(newStatus);
            setCancelSuccess(true);
            setCancelInProgress(false);
            
            // Force re-render by incrementing the counter
            setForceUpdate(prev => prev + 1);
            
            // Auto-close modal after 2 seconds and fetch data again
            setTimeout(() => {
                setAppointmentDetailsOpen(false);
                setSelectedAppointment(null);
                
                // Refresh data one more time after closing to ensure UI is updated
                if (mode === 'provider' && providerId) {
                    fetchProviderAppointments();
                    providerId && fetchProviderAvailability(providerId);
                }
            }, 2000);
        } catch (err) {
            setCancelError(`Failed to update appointment status to ${newStatus}. Please try again.`);
            setCancelInProgress(false);
        }
    }, [selectedAppointment, mode, providerId]);

    // Handle cancellation of appointment
    const handleCancelAppointment = async () => {
        if (!selectedAppointment) return;
        
        try {
            setCancelInProgress(true);
            setCancelError('');
            
            // Make sure the appointment ID is a string for the API call
            const appointmentId = selectedAppointment.id.toString();
            
            // Call API to update appointment status
            await appointmentsApi.updateStatus(appointmentId, 'cancelled');
            
            // Store the cancelled status for the confirmation message
            setUpdatedStatus('cancelled');
            setCancelSuccess(true);
            setCancelInProgress(false);
            
            // Force re-render by incrementing the counter
            setForceUpdate(prev => prev + 1);
            
            // Update appointment in the local state if it exists there
            setUserAppointments(prev => 
                prev.map(apt => 
                    apt.id === appointmentId 
                        ? { ...apt, status: 'cancelled' } 
                        : apt
                )
            );
            
            // Immediately fetch updated data
            try {
                const [updatedAppointments] = await Promise.all([
                    fetchUserAppointments(),
                    serviceId && fetchServiceAvailability(serviceId)
                ]);
                
                // Make sure we directly update the userAppointments state with the new data
                if (updatedAppointments && updatedAppointments.length > 0) {
                    setUserAppointments(updatedAppointments);
                }
                
                // Force another re-render
                setForceUpdate(prev => prev + 1);
            } catch (refreshErr) {
                console.error('Error refreshing data after cancellation:', refreshErr);
            }
            
            // Auto-close modal after 2 seconds and fetch data again
            setTimeout(async () => {
                setAppointmentDetailsOpen(false);
                setSelectedAppointment(null);
                
                // Refresh data again after closing to ensure UI is updated
                try {
                    const [updatedAppointments] = await Promise.all([
                        fetchUserAppointments(),
                        serviceId && fetchServiceAvailability(serviceId)
                    ]);
                    
                    // Direct state update
                    if (updatedAppointments && updatedAppointments.length > 0) {
                        setUserAppointments(updatedAppointments);
                    }
                    
                    // Force re-render again
                    setForceUpdate(prev => prev + 1);
                } catch (refreshErr) {
                    console.error('Error refreshing data after modal close:', refreshErr);
                }
            }, 2000);
        } catch (err) {
            console.error('Error cancelling appointment:', err);
            setCancelError('Failed to cancel appointment. Please try again.');
            setCancelInProgress(false);
        }
    };

    // Calculate minutes from Y position in the grid
    const getTimeFromYPosition = (y, dayElement) => {
        const rect = dayElement.getBoundingClientRect();
        const relativeY = y - rect.top;
        const minutesFromStart = (relativeY / HOUR_HEIGHT) * 60;
        const hours = Math.floor(minutesFromStart / 60) + WORKING_HOURS_START;
        const minutes = Math.round((minutesFromStart % 60) / 5) * 5; // Round to nearest 5 minutes
        
        return new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate(),
            hours,
            minutes
        );
    };

    // Calculate block for the current drag operation
    const getDragBlock = () => {
        if (!dragStartTime || !dragCurrentTime || !dragDay) return null;
        
        let startTime = dragStartTime;
        let endTime = dragCurrentTime;
        
        // Ensure start time is before end time
        if (startTime > endTime) {
            [startTime, endTime] = [endTime, startTime];
        }
        
        // Ensure block has a minimum duration (15 minutes)
        const minDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
        if (endTime - startTime < minDuration) {
            endTime = new Date(startTime.getTime() + minDuration);
        }
        
        return {
            id: `temp-block-${Date.now()}`,
            start: startTime,
            end: endTime
        };
    };

    // Handle mouse down event on day column to start drag
    const handleMouseDown = (e, day) => {
        if (mode !== 'provider') return;
        
        // Prevent default to avoid text selection during drag
        e.preventDefault();
        
        // Make sure we clicked in the grid area, not on existing blocks
        if (e.target && e.target.closest('.availability-block, .appointment-block')) {
            return;
        }
        
        const dayElement = dayColumnsRef.current[format(day, 'yyyy-MM-dd')];
        if (!dayElement) return;
        
        const startTime = getTimeFromYPosition(e.clientY, dayElement);
        
        setIsDragging(true);
        setDragStartTime(startTime);
        setDragCurrentTime(startTime);
        setDragDay(day);
        
    };

    // Auto-scroll function
    const autoScroll = (mouseY) => {
        if (!scrollContainerRef.current || !isDragging) {
            setAutoScrolling(false);
            scrollAnimationRef.current = null;
            return;
        }
        
        const scrollContainer = scrollContainerRef.current;
        const containerRect = scrollContainer.getBoundingClientRect();
        const scrollThreshold = 60;
        const scrollStep = 8; // Slightly increased to make scrolling more noticeable
        
        let scrollDirection = 0;
        
        // Calculate scroll direction based on mouse position
        if (mouseY < containerRect.top + scrollThreshold) {
            // Near top edge - scroll up
            scrollDirection = -scrollStep;
        } else if (mouseY > containerRect.bottom - scrollThreshold) {
            // Near bottom edge - scroll down
            scrollDirection = scrollStep;
        }
        
        if (scrollDirection !== 0) {
            // Apply the scroll
            scrollContainer.scrollTop += scrollDirection;
            
            // Update drag current time based on new scroll position
            if (dragDay) {
                const dayElement = dayColumnsRef.current[format(dragDay, 'yyyy-MM-dd')];
                if (dayElement) {
                    const newY = (mouseY < containerRect.top + scrollThreshold) ? 
                        containerRect.top + 10 : containerRect.bottom - 10;
                    const newTime = getTimeFromYPosition(newY, dayElement);
                    setDragCurrentTime(newTime);
                }
            }
            
            // Continue the animation
            scrollAnimationRef.current = requestAnimationFrame(() => autoScroll(mouseY));
        } else {
            setAutoScrolling(false);
            scrollAnimationRef.current = null;
        }
    };

    // Render the time blocks during dragging operation
    const renderDragIndicator = (day) => {
        if (!isDragging || !dragDay) return null;
        
        // Only render in the correct day column
        if (format(day, 'yyyy-MM-dd') !== format(dragDay, 'yyyy-MM-dd')) return null;
        
        const dragBlock = getDragBlock();
        if (!dragBlock) return null;
        
        const startMinutes = dragBlock.start.getHours() * 60 + dragBlock.start.getMinutes();
        const endMinutes = dragBlock.end.getHours() * 60 + dragBlock.end.getMinutes();
        
        const top = ((startMinutes / 60) - WORKING_HOURS_START) * HOUR_HEIGHT;
        const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
        
        return (
            <Box
                key="drag-block"
                sx={{
                    position: 'absolute',
                    top: `${top}px`,
                    height: `${height}px`,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(144, 202, 249, 0.5)',
                    border: '2px dashed #1976d2',
                    borderRadius: '4px',
                    zIndex: 5,
                    pointerEvents: 'none' // Make sure the drag block doesn't interfere with mouse events
                }}
            >
                <Typography variant="caption" sx={{ fontSize: '0.7rem', p: 1 }}>
                    {format(dragBlock.start, 'h:mm a')} - {format(dragBlock.end, 'h:mm a')}
                </Typography>
            </Box>
        );
    };
    
    // Memoize the appointment block rendering for better performance
    const renderTimeBlock = (day, hour) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const blocks = timeBlocks[dateStr] || [];
        const dayAppointments = getAppointmentsForDay(day);
        const providerDayAppointments = getProviderAppointmentsForDay(day);
        const allAppointments = [...dayAppointments, ...providerDayAppointments];

        // Find all availability blocks that overlap this hour
        const hourStart = new Date(day);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(day);
        hourEnd.setHours(hour + 1, 0, 0, 0);

        // Collect availability segments for this hour
        const availabilitySegments = [];
        blocks.forEach(block => {
            const blockStart = block.start instanceof Date ? block.start : new Date(block.start);
            const blockEnd = block.end instanceof Date ? block.end : new Date(block.end);

            // Skip blocks that don't overlap this hour at all
            if (!areIntervalsOverlapping({ start: blockStart, end: blockEnd }, { start: hourStart, end: hourEnd })) return;

            // Provider view: render a SINGLE segment for the entire block (slightly wider background)
            if (mode === 'provider') {
                // Only push once – when we're at the hour that contains the block start time.
                if (hour !== blockStart.getHours()) return;

                // Determine if block is fully booked
                const overlappingApts = allAppointments.filter(apt => {
                    // Include all appointments (including cancelled ones) for checking overlap
                    const aptStart = new Date(apt.start_time);
                    const aptEnd = new Date(apt.end_time);
                    return areIntervalsOverlapping({ start: blockStart, end: blockEnd }, { start: aptStart, end: aptEnd });
                });

                const blockDurationMin = (blockEnd - blockStart) / 60000;
                let bookedMin = 0;
                
                // Only count non-cancelled appointments towards "fully booked" calculation
                overlappingApts.filter(apt => apt.status !== 'cancelled').forEach(apt => {
                    const aptStart = new Date(apt.start_time);
                    const aptEnd = new Date(apt.end_time);
                    const overlapStart = aptStart > blockStart ? aptStart : blockStart;
                    const overlapEnd = aptEnd < blockEnd ? aptEnd : blockEnd;
                    if (overlapEnd > overlapStart) {
                        bookedMin += (overlapEnd - overlapStart) / 60000;
                    }
                });

                const fullyBooked = bookedMin >= blockDurationMin - 1; // small tolerance

                availabilitySegments.push({ start: blockStart, end: blockEnd, block, fullyBooked });
            } else {
                // Consumer view – split the block into open segments around appointments
                // For consumer view, only non-cancelled appointments should block availability
                const overlappingApts = allAppointments.filter(apt => {
                    if (apt.status === 'cancelled') return false; // Ignore cancelled appointments for availability
                    const aptStart = new Date(apt.start_time);
                    const aptEnd = new Date(apt.end_time);
                    return areIntervalsOverlapping({ start: blockStart, end: blockEnd }, { start: aptStart, end: aptEnd });
                });

                if (overlappingApts.length === 0) {
                    availabilitySegments.push({ start: blockStart, end: blockEnd, block });
                } else {
                    let segments = [];
                    let currentStart = blockStart;
                    const sortedApts = overlappingApts.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
                    sortedApts.forEach(apt => {
                        const aptStart = new Date(apt.start_time);
                        const aptEnd = new Date(apt.end_time);
                        if (currentStart < aptStart) {
                            segments.push({ start: currentStart, end: aptStart, block });
                        }
                        currentStart = aptEnd > currentStart ? aptEnd : currentStart;
                    });
                    if (currentStart < blockEnd) {
                        segments.push({ start: currentStart, end: blockEnd, block });
                    }
                    segments.forEach(seg => {
                        if (areIntervalsOverlapping({ start: seg.start, end: seg.end }, { start: hourStart, end: hourEnd })) {
                            availabilitySegments.push(seg);
                        }
                    });
                }
            }
        });

        // Render all availability segments for this hour
        const availabilityBlocks = availabilitySegments.map((seg, idx) => {
            const startMinutes = seg.start.getHours() * 60 + seg.start.getMinutes();
            const endMinutes = seg.end.getHours() * 60 + seg.end.getMinutes();
            const top = ((startMinutes / 60) - WORKING_HOURS_START) * HOUR_HEIGHT;
            const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
            return (
                <Box
                    key={`block-${seg.block.id}-${hour}-${idx}`} // Remove forceUpdate from key
                    className="availability-block"
                    sx={{
                        ...getBlockStyle(seg.block, false, null),
                        position: 'absolute',
                        top: `${top}px`,
                        height: `${height}px`,
                        zIndex: 3,
                        width: mode === 'provider' ? 'calc(100% - 30px)' : 'calc(100% - 38px)',
                        left: mode === 'provider' ? 0 : '4px'
                    }}
                    onClick={() => {
                        if (mode === 'provider') {
                            handleEditBlock(day, seg.block);
                        } else if (mode === 'consumer' && onBlockClick) {
                            onBlockClick(seg.block);
                        }
                    }}
                >
                    {seg.block.discountPercentage > 0 ? (
                        <>
                            <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'inherit', width: '100%', textAlign: 'center', mb: 0.5, lineHeight: 1 }}>
                                Discounted
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.85rem', color: 'inherit', width: '100%', textAlign: 'center', lineHeight: 1 }}>
                                <span style={{ textDecoration: 'line-through', color: '#e0e0e0', marginRight: 4 }}>${seg.block.originalPrice}</span>
                                <span style={{ color: '#ffd200', fontWeight: 700 }}>${seg.block.discountedPrice}</span>
                            </Typography>
                        </>
                    ) : (
                        // Show "Available" text conditionally to avoid repetition in provider view
                        (!(mode === 'provider' && seg.fullyBooked)) && (
                            <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'inherit', width: '100%', textAlign: 'center', lineHeight: 1 }}>
                                Available{mode === 'consumer' && service ? `  $${service.price}` : ''}
                            </Typography>
                        )
                    )}
                    {mode === 'provider' && (
                        <Box sx={{ position: 'absolute', right: 4, top: 4, display: 'flex', gap: 0.5 }}>
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditBlock(day, seg.block);
                                }}
                                sx={{ 
                                    p: 0.5,
                                    color: 'inherit',
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                                }}
                            >
                                <EditIcon sx={{ fontSize: '0.8rem' }} />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBlockClick(day, seg.block);
                                }}
                                sx={{ 
                                    p: 0.5,
                                    color: 'inherit',
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                                }}
                            >
                                <DeleteIcon sx={{ fontSize: '0.8rem' }} />
                            </IconButton>
                        </Box>
                    )}
                </Box>
            );
        });

        // Render all appointments for this hour (on top), including cancelled ones
        const appointmentBlocks = allAppointments
            .filter(apt => {
                const aptStart = new Date(apt.start_time);
                const aptEnd = new Date(apt.end_time);
                // Only filter by time overlap, not by status - we want to show ALL appointments including cancelled ones
                const overlaps = areIntervalsOverlapping({ start: aptStart, end: aptEnd }, { start: hourStart, end: hourEnd });
                
                if (apt.status === 'cancelled') {
                }
                
                return overlaps;
            })
            .map((apt, idx) => {
                const startTime = new Date(apt.start_time);
                const endTime = new Date(apt.end_time);
                const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
                const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
                const top = ((startMinutes / 60) - WORKING_HOURS_START) * HOUR_HEIGHT;
                const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
                
                // Debug log for appointment rendering
                if (apt.status === 'cancelled') {
                    // Console log removed
                }
                
                return (
                    <Box
                        key={`appointment-${dateStr}-${apt.id}-${hour}-${idx}`} // Remove forceUpdate from key
                        className={`appointment-block status-${apt.status}`}
                        sx={{
                            ...getBlockStyle({}, false, apt),
                            position: 'absolute',
                            top: `${top}px`,
                            height: `${height}px`,
                            width: mode === 'provider' ? 'calc(100% - 46px)' : 'calc(100% - 38px)',
                            left: mode === 'provider' ? '8px' : '4px',
                            minHeight: '32px',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            px: 1,
                            // Make cancelled appointments more visible
                            ...(apt.status === 'cancelled' && {
                                boxShadow: '0 0 0 1px #f5c6cb',
                                border: '2px solid #f5c6cb',
                            })
                        }}
                        onClick={() => {
                            if (mode === 'provider') {
                                handleProviderAppointmentClick(apt);
                            } else {
                                handleAppointmentClick(apt);
                            }
                        }}
                    >
                        <Typography variant="caption" sx={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: 'inherit',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textDecoration: apt.status === 'cancelled' ? 'line-through' : 'none' // Add strikethrough for cancelled
                        }}>
                            {apt.service?.name || 'Booked'}
                        </Typography>
                        {apt.consumer?.username && (
                            <Typography variant="caption" sx={{
                                fontSize: '0.8rem',
                                color: 'inherit',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                ml: 1,
                                textDecoration: apt.status === 'cancelled' ? 'line-through' : 'none' // Add strikethrough for cancelled
                            }}>
                                {apt.consumer.username}
                            </Typography>
                        )}
                        {apt.status === 'cancelled' && (
                            <Box sx={{
                                position: 'absolute',
                                bottom: '3px',
                                right: '3px',
                                fontSize: '0.6rem',
                                fontWeight: 'bold',
                                backgroundColor: 'rgba(255,255,255,0.7)',
                                color: '#721c24',
                                padding: '1px 3px',
                                borderRadius: '2px'
                            }}>
                                CANCELLED
                            </Box>
                        )}
                    </Box>
                );
            });

        // Always return both as a fragment
        return <>{[...availabilityBlocks, ...appointmentBlocks]}</>;
    };
    
    const handleEditBlock = (day, block, event) => {
        if (mode !== 'provider') return;
        
        // Stop event propagation to prevent other handlers from firing
        if (event) {
            event.stopPropagation();
        }
        
        
        setSelectedDay(day);
        setEditingBlock(block);
        
        // Set times for the edit dialog - ensure we're working with Date objects
        const blockStart = block.start instanceof Date ? block.start : new Date(block.start);
        const blockEnd = block.end instanceof Date ? block.end : new Date(block.end);
        
        setStartTime(blockStart);
        setEndTime(blockEnd);
        setTimeError('');
        setEditDialogOpen(true);
    };
    
    const handleCloseEditDialog = () => {
        setEditDialogOpen(false);
        setEditingBlock(null);
    };
    
    const handleSaveEditedBlock = () => {
        if (mode !== 'provider' || !editingBlock) {
            return;
        }
        
        if (!startTime || !endTime) {
            setTimeError('Both start and end times are required');
            return;
        }
        
        // Create time objects using the same date for comparison
        const startHours = startTime.getHours();
        const startMinutes = startTime.getMinutes();
        const endHours = endTime.getHours();
        const endMinutes = endTime.getMinutes();
        
        // Check if end time is earlier than start time
        if (endHours < startHours || (endHours === startHours && endMinutes <= startMinutes)) {
            setTimeError('End time must be after start time');
            return;
        }
        
        
        const dateStr = format(selectedDay, 'yyyy-MM-dd');
        
        // Create updated block with same ID but new times
        const updatedBlock = {
            id: editingBlock.id,
            start: new Date(
                selectedDay.getFullYear(),
                selectedDay.getMonth(),
                selectedDay.getDate(),
                startHours,
                startMinutes
            ),
            end: new Date(
                selectedDay.getFullYear(),
                selectedDay.getMonth(),
                selectedDay.getDate(),
                endHours,
                endMinutes
            )
        };
        
        
        // Get existing blocks for this day and replace the one being edited
        const existingBlocks = timeBlocks[dateStr] || [];
        const updatedBlocks = existingBlocks.map(block => 
            block.id === editingBlock.id ? updatedBlock : block
        ).sort((a, b) => 
            (a.start instanceof Date ? a.start : new Date(a.start)).getTime() - 
            (b.start instanceof Date ? b.start : new Date(b.start)).getTime()
        );
        
        const newAvailability = {
            ...timeBlocks,
            [dateStr]: updatedBlocks
        };
        
        setTimeBlocks(newAvailability);
        setEditDialogOpen(false);
        setEditingBlock(null);
        
        // Notify parent component if callback provided
        if (onAvailabilityChange) {
            onAvailabilityChange(newAvailability);
        }
    };
    
    const handleDeleteBlockClick = (day, block, event) => {
        if (mode !== 'provider') return;
        
        // Stop event propagation to prevent other handlers from firing
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        setSelectedDay(day);
        setDeletingBlock(block);
        setDeleteDialogOpen(true);
    };
    
    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setDeletingBlock(null);
    };
    
    const handleConfirmDeleteBlock = () => {
        if (mode !== 'provider' || !deletingBlock) return;
        
        const dateStr = format(selectedDay, 'yyyy-MM-dd');
        
        // Create a deep copy of the current timeBlocks state
        const updatedTimeBlocks = { ...timeBlocks };
        
        // Make sure we have an array for this date
        if (!updatedTimeBlocks[dateStr] || !Array.isArray(updatedTimeBlocks[dateStr])) {
            setDeleteDialogOpen(false);
            setDeletingBlock(null);
            return;
        }
        
        // Get existing blocks and filter out the one to delete
        const existingBlocks = updatedTimeBlocks[dateStr];
        
        const updatedBlocks = existingBlocks.filter(block => {
            const blocksAreDifferent = block.id !== deletingBlock.id;
            if (!blocksAreDifferent) {
            }
            return blocksAreDifferent;
        });
        
        
        // Update the timeBlocks state with the filtered array
        updatedTimeBlocks[dateStr] = updatedBlocks;
        
        setTimeBlocks(updatedTimeBlocks);
        
        // First close the dialog and clear the deleting state
        setDeleteDialogOpen(false);
        setDeletingBlock(null);
        
        // Then notify parent component with the updated blocks
        if (onAvailabilityChange) {
            // Use the timeBlocks copy directly to ensure the right data is passed
            onAvailabilityChange(updatedTimeBlocks);
        }
    };
    
    // Handle mouse move event to update drag block and possibly trigger auto-scroll
    const handleMouseMove = useCallback((e) => {
        if (!isDragging || !dragDay) return;
        
        // More aggressive throttling to prevent excessive updates
        if (dragThrottleRef.current) return;
        dragThrottleRef.current = true;
        
        setTimeout(() => {
            dragThrottleRef.current = false;
        }, 50); // Increase throttle time from 16ms to 50ms for smoother performance
        
        const dayElement = dayColumnsRef.current[format(dragDay, 'yyyy-MM-dd')];
        if (!dayElement) return;
        
        const currentTime = getTimeFromYPosition(e.clientY, dayElement);
        setDragCurrentTime(currentTime);
        
        // Check if we need to start auto-scrolling
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const mousePosY = e.clientY;
            const scrollThreshold = 60;
            
            // If mouse is near the top or bottom edge
            if (mousePosY < containerRect.top + scrollThreshold || 
                mousePosY > containerRect.bottom - scrollThreshold) {
                
                if (!autoScrolling) {
                    setAutoScrolling(true);
                    if (scrollAnimationRef.current) {
                        cancelAnimationFrame(scrollAnimationRef.current);
                    }
                    scrollAnimationRef.current = requestAnimationFrame(() => autoScroll(e.clientY));
                }
            } else {
                // Stop auto-scrolling if mouse is back in safe area
                if (autoScrolling) {
                    setAutoScrolling(false);
                    if (scrollAnimationRef.current) {
                        cancelAnimationFrame(scrollAnimationRef.current);
                        scrollAnimationRef.current = null;
                    }
                }
            }
        }
    }, [isDragging, dragDay, autoScrolling]);

    // Handle mouse up event to finalize the block
    const handleMouseUp = () => {
        // Cancel any ongoing auto-scroll
        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            setAutoScrolling(false);
        }
        
        if (!isDragging || !dragDay) {
            setIsDragging(false);
            setDragStartTime(null);
            setDragCurrentTime(null);
            setDragDay(null);
            return;
        }
        
        const dragBlock = getDragBlock();
        if (!dragBlock) {
            setIsDragging(false);
            setDragStartTime(null);
            setDragCurrentTime(null);
            setDragDay(null);
            return;
        }
        
        // Create the new availability block
        const dateStr = format(dragDay, 'yyyy-MM-dd');
        const existingBlocks = timeBlocks[dateStr] || [];
        
        // Check for overlaps with existing blocks
        const hasOverlap = existingBlocks.some(block => 
            areIntervalsOverlapping(
                { start: block.start instanceof Date ? block.start : new Date(block.start),
                end: block.end instanceof Date ? block.end : new Date(block.end) },
                { start: dragBlock.start, end: dragBlock.end }
            )
        );
        setDragStartTime(null);
        setDragCurrentTime(null);
        setDragDay(null);
        
        if (!hasOverlap) {
            // Add the new block with proper date from the dragDay
            const newBlock = {
                id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                start: new Date(
                    dragDay.getFullYear(),
                    dragDay.getMonth(),
                    dragDay.getDate(),
                    dragBlock.start.getHours(),
                    dragBlock.start.getMinutes()
                ),
                end: new Date(
                    dragDay.getFullYear(),
                    dragDay.getMonth(),
                    dragDay.getDate(),
                    dragBlock.end.getHours(),
                    dragBlock.end.getMinutes()
                )
            };
            
            
            const updatedBlocks = [...existingBlocks, newBlock].sort((a, b) => 
                (a.start instanceof Date ? a.start : new Date(a.start)).getTime() - 
                (b.start instanceof Date ? b.start : new Date(b.start)).getTime()
            );
            
            // Create a new timeBlocks object to ensure React detects the change
            const newTimeBlocks = {
                ...timeBlocks,
                [dateStr]: updatedBlocks
            };
            
            // Update the timeBlocks state
            setTimeBlocks(newTimeBlocks);
            
            // Log current state
            setTimeout(() => {
            }, 100);
            
            // Notify parent component
            if (onAvailabilityChange) {
                
                // Use the newTimeBlocks variable directly instead of accessing state
                // which might not have been updated yet
                onAvailabilityChange(newTimeBlocks);
            } else {
                console.warn('No onAvailabilityChange callback provided, changes will not persist');
            }
        }
    };

    // Consolidated useEffect for data refresh
    useEffect(() => {
        if (forceUpdate > 0) {
            // Create a debounced refresh to avoid multiple refreshes
            const refreshTimeout = setTimeout(async () => {
                if (mode === 'provider' && providerId) {
                    try {
                        await Promise.all([
                            fetchProviderAppointments(),
                            fetchProviderAvailability(providerId)
                        ]);
                    } catch (err) {
                        // Silently handle error, don't trigger more state updates
                    }
                } else if (mode === 'consumer') {
                    try {
                        const updatedAppointments = await fetchUserAppointments();
                        
                        // Only update state if needed for cancelled appointments
                        if (updatedAppointments && updatedAppointments.length > 0) {
                            setUserAppointments(updatedAppointments);
                        }
                        
                        // Refresh availability if we have a service ID
                        if (serviceId) {
                            await fetchServiceAvailability(serviceId);
                        }
                    } catch (err) {
                        // Silently handle error, don't trigger more state updates
                    }
                }
            }, 300); // Add a small debounce delay
            
            return () => clearTimeout(refreshTimeout);
        }
    }, [forceUpdate, mode, providerId, serviceId]);

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
            overflow: 'hidden',
            mr: 0,
            minHeight: '580px' // Add a minimum height to ensure proper display
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                {/* Only show title if we're in provider mode or no service is provided */}
                {(mode === 'provider' || !service) && (
                    <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                        {title || (mode === 'provider' ? 'Your Availability' : '')}
                    </Typography>
                )}
                {/* Empty space div to maintain layout when title is hidden */}
                {mode === 'consumer' && service && (
                    <div></div>
                )}
                {/* Save Availability button removed */}
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
            
            {/* Fixed header row to remain visible during vertical scroll */}
            <Box sx={{ display: 'flex', width: 'max-content', position: 'sticky', top: 0, zIndex: 500 }}>
                {/* Spacer for time labels column */}
                <Box sx={{ width: '25px', flexShrink: 0 }} />
                {days.map((day, index) => (
                    <Box
                        key={`fixed-header-${index}`}
                        sx={{
                            width: '250px',
                            minWidth: '250px',
                            bgcolor: 'primary.main',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '39px',
                            borderRight: index < days.length - 1 ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            marginRight: index < days.length - 1 ? '8px' : 0
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                            {format(day, 'EEE, MMM d')}
                        </Typography>
                    </Box>
                ))}
            </Box>
            
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
                    <Box 
                      ref={scrollContainerRef}
                      sx={{ display: 'flex', 
                        flexDirection: 'row',
                        width: 'max-content',
                        height: '480px',
                        overflow: 'auto',
                        position: 'relative'
                      }}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseLeave}
                    >
                        { /* Time labels column - inside the scrollable area */ }
                        <Box sx={{ width: '25px', flexShrink: 0, position: 'sticky', left: 0, zIndex: 5, bgcolor: '#f5f5f5'   }}>
                            { /* Day header placeholder to align with day columns */ }
                            <Box sx={{ 
                                height: '39px', 
                                borderBottom: '2px solid rgba(0, 0, 0, 0.1)', 
                                position: 'sticky',
                                top: 0,
                                zIndex: 200,
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
                            width: 'max-content',
                            position: 'relative'
                        }}>
                            {days.map((day, index) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const flexBasis = '250px';
                                
                                return (
                                    <Box key={index} sx={{ 
                                        flex: `0 0 ${flexBasis}`,
                                        minWidth: flexBasis,
                                        marginRight: index < days.length - 1 ? '8px' : 0,
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        bgcolor: index % 2 === 0 ? 'rgba(0, 0, 0, 0.01)' : 'transparent', // Alternate background colors
                                        ...(index < days.length - 1 && { borderRight: '1px solid rgba(0, 0, 0, 0.12)' }) // Simple border approach
                                    }}>
                                        { /* Day header - sticky at top with higher z-index */ }
                                        <Box sx={{ 
                                           py: 0.5, 
                                           px: 0.6, 
                                           bgcolor: 'primary.main', 
                                           color: 'white', 
                                           borderRadius: '4px 4px 0 0', 
                                           display: 'none', /* hide duplicate header */
                                           justifyContent: 'space-between', 
                                           alignItems: 'center', 
                                           position: 'sticky', 
                                           top: 0, 
                                           zIndex: 300, /* ensure always on top */
                                           height: '39px', 
                                           borderBottom: '2px solid rgba(255, 255, 255, 0.2)', 
                                           boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                                        }}>
                                            <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
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
                                                    <AddIcon sx={{ fontSize: '1rem' }} />
                                                </Button>
                                            )}
                                        </Box>
                                        { /* Day time grid */ }
                                        <Box 
                                            ref={el => dayColumnsRef.current[dateStr] = el}
                                            sx={{ 
                                                position: 'relative',
                                                height: (WORKING_HOURS_END - WORKING_HOURS_START) * HOUR_HEIGHT,
                                                minHeight: (WORKING_HOURS_END - WORKING_HOURS_START) * HOUR_HEIGHT,
                                                width: '100%',
                                                flex: 1,
                                                paddingRight: index < days.length - 1 ? '1rem' : 0, // Add padding to the right for columns with separators
                                                zIndex: 10, // Lower z-index so content scrolls behind headers
                                                borderRight: 'none',
                                                cursor: mode === 'provider' ? 'pointer' : 'default' // Show pointer cursor in provider mode
                                            }}
                                            onMouseDown={(e) => handleMouseDown(e, day)}
                                        >
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
                                            
                                            {/* Render drag indicator during dragging */}
                                            {isDragging && format(dragDay, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') && (
                                                renderDragIndicator(day)
                                            )}
                                            
                                            {/* Time blocks for available slots */}
                                            {renderTimeBlock(day, 5)}
                                            {renderTimeBlock(day, 6)}
                                            {renderTimeBlock(day, 7)}
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
                                            {renderTimeBlock(day, 20)}
                                            {renderTimeBlock(day, 21)}
                                            {renderTimeBlock(day, 22)}
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
                    <Box sx={{ display: 'flex', mt: 2, gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, 
                                height: 12, 
                                backgroundColor: '#232a5c', 
                                display: 'inline-block', 
                                mr: 1, 
                                border: '1px solid #232a5c' 
                              }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Available Slots
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, 
                                height: 12, 
                                backgroundColor: '#388e3c', 
                                display: 'inline-block', 
                                mr: 1, 
                                border: '1px solid #388e3c' 
                              }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Discounted Slots
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
                                Confirmed Appointments
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, 
                                height: 12, 
                                backgroundColor: '#f8d7da', 
                                display: 'inline-block', 
                                mr: 1, 
                                border: '1px solid #f5c6cb' 
                              }}></Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Cancelled Appointments
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            )}
            
            { /* Provider mode legend */ }
            {mode === 'provider' && (
                <Box sx={{ mt: 2, px: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Your availability is displayed with appointment bookings overlaid. Click and drag on the calendar to create new availability blocks.
                    </Typography>
                    <Box sx={{ display: 'flex', mt: 2, flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ width: 12, height: 12, backgroundColor: '#232a5c', display: 'inline-block', mr: 1, border: '1px solid #232a5c' }}></Box>
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
                <Dialog open={appointmentDetailsOpen} onClose={() => !cancelInProgress && !cancelSuccess && setAppointmentDetailsOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        {cancelSuccess ? "Appointment Status Updated" : "Appointment Details"}
                    </DialogTitle>
                    {cancelSuccess ? (
                        <DialogContent sx={{ pl: 4, pr: 2 }}>
                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                <CheckCircleIcon color="success" sx={{ fontSize: '3rem', mb: 2 }} />
                                <Typography variant="h6" gutterBottom>
                                    {updatedStatus === 'confirmed' 
                                        ? "The appointment has been confirmed successfully!" 
                                        : updatedStatus === 'cancelled'
                                        ? (mode === 'provider' 
                                            ? "The appointment has been cancelled successfully!" 
                                            : "Your appointment has been cancelled successfully!")
                                        : updatedStatus === 'completed'
                                        ? "The appointment has been marked as completed!"
                                        : "The appointment status has been updated successfully!"}
                                </Typography>
                            </Box>
                        </DialogContent>
                    ) : (
                        <DialogContent sx={{ pl: 4, pr: 2 }}>
                            {cancelError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {cancelError}
                                </Alert>
                            )}
                            <Box sx={{ mb: 2, alignItems: 'flex-start' }}>
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
                                    
                                    {/* Updated address section to show detailed address fields */}
                                    <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
                                        Address:
                                    </Typography>
                                    {selectedAppointment?.address_line1 && (
                                        <Typography variant="body2">
                                            {selectedAppointment.address_line1}
                                        </Typography>
                                    )}
                                    {selectedAppointment?.address_line2 && (
                                        <Typography variant="body2">
                                            {selectedAppointment.address_line2}
                                        </Typography>
                                    )}
                                    {(selectedAppointment?.city || selectedAppointment?.state || selectedAppointment?.zip_code) && (
                                        <Typography variant="body2">
                                            {[
                                                selectedAppointment.city, 
                                                selectedAppointment.state, 
                                                selectedAppointment.zip_code
                                            ].filter(Boolean).join(', ')}
                                        </Typography>
                                    )}
                                    {/* Fallback to legacy address field if detailed fields aren't available */}
                                    {!selectedAppointment?.address_line1 && selectedAppointment?.consumer?.address && (
                                        <Typography variant="body2">
                                            {selectedAppointment.consumer.address}
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
                        </DialogContent>
                    )}
                    
                    {/* Only show dialog actions (buttons) if we're not in success state */}
                    {!cancelSuccess && (
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
                            
                            {mode === 'provider' && selectedAppointment?.status === 'confirmed' && 
                             selectedAppointment?.end_time && new Date(selectedAppointment.end_time) <= new Date() && (
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
                    )}
                </Dialog>
            )}
            
            {/* Edit dialog for time blocks */}
            {mode === 'provider' && (
                <>
                    <Dialog open={editDialogOpen} onClose={handleCloseEditDialog}>
                        <DialogTitle>
                            Edit Time Block for {selectedDay && format(selectedDay, 'EEEE, MMMM d')}
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText sx={{ mb: 2 }}>
                                Update the available time block.
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
                                                // Create new date based on selectedDay (not today)
                                                const newTime = new Date(selectedDay);
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
                                                // Create new date based on selectedDay (not today)
                                                const newTime = new Date(selectedDay);
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
                            <Button onClick={handleCloseEditDialog}>Cancel</Button>
                            <Button onClick={handleSaveEditedBlock} color="primary" variant="contained">
                                Save Changes
                            </Button>
                        </DialogActions>
                    </Dialog>
                    
                    {/* Delete confirmation dialog */}
                    <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
                        <DialogTitle>
                            Delete Time Block
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                Are you sure you want to delete this availability block? 
                                {deletingBlock && (
                                    <Box component="span" sx={{ display: 'block', mt: 1, fontWeight: 'bold' }}>
                                        {deletingBlock.start instanceof Date 
                                            ? format(deletingBlock.start, 'h:mm a') 
                                            : format(new Date(deletingBlock.start), 'h:mm a')
                                        } - {
                                        deletingBlock.end instanceof Date 
                                            ? format(deletingBlock.end, 'h:mm a') 
                                            : format(new Date(deletingBlock.end), 'h:mm a')
                                        }
                                    </Box>
                                )}
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
                            <Button onClick={handleConfirmDeleteBlock} color="error" variant="contained">
                                Delete
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            )}
        </Box>
    );
});

// Add display name for DevTools
AppointmentCalendar.displayName = 'AppointmentCalendar';

export default AppointmentCalendar; 