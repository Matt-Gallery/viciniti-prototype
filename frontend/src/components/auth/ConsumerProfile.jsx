import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Paper, 
    TextField, 
    Button, 
    Grid, 
    Divider,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api, auth } from '../../services/api';

const ConsumerProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    
    // User profile data
    const [userData, setUserData] = useState({
        username: '',
        email: '',
        phone_number: '',
        street_address: '',
        apartment: '',
        city: '',
        state: '',
        zip_code: ''
    });
    
    // Password change data
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    
    // Validation error states
    const [fieldErrors, setFieldErrors] = useState({});
    const [passwordErrors, setPasswordErrors] = useState({});
    
    // Fetch user profile data
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                setLoading(true);
                const response = await api.get('/auth/profile/');
                console.log('User profile data:', response.data);
                setUserData(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching user profile:', err);
                setError('Failed to load your profile information');
                setLoading(false);
            }
        };
        
        fetchUserProfile();
    }, []);
    
    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserData({
            ...userData,
            [name]: value
        });
        
        // Clear error for this field if it exists
        if (fieldErrors[name]) {
            setFieldErrors({
                ...fieldErrors,
                [name]: ''
            });
        }
    };
    
    // Handle password input changes
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData({
            ...passwordData,
            [name]: value
        });
        
        // Clear error for this field if it exists
        if (passwordErrors[name]) {
            setPasswordErrors({
                ...passwordErrors,
                [name]: ''
            });
        }
    };
    
    // Validate user data
    const validateUserData = () => {
        const errors = {};
        
        if (!userData.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
            errors.email = 'Email is invalid';
        }
        
        if (userData.phone_number && !/^\d{10,15}$/.test(userData.phone_number.replace(/\D/g, ''))) {
            errors.phone_number = 'Please enter a valid phone number';
        }
        
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };
    
    // Validate password data
    const validatePasswordData = () => {
        const errors = {};
        
        if (!passwordData.current_password) {
            errors.current_password = 'Current password is required';
        }
        
        if (!passwordData.new_password) {
            errors.new_password = 'New password is required';
        } else if (passwordData.new_password.length < 8) {
            errors.new_password = 'Password must be at least 8 characters';
        }
        
        if (passwordData.new_password !== passwordData.confirm_password) {
            errors.confirm_password = 'Passwords do not match';
        }
        
        setPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };
    
    // Save profile changes
    const handleSaveProfile = async () => {
        if (!validateUserData()) return;
        
        try {
            setLoading(true);
            setError('');
            setSuccess('');
            
            const response = await api.put('/auth/profile/', {
                email: userData.email,
                phone_number: userData.phone_number,
                street_address: userData.street_address,
                apartment: userData.apartment,
                city: userData.city,
                state: userData.state,
                zip_code: userData.zip_code
            });
            
            // Update the user in localStorage
            const userString = localStorage.getItem('user');
            if (userString) {
                const currentUser = JSON.parse(userString);
                const updatedUser = {
                    ...currentUser,
                    email: userData.email,
                    phone_number: userData.phone_number,
                    street_address: userData.street_address,
                    apartment: userData.apartment,
                    city: userData.city,
                    state: userData.state,
                    zip_code: userData.zip_code
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            
            setSuccess('Profile updated successfully');
            setLoading(false);
        } catch (err) {
            console.error('Error updating profile:', err);
            setError(err.response?.data?.error || 'Failed to update profile');
            setLoading(false);
        }
    };
    
    // Change password
    const handleChangePassword = async () => {
        if (!validatePasswordData()) return;
        
        try {
            setLoading(true);
            setError('');
            setSuccess('');
            
            const response = await api.put('/auth/password/', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password
            });
            
            setSuccess('Password changed successfully');
            setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
            setPasswordDialogOpen(false);
            setLoading(false);
        } catch (err) {
            console.error('Error changing password:', err);
            setPasswordErrors({
                ...passwordErrors,
                current_password: err.response?.data?.error || 'Failed to change password'
            });
            setLoading(false);
        }
    };
    
    // Delete account
    const handleDeleteAccount = async () => {
        try {
            setLoading(true);
            setError('');
            
            // Call an API to delete the user account
            // Note: You'll need to implement this endpoint on the backend
            await api.delete('/auth/profile/');
            
            // Clear user data and redirect to login
            auth.logout();
            navigate('/login');
        } catch (err) {
            console.error('Error deleting account:', err);
            setError(err.response?.data?.error || 'Failed to delete account');
            setLoading(false);
            setConfirmDialogOpen(false);
        }
    };
    
    if (loading && !userData.email) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }
    
    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>Your Profile</Typography>
            
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            
            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}
            
            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Account Information</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Username"
                            value={userData.username}
                            fullWidth
                            disabled
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Email"
                            name="email"
                            value={userData.email}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            margin="normal"
                            error={!!fieldErrors.email}
                            helperText={fieldErrors.email}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Phone Number"
                            name="phone_number"
                            value={userData.phone_number || ''}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                            error={!!fieldErrors.phone_number}
                            helperText={fieldErrors.phone_number}
                        />
                    </Grid>
                </Grid>
                
                <Box sx={{ mt: 2, mb: 2 }}>
                    <Button 
                        variant="outlined" 
                        color="primary" 
                        onClick={() => setPasswordDialogOpen(true)}
                    >
                        Change Password
                    </Button>
                </Box>
            </Paper>
            
            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Address Information</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Street Address"
                            name="street_address"
                            value={userData.street_address || ''}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Apartment/Suite/Unit (Optional)"
                            name="apartment"
                            value={userData.apartment || ''}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="City"
                            name="city"
                            value={userData.city || ''}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            label="State"
                            name="state"
                            value={userData.state || ''}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            label="ZIP Code"
                            name="zip_code"
                            value={userData.zip_code || ''}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                </Grid>
            </Paper>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSaveProfile}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
                
                <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={() => setConfirmDialogOpen(true)}
                >
                    Delete Account
                </Button>
            </Box>
            
            {/* Password Change Dialog */}
            <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
                <DialogTitle>Change Your Password</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Please enter your current password and a new password to continue.
                    </DialogContentText>
                    <TextField
                        label="Current Password"
                        name="current_password"
                        type="password"
                        value={passwordData.current_password}
                        onChange={handlePasswordChange}
                        fullWidth
                        margin="normal"
                        required
                        error={!!passwordErrors.current_password}
                        helperText={passwordErrors.current_password}
                    />
                    <TextField
                        label="New Password"
                        name="new_password"
                        type="password"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        fullWidth
                        margin="normal"
                        required
                        error={!!passwordErrors.new_password}
                        helperText={passwordErrors.new_password}
                    />
                    <TextField
                        label="Confirm New Password"
                        name="confirm_password"
                        type="password"
                        value={passwordData.confirm_password}
                        onChange={handlePasswordChange}
                        fullWidth
                        margin="normal"
                        required
                        error={!!passwordErrors.confirm_password}
                        helperText={passwordErrors.confirm_password}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleChangePassword} 
                        variant="contained" 
                        color="primary"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Change Password'}
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Delete Account Confirmation Dialog */}
            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
                <DialogTitle>Delete Your Account?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This action cannot be undone. All your data, including appointments and profile information will be permanently deleted.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleDeleteAccount} 
                        variant="contained" 
                        color="error"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Delete Account'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ConsumerProfile; 