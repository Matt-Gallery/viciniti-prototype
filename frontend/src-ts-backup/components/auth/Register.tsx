import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
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
    SelectChangeEvent,
} from '@mui/material';
import { auth } from '../../services/api';
import { UserRegisterRequest } from '../../types';

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<UserRegisterRequest>({
        username: '',
        email: '',
        password: '',
        user_type: 'consumer',
        phone_number: '',
        address: '',
    });
    const [error, setError] = useState<string>('');

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (e: SelectChangeEvent) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await auth.register(formData);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            if (response.data.user.user_type === 'provider') {
                navigate('/provider/setup');
            } else {
                navigate('/services');
            }
        } catch (err: any) {
            console.error('Registration error:', err);
            // Handle different types of errors
            if (err.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const errorData = err.response.data;
                if (errorData.error) {
                    setError(errorData.error);
                } else {
                    setError('Registration failed. Please check your information and try again.');
                }
            } else if (err.request) {
                // The request was made but no response was received
                setError('No response from server. Please check your network connection.');
            } else {
                // Something happened in setting up the request that triggered an Error
                setError('Error setting up request. Please try again later.');
            }
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
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
                        <TextField
                            fullWidth
                            label="Address"
                            name="address"
                            multiline
                            rows={3}
                            value={formData.address}
                            onChange={handleTextChange}
                            margin="normal"
                        />
                        <Button
                            fullWidth
                            type="submit"
                            variant="contained"
                            color="primary"
                            sx={{ mt: 3 }}
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