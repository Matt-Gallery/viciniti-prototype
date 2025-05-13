import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    AppBar,
    Toolbar,
    Typography,
    Button,
    Container,
    Box,
    Link,
} from '@mui/material';
import { auth } from '../../services/api';
import { Link as RouterLink } from 'react-router-dom';


const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Safely get user from localStorage with error handling
    let user = null;
    try {
        const userString = localStorage.getItem('user');
        if (userString) {
            user = JSON.parse(userString);
            console.log('Layout loaded with user type:', user.user_type);
        }
    } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        // Clear invalid data from localStorage
        localStorage.removeItem('user');
    }

    // Verify that the user has a valid type and redirect if needed
    useEffect(() => {
        if (user) {
            // If user has no user_type or invalid user_type, log them out
            if (!user.user_type || (user.user_type !== 'provider' && user.user_type !== 'consumer')) {
                console.error('Invalid user type detected:', user.user_type);
                auth.logout();
                navigate('/login');
                return;
            }
            
            // Check if provider is accessing consumer routes or vice versa
            const isProviderRoute = location.pathname.startsWith('/provider');
            const isConsumerRoute = location.pathname.startsWith('/services') || 
                                  location.pathname === '/appointments';
            
            if (user.user_type === 'provider' && isConsumerRoute && !isProviderRoute) {
                console.log('Provider accessing consumer route - redirecting to provider dashboard');
                navigate('/provider/dashboard');
            } else if (user.user_type === 'consumer' && isProviderRoute) {
                console.log('Consumer accessing provider route - redirecting to services');
                navigate('/services');
            }
        }
    }, [location.pathname, navigate, user]);

    const handleLogout = () => {
        auth.logout();
        navigate('/login');
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        <Link 
                            component={RouterLink} 
                            to={user?.user_type === 'provider' ? '/provider/dashboard' : '/services'} 
                            color="inherit" 
                            underline="none"
                        >
                            Viciniti
                        </Link>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {user ? (
                            <>
                                {user.user_type === 'provider' ? (
                                    <>
                                        <Button
                                            color="inherit"
                                            onClick={() => navigate('/provider/dashboard')}
                                        >
                                            Dashboard
                                        </Button>
                                        <Button
                                            color="inherit"
                                            onClick={() => navigate('/provider/profile')}
                                        >
                                            Profile
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            color="inherit"
                                            onClick={() => navigate('/services')}
                                        >
                                            Services
                                        </Button>
                                        <Button
                                            color="inherit"
                                            onClick={() => navigate('/appointments')}
                                        >
                                            My Appointments
                                        </Button>
                                    </>
                                )}
                                {/* Separate appointments button for providers */}
                                {user.user_type === 'provider' && (
                                    <Button
                                        color="inherit"
                                        onClick={() => navigate('/appointments')}
                                    >
                                        Appointments
                                    </Button>
                                )}
                                <Button color="inherit" onClick={handleLogout}>
                                    Logout ({user.username || user.email})
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    color="inherit"
                                    onClick={() => navigate('/login')}
                                >
                                    Login
                                </Button>
                                <Button
                                    color="inherit"
                                    onClick={() => navigate('/register')}
                                >
                                    Register
                                </Button>
                            </>
                        )}
                    </Box>
                </Toolbar>
            </AppBar>
            <Container sx={{ mt: 4 }}>{children}</Container>
        </>
    );
};

export default Layout; 