import React, { useState, useEffect } from 'react';
import { 
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    Card,
    CardContent,
    Divider,
    Alert,
    CircularProgress,
     } from '@mui/material';
import { providers } from '../../services/api';

const ProviderProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({});
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);

    useEffect(() => {
        fetchProfile();
     }, []);

    const fetchProfile = async () => {
        try {
            const response = await providers.getProfile();
            setProfile(response.data);
            setFormData({
                business_name: response.data.business_name,
                business_description: response.data.business_description,
            });
            setLoading(false);
        } catch (err) {
            setError('Failed to load profile data');
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUpdateProfile = async () => {
        try {
            setUpdateLoading(true);
            setError('');
            setUpdateSuccess(false);
            
            await providers.update(profile.id, formData);
            
            setUpdateSuccess(true);
            setUpdateLoading(false);
            
            // Refresh profile data
            fetchProfile();
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                setUpdateSuccess(false);
            }, 3000);
        } catch (err) {
            setError('Failed to update profile. Please try again.');
            setUpdateLoading(false);
        }
    };

    const handleUpdateUserInfo = async (userData) => {
        try {
            setUpdateLoading(true);
            setError('');
            setUpdateSuccess(false);
            
            await providers.updateUserInfo(userData);
            
            setUpdateSuccess(true);
            setUpdateLoading(false);
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                setUpdateSuccess(false);
            }, 3000);
        } catch (err) {
            setError('Failed to update user information. Please try again.');
            setUpdateLoading(false);
        }
    };
    
    const handleUpdatePassword = async (passwordData) => {
        try {
            setUpdateLoading(true);
            setError('');
            setUpdateSuccess(false);
            
            await providers.updatePassword(passwordData);
            
            setUpdateSuccess(true);
            setUpdateLoading(false);
            
            // Clear form data for security
            setFormData(prev => ({
                ...prev,
                current_password: '',
                new_password: '',
                confirm_password: ''
            }));
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                setUpdateSuccess(false);
            }, 3000);
        } catch (err) {
            setError('Failed to update password. Please try again.');
            setUpdateLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md">
            <Typography variant="h4" gutterBottom>
                Provider Profile
                    </Typography>
            
            {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                    </Alert>
                )}
                
            {updateSuccess && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                    Profile updated successfully!
                    </Alert>
                )}

            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Business Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box component="form" noValidate>
                            <TextField
                                fullWidth
                                label="Business Name"
                                name="business_name"
                            value={formData.business_name || ''}
                            onChange={handleChange}
                                margin="normal"
                            />
                            
                            <TextField
                                fullWidth
                                label="Business Description"
                                name="business_description"
                            value={formData.business_description || ''}
                            onChange={handleChange}
                                margin="normal"
                                multiline
                            rows={4}
                        />
                        
                                    <Button 
                                        variant="contained" 
                                        color="primary"
                            onClick={handleUpdateProfile}
                            sx={{ mt: 2 }}
                            disabled={updateLoading}
                        >
                            {updateLoading ? <CircularProgress size={24} /> : 'Update Profile'}
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
        </Container>
    );
};

export default ProviderProfile; 