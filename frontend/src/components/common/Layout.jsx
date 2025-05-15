import React from 'react';
import { useNavigate } from 'react-router-dom';
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
    
    // Safely get user from localStorage with error handling
    let user = null;
    try {
        const userString = localStorage.getItem('user');
        if (userString) {
            user = JSON.parse(userString);
        }
    } catch (error) {
        console.error('Error parsing user from localStorage');
        // Clear invalid data from localStorage
        localStorage.removeItem('user');
    }

    const handleLogout = () => {
        auth.logout();
        navigate('/login');
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                        <Link component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box
                                component="img"
                                src="/images/logo.png"
                                alt="Viciniti Logo"
                                sx={{ width: 40, height: 40, mr: 1 }}
                            />
                        </Link>
                    </Box>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        <Link component={RouterLink} to="/" color="inherit" underline="none">
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
                                            onClick={() => navigate('/profile')}
                                        >
                                            Profile
                                        </Button>
                                    </>
                                )}
                                <Button
                                    color="inherit"
                                    onClick={() => navigate('/appointments')}
                                >
                                    Appointments
                                </Button>
                                <Button color="inherit" onClick={handleLogout}>
                                    Logout
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