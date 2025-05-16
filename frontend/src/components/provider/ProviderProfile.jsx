import React, {   useState, useEffect    } from 'react';
import { useNavigate      } from 'react-router-dom';
import { Box,
    Typography,
    TextField,
    Button,
    Paper,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Divider,
    Grid,
     } from '@mui/material';
import { providers, auth, api      } from '../../services/api';


const ProviderProfile = () => { const navigate = useNavigate();
    const [state, setState] = useState({
        loading: false,
        error: '',
        exists: false
    });

    useEffect(() => { fetchData();
     }, []);

    const fetchData = async () => {
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        try {
            // First, get user profile
            const userString = localStorage.getItem('user');
            let userData = {};
            
            if (userString) {
                userData = JSON.parse(userString);
                // Parse address into components if it exists as a single string
                let addressComponents = {
                    address_line1: '',
                    address_line2: '',
                    city: '',
                    state: '',
                    zip_code: ''
                };
                
                // Check if we have structured address fields
                if (userData.address_line1) {
                    addressComponents = {
                        address_line1: userData.address_line1 || '',
                        address_line2: userData.address_line2 || '',
                        city: userData.city || '',
                        state: userData.state || '',
                        zip_code: userData.zip_code || ''
                    };
                }
                // If only legacy address exists, leave address components empty
                
                setState(prev => ({
                    ...prev,
                    email: userData.email || '',
                    phone_number: userData.phone_number || '',
                    // Keep the legacy address field for compatibility
                    address: userData.address || '',
                    // New structured address fields
                    ...addressComponents
                }));
            }
            
            // Then try to get provider profile
            try {
                const providerResponse = await providers.getProfile();
                console.log('Provider profile');
                
                setState(prev => ({
                    ...prev,
                    id: providerResponse.data.id,
                    business_name: providerResponse.data.business_name,
                    business_description: providerResponse.data.business_description,
                    loading: false,
                    exists: true,
                }));
            } catch (error) {
                console.error('Error fetching provider profile');
                
                if (error.response?.status === 404) {
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        error: 'Provider profile not found. Please set up your profile.',
                        exists: false,
                    }));
                } else { 
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        error: error.response?.data?.error || 'Failed to load provider profile',
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching user data');
            setState(prev => ({
                ...prev,
                loading: false,
                error: 'Failed to load user data',
            }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setState(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUserInfoSubmit = async (e) => {
        e.preventDefault();
        setState(prev => ({ ...prev, loading: true, error: '', success: '' }));
        
        // First, update provider profile if it exists
        if (state.exists) {
            try {
                // Prepare business profile data
                const businessData = {
            business_name: state.business_name,
            business_description: state.business_description,
        };
        
                // Update provider profile using the correct method
                await providers.updateProfile(businessData);
                console.log('Business profile updated successfully');
            } catch (error) {
                console.error('Error updating business profile:', error);
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: error.response?.data?.error || 'Failed to update business profile'
                }));
                return; // Stop the process if updating business profile fails
            }
            } else {
            try {
                // Create new provider profile
                const businessData = {
                    business_name: state.business_name,
                    business_description: state.business_description,
                };
                
                // Setup new provider profile
                const response = await providers.setup(businessData);
                console.log('Provider profile created:', response.data);
                
                setState(prev => ({
                    ...prev,
                    id: response.data.id,
                    exists: true,
                }));
        } catch (error) {
                console.error('Error creating business profile:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                    error: error.response?.data?.error || 'Failed to create business profile'
            }));
                return; // Stop the process if creating business profile fails
            }
        }
        
        // Then update user info
        try {
            const userData = {
            email: state.email,
            phone_number: state.phone_number,
                // Include structured address fields
                address_line1: state.address_line1,
                address_line2: state.address_line2,
                city: state.city,
                state: state.state,
                zip_code: state.zip_code
            };
            
            // Call API to update user info
            const response = await providers.updateUserInfo(userData);
            
            // Update localStorage
            const userString = localStorage.getItem('user');
            if (userString) {
                const oldUserData = JSON.parse(userString);
                // Merge the user data properly
                const updatedUser = { 
                    ...oldUserData, 
                    email: userData.email,
                    phone_number: userData.phone_number,
                    address_line1: userData.address_line1,
                    address_line2: userData.address_line2,
                    city: userData.city,
                    state: userData.state,
                    zip_code: userData.zip_code
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            
            setState(prev => ({
                ...prev,
                loading: false,
                success: 'Profile updated successfully'
            }));
        } catch (error) {
            console.error('Error updating user info:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.response?.data?.error || 'Failed to update user information'
            }));
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setState(prev => ({ ...prev, loading: true, error: '', success: '' }));
        
        // Client-side validation
        if (state.new_password !== state.confirm_password) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: 'New passwords do not match'
            }));
            return;
        }
        
        // Password strength validation
        if (state.new_password.length < 8) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: 'Password must be at least 8 characters long'
            }));
            return;
        }
        
        try {
            // Call API to update password
            const response = await providers.updatePassword({
                current_password: state.current_password,
                new_password: state.new_password,
            });
            
            // Update token in localStorage
            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                console.log('Password updated successfully, new token saved');
            }
            
            setState(prev => ({
                ...prev,
                loading: false,
                current_password: '',
                new_password: '',
                confirm_password: '',
                success: 'Password updated successfully'
            }));
        } catch (error) {
            console.error('Error updating password:', error);
            
            // Extract the specific error message from the API response
            const errorMessage = error.response?.data?.error || 'Failed to update password';
            
            setState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage
            }));
        }
    };

    if (state.loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box maxWidth="md" mx="auto" mt={4}>
            <Paper sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4">
                        Account Settings
                    </Typography>
                </Box>
                { state.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        { state.error }
                    </Alert>
                )}
                
                { state.success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        { state.success }
                    </Alert>
                )}

                {/* Combined Profile Section */}
                <Box mb={5}>
                    <Typography variant="h5" sx={{ mb: 2, pb: 1, borderBottom: '1px solid #e0e0e0' }}>
                        Profile Information
                    </Typography>
                    <form onSubmit={handleUserInfoSubmit}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Business Information */}
                            <Typography variant="subtitle1" sx={{ mt: 1 }}>
                                Business Information
                            </Typography>
                            
                            <TextField
                                fullWidth
                                label="Business Name"
                                name="business_name"
                                value={state.business_name || ''}
                                onChange={handleChange}
                                margin="normal"
                                required
                            />
                            
                            <TextField
                                fullWidth
                                label="Business Description"
                                name="business_description"
                                value={state.business_description || ''}
                                onChange={handleChange}
                                margin="normal"
                                multiline
                                rows={4}
                                required
                            />
                            
                            {/* Personal Information */}
                            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                                Personal Information
                                </Typography>
                            
                            <TextField
                                fullWidth
                                label="Email"
                                name="email"
                                type="email"
                                value={state.email || ''}
                                onChange={handleChange}
                                margin="normal"
                                required
                            />
                            
                            <TextField
                                fullWidth
                                label="Phone Number"
                                name="phone_number"
                                value={state.phone_number || ''}
                                onChange={handleChange}
                                margin="normal"
                            />
                            
                            <Typography variant="subtitle1" sx={{ mt: 1 }}>
                                Address
                            </Typography>
                            
                            <TextField
                                fullWidth
                                label="Street Address"
                                name="address_line1"
                                value={state.address_line1 || ''}
                                onChange={handleChange}
                                margin="normal"
                                required
                            />
                            
                            <TextField
                                fullWidth
                                label="Apt, Suite, etc. (optional)"
                                name="address_line2"
                                value={state.address_line2 || ''}
                                onChange={handleChange}
                                margin="normal"
                            />
                            
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={5}>
                                    <TextField
                                        fullWidth
                                        label="City"
                                        name="city"
                                        value={state.city || ''}
                                        onChange={handleChange}
                                        margin="normal"
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth
                                        label="State"
                                        name="state"
                                        value={state.state || ''}
                                        onChange={handleChange}
                                        margin="normal"
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="Zip Code"
                                        name="zip_code"
                                        value={state.zip_code || ''}
                                        onChange={handleChange}
                                        margin="normal"
                                        required
                                    />
                                </Grid>
                            </Grid>
                            
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={state.loading}
                                >
                                    {state.loading ? <CircularProgress size={24} /> : 'Update Profile'}
                                </Button>
                            </Box>
                        </Box>
                    </form>
                </Box>

                {/* Password Section */}
                <Box>
                    <Typography variant="h5" sx={{ mb: 2, pb: 1, borderBottom: '1px solid #e0e0e0' }}>
                        Change Password
                    </Typography>
                    <form onSubmit={handlePasswordSubmit}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Current Password"
                                name="current_password"
                                type="password"
                                value={state.current_password || ''}
                                onChange={handleChange}
                                margin="normal"
                                required
                            />
                            
                            <TextField
                                fullWidth
                                label="New Password"
                                name="new_password"
                                type="password"
                                value={state.new_password || ''}
                                onChange={handleChange}
                                margin="normal"
                                required
                                helperText="Password must be at least 8 characters long and include letters and numbers"
                            />
                            
                            <TextField
                                fullWidth
                                label="Confirm New Password"
                                name="confirm_password"
                                type="password"
                                value={state.confirm_password || ''}
                                onChange={handleChange}
                                margin="normal"
                                required
                                error={state.new_password !== state.confirm_password && state.confirm_password}
                                helperText={state.new_password !== state.confirm_password && state.confirm_password ? 'Passwords do not match' : ''}
                            />
                            
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={state.loading}
                                >
                                    {state.loading ? <CircularProgress size={24} /> : 'Update Password'}
                                </Button>
                            </Box>
                        </Box>
                    </form>
                </Box>
            </Paper>
        </Box>
    );
};

export default ProviderProfile; 