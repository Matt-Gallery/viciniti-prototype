import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Alert,
    CircularProgress,
} from '@mui/material';
import { providers } from '../../services/api';

const ProviderSetup: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        business_name: '',
        business_description: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log('Submitting provider setup:', formData);
            
            // Use the providers.setup function
            const response = await providers.setup(formData);
            console.log('Provider setup success:', response.data);
            
            // Update user data in localStorage
            try {
                const userString = localStorage.getItem('user');
                if (userString) {
                    const userData = JSON.parse(userString);
                    userData.has_provider_profile = true;
                    localStorage.setItem('user', JSON.stringify(userData));
                }
            } catch (error) {
                console.error('Error updating user data:', error);
            }

            // On success, navigate to provider dashboard
            navigate('/provider/dashboard');
        } catch (err: any) {
            console.error('Provider setup error:', err);
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
            <Paper sx={{ p: 4 }}>
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
                        value={formData.business_name}
                        onChange={handleTextChange}
                        margin="normal"
                        required
                    />

                    <TextField
                        fullWidth
                        label="Business Description"
                        name="business_description"
                        value={formData.business_description}
                        onChange={handleTextChange}
                        margin="normal"
                        multiline
                        rows={4}
                        required
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