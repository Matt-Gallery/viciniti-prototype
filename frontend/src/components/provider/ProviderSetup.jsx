import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Alert,
    CircularProgress,
    Grid
} from '@mui/material';
import { providers } from '../../services/api';

const ProviderSetup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        business_name: '',
        business_description: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        service_radius: 10
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Try to pre-populate with user address data
    useEffect(() => {
        try {
            const userString = localStorage.getItem('user');
            if (userString) {
                const userData = JSON.parse(userString);
                setFormData(prev => ({
                    ...prev,
                    address_line1: userData.street_address || '',
                    address_line2: userData.apartment || '',
                    city: userData.city || '',
                    state: userData.state || '',
                    postal_code: userData.zip_code || ''
                }));
            }
        } catch (error) {
            console.error('Error loading user data');
        }
    }, []);

    const handleTextChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log('Submitting provider setup');
            
            // Use the providers.setup function
            const response = await providers.setup(formData);
            console.log('Provider setup success');
            
            // Update user data in localStorage
            try {
                const userString = localStorage.getItem('user');
                if (userString) {
                    const userData = JSON.parse(userString);
                    userData.has_provider_profile = true;
                    localStorage.setItem('user', JSON.stringify(userData));
                }
            } catch (error) {
                console.error('Error updating user data');
            }

            // On success, navigate to provider dashboard
            navigate('/provider/dashboard');
        } catch (err) {
            console.error('Provider setup error');
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError('Failed to set up provider profile. Please try again.');
            }
            setLoading(false);
        }
    };

    return (
        <Box maxWidth="md" mx="auto" mt={4}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Set Up Provider Profile
                </Typography>
                <Typography variant="body1" paragraph>
                    Before you can create services, please set up your provider profile with your business details.
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Business Name"
                        name="business_name"
                        value={formData.business_name || ''}
                        onChange={handleTextChange}
                        margin="normal"
                        required
                    />

                    <TextField
                        fullWidth
                        label="Business Description"
                        name="business_description"
                        value={formData.business_description || ''}
                        onChange={handleTextChange}
                        margin="normal"
                        multiline
                        rows={4}
                        required
                    />
                    
                    <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                        Business Address
                    </Typography>

                    <TextField
                        fullWidth
                        label="Street Address"
                        name="address_line1"
                        value={formData.address_line1 || ''}
                        onChange={handleTextChange}
                        margin="normal"
                    />

                    <TextField
                        fullWidth
                        label="Apartment/Suite/Unit (optional)"
                        name="address_line2"
                        value={formData.address_line2 || ''}
                        onChange={handleTextChange}
                        margin="normal"
                    />

                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={12} sm={5}>
                            <TextField
                                fullWidth
                                label="City"
                                name="city"
                                value={formData.city || ''}
                                onChange={handleTextChange}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="State"
                                name="state"
                                value={formData.state || ''}
                                onChange={handleTextChange}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="ZIP Code"
                                name="postal_code"
                                value={formData.postal_code || ''}
                                onChange={handleTextChange}
                                margin="normal"
                            />
                        </Grid>
                    </Grid>

                    <TextField
                        fullWidth
                        label="Service Radius (miles)"
                        name="service_radius"
                        type="number"
                        value={formData.service_radius || 10}
                        onChange={handleTextChange}
                        margin="normal"
                        InputProps={{ inputProps: { min: 1, max: 100 } }}
                    />

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Complete Setup'}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/login')}
                        >
                            Cancel
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default ProviderSetup; 