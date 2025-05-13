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

const ServiceList = () => {
    const navigate = useNavigate();
    const [serviceList, setServiceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchServices = useCallback(async () => {
        try {
            const response = await services.getAll();
            setServiceList(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching services:', err);
            if (err.response && err.response.status === 401) {
                // If unauthorized, redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login', { replace: true });
            } else {
                setError('Failed to load service data');
                setLoading(false);
            }
        }
    }, [navigate, setServiceList, setLoading, setError]);

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            // If not logged in, redirect to login page
            navigate('/login', { replace: true });
            return;
        }
        
        fetchServices();
    }, [navigate, fetchServices]);

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
                Available Services
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
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Provider: {service.provider.business_name}
                                </Typography>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    onClick={() => handleBooking(service.id)}
                                >
                                    Book Now
                                </Button>
                            </CardContent>
                        </Card>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default ServiceList;