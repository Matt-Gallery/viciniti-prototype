import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    CircularProgress,
    Alert,
} from '@mui/material';
import { services } from '../../services/api';
import { api } from '../../services/api';

const ServiceList = () => {
    const navigate = useNavigate();
    const [serviceList, setServiceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [userType, setUserType] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const fetchServices = useCallback(async () => {
        if (!isInitialized) return;
        
        setLoading(true);
        try {
            const response = await services.getAll();
            setServiceList(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching services:', error);
            setError('Failed to load services');
        } finally {
            setLoading(false);
        }
    }, [isInitialized]);

    useEffect(() => {
        const initializeUserData = async () => {
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userData = JSON.parse(userStr);
                    setUserType(userData.user_type);
                    
                    if (userData.user_type === 'provider' && !userData.provider_profile) {
                        // Fetch provider profile if not available
                        await api.get('/provider/profile/');
                    }
                }
                setIsInitialized(true);
            } catch (error) {
                console.error('Error initializing user data:', error);
                setError('Failed to load user data');
                setIsInitialized(true);
            }
        };

        initializeUserData();
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleBooking = (serviceId) => {
        navigate(`/services/${serviceId}/book`);
    };

    const filteredServices = serviceList.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                {userType === 'provider' ? 'My Services' : 'Available Services'}
            </Typography>
            <TextField
                fullWidth
                label="Search services"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 2 }}
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {filteredServices.map((service) => (
                    <Box key={service.id} sx={{ width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33% - 16px)' } }}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {service.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    {service.description}
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    Duration: {service.duration} minutes
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    Price: ${service.price}
                                </Typography>
                                {userType !== 'provider' && service.provider && (
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Provider: {service.provider.business_name}
                                    </Typography>
                                )}
                                {userType !== 'provider' && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        onClick={() => handleBooking(service.id)}
                                    >
                                        Book Now
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default ServiceList;