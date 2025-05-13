import React, {   useState    } from 'react';
import { useNavigate      } from 'react-router-dom';
import { Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
     } from '@mui/material';
import { auth      } from '../../services/api';

const Login = () => { const navigate = useNavigate();
    const [formData, setFormData] = useState({});
    const [error, setError] = useState('');

    const handleChange = (e) => { const { name, value    } = e.target;
        setFormData(prev => ({ ...prev,
            [name]: value,
         }));
    };

    const handleSubmit = async (e) => { e.preventDefault();
        try {
            console.log('Attempting login with:', { username: formData.username, passwordLength: formData.password?.length });
            const response = await auth.login(formData.username, formData.password);
            
            console.log('Login response:', response.data);
            
            // Check if the response has the expected structure - Django token auth typically returns just the token
            if (!response.data.token) {
                console.error('Authentication error: No token in response');
                setError('Authentication failed: Invalid response format (no token)');
                return;
            }
            
            // Store token in localStorage
            localStorage.setItem('token', response.data.token);
            
            // Check if we have user info in the response - newer Django REST framework may include it
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
                console.log('User data stored from response:', response.data.user);
                
                // Redirect based on user type and setup status
                if (response.data.user.user_type === 'provider') {
                    if (response.data.user.needs_setup) {
                        console.log('Redirecting to provider setup');
                        navigate('/provider/setup');
                    } else { 
                        console.log('Redirecting to provider dashboard');
                        navigate('/provider/dashboard');
                    }
                } else { 
                    console.log('Redirecting to services');
                    navigate('/services');
                }
            } else {
                // If no user info in response, create a default user and fetch profile after login
                console.log('No user data in response, creating default user object');
                
                // For Django token auth, we can make a follow-up request to get user data
                try {
                    // Try to get user info now that we're authenticated with the correct API URL
                    const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
                    const userResponse = await fetch(`${apiBaseUrl}/auth/profile/`, {
                        headers: { 
                            'Authorization': `Token ${response.data.token}`,
                            'Content-Type': 'application/json',
                        }
                    });
                    
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        localStorage.setItem('user', JSON.stringify(userData));
                        console.log('User data retrieved from profile endpoint:', userData);
                        
                        // Redirect based on user type
                        if (userData.user_type === 'provider') {
                            console.log('Redirecting to provider dashboard');
                            navigate('/provider/dashboard');
                        } else {
                            console.log('Redirecting to services');
                            navigate('/services');
                        }
                    } else {
                        // If can't get user info, create default object
                        const defaultUser = { 
                            username: formData.username,
                            // Path-based default user type
                            user_type: 'consumer' 
                        };
                        localStorage.setItem('user', JSON.stringify(defaultUser));
                        console.log('Created default user data:', defaultUser);
                        navigate('/services');
                    }
                } catch (profileError) {
                    console.error('Error fetching user profile:', profileError);
                    // Fallback to minimal user object
                    const defaultUser = { username: formData.username };
                    localStorage.setItem('user', JSON.stringify(defaultUser));
                    navigate('/services');
                }
            }
        } catch (err) { 
            console.error('Login error details:', err);
            console.error('Error response data:', err.response?.data);
            // Handle different types of errors
            if (err.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const errorData = err.response.data;
                if (errorData.error) {
                    setError(errorData.error);
                 } else { setError('Invalid username or password');
                 }
            } else if (err.request) { // The request was made but no response was received
                setError('No response from server. Please check your network connection.');
             } else { // Something happened in setting up the request that triggered an Error
                setError('Error setting up request. Please try again later.');
             }
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 4 }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h4" align="center" gutterBottom>
                        Login
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
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <Button
                            fullWidth
                            type="submit"
                            variant="contained"
                            color="primary"
                            sx={{ mt: 2 }}
                        >
                            Login
                        </Button>
                    </form>
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="body2">
                            Don't have an account?{' '}
                            <Button
                                color="primary"
                                onClick={() => navigate('/register')}
                            >
                                Register here
                            </Button>
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default Login; 