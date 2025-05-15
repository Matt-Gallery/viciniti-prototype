import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Layout from './components/common/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ConsumerProfile from './components/auth/ConsumerProfile';
import ServiceList from './components/services/ServiceList';
import ServiceBrowser from './components/services/ServiceBrowser';
import ProviderDashboard from './components/provider/ProviderDashboard';
import ServiceCreate from './components/provider/ServiceCreate';
import ServiceEdit from './components/provider/ServiceEdit';
import ProviderSetup from './components/provider/ProviderSetup';
import ProviderProfile from './components/provider/ProviderProfile';
import AppointmentBooking from './components/appointments/AppointmentBooking';
import AppointmentList from './components/appointments/AppointmentList';

// Create a theme instance
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#2451ff', // Apple blue
        },
        secondary: {
            main: '#a259f7', // Modern purple accent
        },
        background: {
            default: 'linear-gradient(135deg, #181c2f 0%, #232a5c 100%)', // Apple-like gradient
            paper: 'linear-gradient(135deg, rgba(34,36,58,0.95) 60%, rgba(162,89,247,0.85) 100%)', // Gradient for panels
        },
        text: {
            primary: '#f5f6fa',
            secondary: '#b0b3b8',
        },
    },
    shape: {
        borderRadius: 20,
    },
    typography: {
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            'Segoe UI',
            'Roboto',
            'Oxygen',
            'Ubuntu',
            'Cantarell',
            'Fira Sans',
            'Droid Sans',
            'Helvetica Neue',
            'sans-serif',
        ].join(','),
        h4: {
            fontWeight: 800,
            letterSpacing: '-1px',
            fontSize: '2.4rem',
        },
        h5: {
            fontWeight: 700,
            fontSize: '1.5rem',
        },
        body1: {
            fontWeight: 400,
            fontSize: '1.1rem',
        },
        button: {
            fontWeight: 600,
            fontSize: '1rem',
        },
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    background: 'linear-gradient(135deg, rgba(34,36,58,0.95) 60%, rgba(162,89,247,0.85) 100%)',
                    borderRadius: 20,
                    boxShadow: '0 8px 32px 0 rgba(36,81,255,0.12)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px 0 rgba(36,81,255,0.10)',
                    paddingLeft: 24,
                    paddingRight: 24,
                    background: 'linear-gradient(90deg, #2451ff 0%, #a259f7 100%)',
                    color: '#fff',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 24,
                    boxShadow: '0 8px 32px 0 rgba(36,81,255,0.10)',
                    background: 'linear-gradient(135deg, rgba(34,36,58,0.95) 60%, rgba(162,89,247,0.85) 100%)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                colorPrimary: {
                    background: 'linear-gradient(90deg, #181c2f 60%, #232a5c 100%)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 4px 24px 0 rgba(36,81,255,0.10)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                },
            },
        },
    },
});

// Protected Route component
const ProtectedRoute = ({ children, userType }) => {
    // Safely get user from localStorage with error handling
    let user = null;
    try {
        const userString = localStorage.getItem('user');
        if (userString) {
            user = JSON.parse(userString);
        }
    } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        // Clear invalid data from localStorage
        localStorage.removeItem('user');
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (userType && user.user_type !== userType) {
        return <Navigate to="/" />;
    }

    return <>{children}</>;
};

const App = () => {
    return (
        <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Router>
                    <Layout>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />

                            {/* Provider Routes */}
                            <Route
                                path="/provider/dashboard"
                                element={
                                    <ProtectedRoute userType="provider">
                                        <ProviderDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/provider/setup"
                                element={
                                    <ProtectedRoute userType="provider">
                                        <ProviderSetup />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/provider/profile"
                                element={
                                    <ProtectedRoute userType="provider">
                                        <ProviderProfile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/provider/services/create"
                                element={
                                    <ProtectedRoute userType="provider">
                                        <ServiceCreate />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/provider/services/edit/:id"
                                element={
                                    <ProtectedRoute userType="provider">
                                        <ServiceEdit />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Consumer Routes */}
                            <Route
                                path="/services"
                                element={
                                    <ServiceBrowser />
                                }
                            />
                            <Route
                                path="/services/list"
                                element={
                                    <ServiceList />
                                }
                            />
                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute userType="consumer">
                                        <ConsumerProfile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/services/:serviceId/book"
                                element={
                                    <ProtectedRoute userType="consumer">
                                        <AppointmentBooking />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/appointments"
                                element={
                                    <ProtectedRoute>
                                        <AppointmentList />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Default Route */}
                            <Route path="/" element={<Navigate to="/services" />} />
                        </Routes>
                    </Layout>
                </Router>
            </LocalizationProvider>
        </ThemeProvider>
    );
};

export default App;
