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
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
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
