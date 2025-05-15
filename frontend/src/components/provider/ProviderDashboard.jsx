import React, { useState, useEffect } from 'react';
import { Box,
    Typography,
    Card,
    CardContent,
    Button,
    Tabs,
    Tab,
    CircularProgress,
    Alert,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { services as servicesApi, appointments as appointmentsApi, availability as availabilityApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import ProviderAvailabilityCalendar from './ProviderAvailabilityCalendar';
import ProximityDiscountConfig from './ProximityDiscountConfig';


const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} role="tabpanel">
        {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
);

const ProviderDashboard = () => { const [tabValue, setTabValue] = useState(0);
    const [serviceList, setServiceList] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [appointmentList, setAppointmentList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [availabilityView, setAvailabilityView] = useState(true);
    const [providerId, setProviderId] = useState(null);
    const [availabilityData, setAvailabilityData] = useState({});
    const navigate = useNavigate();

    useEffect(() => { fetchData();
     }, []);

    useEffect(() => { if (providerId) {
            console.log('Provider ID changed, fetching availability data for ID');
            fetchAvailabilityData(providerId);
         }
    }, [providerId]);

    const fetchData = async () => { try {
            // First try to load services
            const servicesRes = await servicesApi.getAll();
            setServiceList(servicesRes.data);
            
            // Then try to load appointments separately to handle potential 404
            try {
                const appointmentsRes = await appointmentsApi.getAll();
                setAppointmentList(appointmentsRes.data);
             } catch (appointmentErr) { console.warn('Could not load appointments');
                // Don't set error for appointment issues, just set empty array
                setAppointmentList([]);
             }
            
            // Get provider ID
            try { const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userData = JSON.parse(userStr);
                    console.log('User data from localStorage');
                    
                    if (userData.provider_profile && userData.provider_profile.id) {
                        console.log('Setting provider ID from profile data');
                        setProviderId(userData.provider_profile.id);
                     } else { // If provider_profile is not in the user data, fetch it explicitly
                        console.log('Provider profile not found in user data, fetching from API');
                        const profileResponse = await availabilityApi.getProviderProfile();
                        console.log('Provider profile API response');
                        
                        if (profileResponse.data && profileResponse.data.id) {
                            console.log('Setting provider ID from API');
                            setProviderId(profileResponse.data.id);
                            
                            // Update the user data in localStorage with the provider profile
                            userData.provider_profile = profileResponse.data;
                            localStorage.setItem('user', JSON.stringify(userData));
                         } else { console.error('Provider profile API response missing ID');
                            setError('Could not retrieve provider profile');
                         }
                    }
                } else { console.error('No user data found in localStorage');
                    setError('User data not found, please log in again');
                 }
            } catch (profileErr) { console.error('Error retrieving provider profile');
                setError('Failed to load provider profile');
             }
            
            setLoading(false);
        } catch (err) { console.error('Error loading dashboard');
            setError('Failed to load service data');
            setLoading(false);
         }
    };

    const fetchAvailabilityData = async (provId) => { try {
            console.log('Fetching availability data for provider ID');
            const response = await availabilityApi.getForProvider(provId);
            console.log('Availability data fetched');
            setAvailabilityData(response.data);
         } catch (error) { console.error('Error fetching availability data');
            setError("Failed to load availability data");
         }
    };

    const handleStatusChange = async (appointmentId, status) => {
        try {
            await appointmentsApi.updateStatus(appointmentId, status);
            fetchData(); // Refresh data
        } catch (err) {
            setError('Failed to update appointment status');
        }
    };

    const handleOpenDeleteDialog = (service, event) => { event.stopPropagation();
        setServiceToDelete(service);
        setDeleteDialogOpen(true);
     };

    const handleCloseDeleteDialog = () => { setDeleteDialogOpen(false);
        setServiceToDelete(null);
     };

    const handleDeleteService = async () => {
        if (!serviceToDelete) return;
        
        setDeleteLoading(true);
        try {
            await servicesApi.delete(serviceToDelete.id);
            setDeleteDialogOpen(false);
            setServiceToDelete(null);
            
            // Reset selected service if it was the one deleted
            if (selectedService && selectedService.id === serviceToDelete.id) {
                setSelectedService(null);
            }
            
            // Refresh the service list
            fetchData();
        } catch (err) {
            console.error('Error deleting service');
            setError('Failed to delete service. Please try again.');
            setDeleteLoading(false);
        }
    };
    
    const handleSelectService = (service) => { setSelectedService(service);
        setAvailabilityView(false);
     };
    
    const handleBackToAvailability = () => { setSelectedService(null);
        setAvailabilityView(true);
     };
    
    const handleAvailabilityChange = async (availability) => {
        console.log('Availability updated in ProviderDashboard:', availability);
        
        if (!providerId) {
            console.error('Cannot save availability: No provider ID available');
            setError('Provider ID not found. Please refresh the page.');
            return;
        }
        
        // Check if there are any actual time blocks to save
        const hasBlocks = Object.values(availability).some(blocks => blocks && blocks.length > 0);
        if (!hasBlocks) {
            console.log('No time blocks to save');
            return;
        }
        
        // Update local state immediately to keep UI in sync
        setAvailabilityData(availability);
        
        // Show a success message
        setError('');
        const successMessage = 'Availability saved successfully';
        setError(successMessage);
        setTimeout(() => {
            setError(prev => prev === successMessage ? '' : prev);
        }, 3000);
    };

    const handleCreateService = () => {
        navigate('/provider/services/create');
    };

    if (loading) { return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
     }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Provider Dashboard
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => navigate('/provider/profile')}
                >
                    Manage Profile
                </Button>
            </Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                    <Tab label="Services" />
                    <Tab label="Appointments" />
                    <Tab label="Discount Configuration" />
                </Tabs>
            </Box>
            <TabPanel value={tabValue} index={0}>
                <Box sx={{ display: 'flex', height: 'calc(100vh - 250px)' }}>
                    {/* Left Column - Service List (1/4 width) */}
                    <Box sx={{ width: '25%', borderRight: '1px solid rgba(0, 0, 0, 0.12)', pr: 2 }}>
                        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">
                                Your Services
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                onClick={handleCreateService}
                                startIcon={<AddIcon />}
                            >
                                New
                            </Button>
                        </Box>
                        {serviceList.length > 0 ? (
                            <List sx={{ bgcolor: 'background.paper', borderRadius: 1, overflow: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                                {serviceList.map((service) => (
                                    <React.Fragment key={service.id}>
                                        <ListItem 
                                            component="div"
                                            sx={{ 
                                                cursor: 'pointer',
                                                bgcolor: selectedService?.id === service.id ? 'action.selected' : 'transparent',
                                                '&:hover': { bgcolor: 'action.hover' }
                                            }}
                                            onClick={() => handleSelectService(service)}
                                        >
                                            <ListItemText
                                                primary={service.name}
                                                secondary={`$${service.price} · ${service.duration} min`}
                                            />
                                            <ListItemSecondaryAction>
                                                <IconButton edge="end" onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/provider/services/edit/${service.id}`);
                                                }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton edge="end" onClick={(e) => handleOpenDeleteDialog(service, e)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                        <Divider variant="fullWidth" component="li" />
                                    </React.Fragment>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="body1" color="text.secondary">
                                    You haven't created any services yet.
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    { /* Right Column - Service Details or Availability Calendar (3/4 width) */ }
                    <Box sx={{ width: '75%', pl: 2 }}>
                        { selectedService && !availabilityView ? (
                            <Box>
                                <Box sx={{ mb: 2 }}>
                                    <Button 
                                        variant="text" 
                                        color="primary" 
                                        onClick={handleBackToAvailability}
                                    >
                                        ← Back to Availability Calendar
                                    </Button>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Typography variant="h5" component="div">
                                        {selectedService.name}
                                    </Typography>
                                    <Box>
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            size="small"
                                            sx={{ mr: 1 }}
                                            onClick={() => navigate(`/provider/services/edit/${selectedService.id}`)}
                                            startIcon={<EditIcon />}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            onClick={(e) => handleOpenDeleteDialog(selectedService, e)}
                                            startIcon={<DeleteIcon />}
                                        >
                                            Delete
                                        </Button>
                                    </Box>
                                </Box>
                                <Box>
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body1" color="text.secondary" paragraph>
                                            {selectedService.description}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', mb: 2 }}>
                                        <Box sx={{ mr: 2 }}>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Price
                                            </Typography>
                                            <Typography variant="h6">
                                                ${selectedService.price}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Duration
                                            </Typography>
                                            <Typography variant="h6">
                                                {selectedService.duration} minutes
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle1" gutterBottom>
                                            Category
                                        </Typography>
                                        <Typography variant="body1">
                                            {selectedService.category.split('_').map(word => 
                                                word.charAt(0).toUpperCase() + word.slice(1)
                                            ).join(' > ')}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        ) : (
                            <ProviderAvailabilityCalendar 
                                onAvailabilityChange={handleAvailabilityChange}
                                providerId={providerId || undefined}
                                initialTimeBlocks={availabilityData} 
                            />
                        )}
                    </Box>
                </Box>
            </TabPanel>
            <TabPanel value={ tabValue } index={ 1 }>
                <Stack spacing={ 3 }>
                    { appointmentList.length > 0 ? (
                        appointmentList.map((appointment) => (
                            <Box key={appointment.id}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            {appointment.service.name}
                                        </Typography>
                                        <Typography variant="body1">
                                            Client: {appointment.consumer.username}
                                        </Typography>
                                        <Typography variant="body1">
                                            Date: {new Date(appointment.start_time).toLocaleDateString()}
                                        </Typography>
                                        <Typography variant="body1">
                                            Time: {new Date(appointment.start_time).toLocaleTimeString()} - {new Date(appointment.end_time).toLocaleTimeString()}
                                        </Typography>
                                        <Typography variant="body1" color="primary">
                                            Status: {appointment.status}
                                        </Typography>
                                        <Box sx={{mt: 2, display: 'flex', gap: 2}}>
                                            {appointment.status === 'pending' && (
                                                <Box sx={{display: 'flex', gap: 1}}>
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                                                    >
                                                        Confirm
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        color="error"
                                                        onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </Box>
                                            )}
                                            {appointment.status === 'confirmed' && (
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    onClick={() => handleStatusChange(appointment.id, 'completed')}
                                                >
                                                    Mark as Completed
                                                </Button>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Box>
                        ))
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="body1" color="text.secondary">
                                No appointments found. When customers book your services, they will appear here.
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
                <ProximityDiscountConfig />
            </TabPanel>
            { /* Delete Confirmation Dialog */ }
            <Dialog
                open={ deleteDialogOpen }
                onClose={ handleCloseDeleteDialog }
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    Confirm Delete Service
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Are you sure you want to delete "{ serviceToDelete?.name }"? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={ handleCloseDeleteDialog } disabled={ deleteLoading }>
                        Cancel
                    </Button>
                    <Button 
                        onClick={ handleDeleteService } 
                        color="error" 
                        variant="contained"
                        disabled={ deleteLoading }
                        autoFocus
                    >
                        { deleteLoading ? <CircularProgress size={24 } /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProviderDashboard; 