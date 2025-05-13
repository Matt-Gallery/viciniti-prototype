import React, {   useState, useEffect, forwardRef, useImperativeHandle    } from 'react';
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
    Divider,
    Tooltip,
     } from '@mui/material';
import { LocalizationProvider      } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns      } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, areIntervalsOverlapping      } from 'date-fns';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { availability as availabilityApi, appointments as appointmentsApi      } from '../../services/api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const AppointmentCalendar = forwardRef(({ mode,
    onBlockClick,
    onAvailabilityChange,
    providerId,
    serviceId,
    service,
    timeBlocks,
    daysToShow = 5,
    title
 }, ref) => { const [selectedDay, setSelectedDay] = useState(new Date()');
    const [days, setDays] = useState([]);
    const [timeBlocks, setTimeBlocks] = useState({ });
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
    
    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({ fetchUserAppointments: async () =>{text.trim()}{end} await fetchUserAppointments();
         }
    }));
    
    // Generate days array (today + next N days)
    useEffect(() => { const newDays = [];
        for (let i = 0; i < daysToShow; i++) {
            newDays.push(addDays(new Date(), i));
         }
        setDays(newDays);
        
        // Initialize empty availability for each day
        const initialAvailability = {  };
        newDays.forEach(day => { const dateStr = format(day, 'yyyy-MM-dd'');
            initialAvailability[dateStr] = [];
         });
        
        setTimeBlocks(initialAvailability);
        
        // Load data based on mode
        if (mode === 'provider' && providerId) { fetchProviderAvailability(providerId');
            fetchProviderAppointments(); // Fetch provider's appointments
         } else if (mode === 'consumer' && serviceId) { fetchServiceAvailability(serviceId');
            fetchUserAppointments(); // Fetch user's existing appointments
         }
    }, [mode, providerId, serviceId, daysToShow]'); 

    // Rest of the component implementation would go here
    // ...

    return (
        <Box>
            { /* Component UI would go here */ }
            <Typography></Typography>
        </Box>
    );
});

// Add display name for DevTools
AppointmentCalendar.displayName = 'AppointmentCalendar';

export default AppointmentCalendar; 