import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
} from '@mui/material';
import { auth } from '../../services/api';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        user_type: 'consumer',
        phone_number: '',
        address: '',
        street_address: '',
        apartment: '',
        city: '',
        state: '',
        zip_code: '',
    });
    const [error, setError] = useState('');

    const handleTextChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));

        // If address fields change, update the combined address field
        if(['street_address', 'apartment', 'city', 'state', 'zip_code'].includes(name)) {
            const addressComponents = [
                formData.street_address, 
                formData.apartment,
                formData.city,
                formData.state,
                formData.zip_code
            ];
            
            // Update with the new value
            addressComponents[['street_address', 'apartment', 'city', 'state', 'zip_code'].indexOf(name)] = value;
            
            // Filter out empty components and join with commas
            const newAddress = addressComponents.filter(comp => comp).join(', ');
            
            setFormData(prev => ({
                ...prev,
                address: newAddress,
            }));
        }
    };

    const handleSelectChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Registration form submitted with data:', formData);
        setError(''); // Clear previous errors
        
        try {
            console.log('Sending registration request with data:', JSON.stringify(formData));
            const response = await auth.register(formData);
            console.log('Registration successful, response:', response.data);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            if (response.data.user.user_type === 'provider') {
                navigate('/provider/setup');
            } else {
                navigate('/services');
            }
        } catch (err) {
            console.error('Registration error:', err);
            
            // Handle different types of errors
            if (err.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const errorData = err.response.data;
                console.error('Error response data:', errorData);
                console.error('Status code:', err.response.status);
                
                if (errorData.error) {
                    setError(`Error: ${errorData.error}`);
                } else {
                    setError(`Registration failed (${err.response.status}). Please check your information and try again.`);
                }
            } else if (err.request) {
                // The request was made but no response was received
                console.error('No response received from server');
                setError('No response from server. Please check your network connection. Verify that your backend is running at http://localhost:8000.');
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error setting up request:', err.message);
                setError(`Error setting up request: ${err.message}`);
            }
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 4 }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h4" align="center" gutterBottom>
                        Register
                    </Typography>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Username"
                            name="username"
                            value={formData.username}
                            onChange={handleTextChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleTextChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleTextChange}
                            margin="normal"
                            required
                        />
                        <FormControl fullWidth margin="normal" required>
                            <InputLabel>User Type</InputLabel>
                            <Select
                                name="user_type"
                                value={formData.user_type}
                                onChange={handleSelectChange}
                                label="User Type"
                            >
                                <MenuItem value="provider">Service Provider</MenuItem>
                                <MenuItem value="consumer">Service Consumer</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Phone Number"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleTextChange}
                            margin="normal"
                        />
                        
                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                            Address Information
                        </Typography>
                        
                        <TextField
                            fullWidth
                            label="Street Address"
                            name="street_address"
                            value={formData.street_address}
                            onChange={handleTextChange}
                            margin="normal"
                        />
                        
                        <TextField
                            fullWidth
                            label="Apartment/Suite/Unit (optional)"
                            name="apartment"
                            value={formData.apartment}
                            onChange={handleTextChange}
                            margin="normal"
                        />
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={5}>
                                <TextField
                                    fullWidth
                                    label="City"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleTextChange}
                                    margin="normal"
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    fullWidth
                                    label="State"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleTextChange}
                                    margin="normal"
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="ZIP Code"
                                    name="zip_code"
                                    value={formData.zip_code}
                                    onChange={handleTextChange}
                                    margin="normal"
                                />
                            </Grid>
                        </Grid>
                        
                        <Button
                            fullWidth
                            type="submit"
                            variant="contained"
                            color="primary"
                            sx={{ mt: 2 }}
                        >
                            Register
                        </Button>
                    </form>
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="body2">
                            Already have an account?{' '}
                            <Button
                                color="primary"
                                onClick={() => navigate('/login')}
                            >
                                Login here
                            </Button>
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default Register; 