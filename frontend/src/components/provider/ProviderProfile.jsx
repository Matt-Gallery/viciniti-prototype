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
    Tabs,
    Tab,
     } from '@mui/material';
import { providers, auth      } from '../../services/api';


const ProviderProfile = () => { const navigate = useNavigate();
    const [state, setState] = useState({});

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
                setState(prev => ({
                    ...prev,
                    email: userData.email || '',
                    phone_number: userData.phone_number || '',
                    address: userData.address || '',
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

    const handleTabChange = (_event, newValue) => {
        setState(prev => ({
            ...prev,
            activeTab: newValue,
            error: ''
        }));
    };

    const handleBusinessSubmit = async (e) => {
        e.preventDefault();
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        const data = {
            business_name: state.business_name,
            business_description: state.business_description,
        };
        
        try {
            if (state.exists) {
                // Update existing profile
                await providers.update(state.id, data);
                setState(prev => ({
                    ...prev,
                    loading: false,
                    editMode: false,
                    success: 'Provider profile updated successfully'
                }));
            } else {
                // Create new profile
                const response = await providers.setup(data);
                setState(prev => ({
                    ...prev,
                    id: response.data.id,
                    loading: false,
                    editMode: false,
                    exists: true,
                    success: 'Provider profile created successfully'
                }));
            }
        } catch (error) {
            console.error('Error saving provider profile');
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.response?.data?.error || 'Failed to save provider profile'
            }));
        }
    };

    const handleUserInfoSubmit = async (e) => {
        e.preventDefault();
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        const data = {
            email: state.email,
            phone_number: state.phone_number,
            address: state.address,
        };
        
        try {
            // Call API to update user info
            const response = await providers.updateUserInfo(data);
            
            // Update localStorage
            const userString = localStorage.getItem('user');
            if (userString) {
                const userData = JSON.parse(userString);
                const updatedUser = { ...userData, ...data };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            
            setState(prev => ({
                ...prev,
                loading: false,
                success: 'User information updated successfully'
            }));
        } catch (error) {
            console.error('Error updating user info');
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.response?.data?.error || 'Failed to update user information'
            }));
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        if (state.new_password !== state.confirm_password) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: 'New passwords do not match'
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
            console.error('Error updating password');
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.response?.data?.error || 'Failed to update password'
            }));
        }
    };

    const toggleEditMode = () => {
        setState(prev => ({ 
            ...prev, 
            editMode: !prev.editMode 
        }));
    };

    if (state.loading && !state.editMode) {
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
                    {state.exists && !state.editMode && (
                        <Button 
                            variant="outlined" 
                            color="primary"
                            onClick={toggleEditMode}
                        >
                            Edit Business Profile
                        </Button>
                    )}
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

                <Tabs 
                    value={state.activeTab} 
                    onChange={handleTabChange}
                    sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Business Profile" />
                    <Tab label="Personal Information" />
                    <Tab label="Password" />
                </Tabs>
                { /* Business Profile Tab */ }
                { state.activeTab === 0 && (
                    state.editMode || !state.exists ? (
                        // Edit mode or profile doesn't exist
                        <form onSubmit={handleBusinessSubmit }>
                            <TextField
                                fullWidth
                                label="Business Name"
                                name="business_name"
                                value={ state.business_name }
                                onChange={ handleChange }
                                margin="normal"
                                required
                            />
                            
                            <TextField
                                fullWidth
                                label="Business Description"
                                name="business_description"
                                value={ state.business_description }
                                onChange={ handleChange }
                                margin="normal"
                                multiline
                                rows={ 4 }
                                required
                            />
                            
                            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={ state.loading }
                                >
                                    { state.loading ? <CircularProgress size={24 } /> : 
                                        state.exists ? 'Update Business Profile' : 'Create Business Profile'}
                                </Button>
                                { state.exists && (
                                    <Button
                                        variant="outlined"
                                        onClick={toggleEditMode }
                                        disabled={ state.loading }
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </Box>
                        </form>
                    ) : (
                        // View mode
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Business Name
                                </Typography>
                                <Typography variant="body1" paragraph>
                                    {state.business_name}
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                
                                <Typography variant="h6" gutterBottom>
                                    Business Description
                                </Typography>
                                <Typography variant="body1" paragraph>
                                    {state.business_description}
                                </Typography>
                                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                                    <Button 
                                        variant="contained" 
                                        color="primary"
                                        onClick={() => navigate('/provider/services/create')}
                                    >
                                        Create Service
                                    </Button>
                                    <Button 
                                        variant="outlined" 
                                        color="primary"
                                        onClick={toggleEditMode}
                                    >
                                        Edit Business Profile
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    )
                )}

                { /* Personal Information Tab */ }
                { state.activeTab === 1 && (
                    <form onSubmit={handleUserInfoSubmit}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                            
                            <TextField
                                fullWidth
                                label="Address"
                                name="address"
                                value={state.address || ''}
                                onChange={handleChange}
                                margin="normal"
                                multiline
                                rows={3}
                            />
                            
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={state.loading}
                                >
                                    {state.loading ? <CircularProgress size={24} /> : 'Update Personal Information'}
                                </Button>
                            </Box>
                        </Box>
                    </form>
                )}

                { /* Password Tab */ }
                { state.activeTab === 2 && (
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
                )}
            </Paper>
        </Box>
    );
};

export default ProviderProfile; 