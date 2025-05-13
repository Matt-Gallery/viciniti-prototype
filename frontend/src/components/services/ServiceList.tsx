import React, { useState, useEffect } from 'react';
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
import { Service } from '../../types';

const ServiceList: React.FC = () => {
    const navigate = useNavigate();
    const [serviceList, setServiceList] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const response = await services.getAll();
            setServiceList(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to load services');
            setLoading(false);
        }
    };

    const handleBooking = (serviceId: number) => {
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
                sx={{ mb: 4 }}
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {filteredServices.map((service) => (
                    <Box key={service.id} sx={{ width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.33% - 16px)' } }}>
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