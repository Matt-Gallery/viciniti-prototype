import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    console.log('API Request to:', config.url);
    console.log('Token exists:', !!token);
    
    if (token) {
        config.headers.Authorization = `Token ${token}`;
        console.log('Authorization header set:', config.headers.Authorization);
    }
    return config;
});

export const auth = {
    login: async (username, password) => {
        console.log('Sending login request to API:', username);
        const response = await api.post('/auth/login/', { username, password });
        console.log('Login API response structure:', JSON.stringify(response.data));
        return response;
    },
    
    register: async (userData) => {
        console.log('Register API called with data:', userData);
        console.log('Register API URL:', `${API_URL}/auth/register/`);
        
        try {
            const response = await api.post('/auth/register/', userData);
            console.log('Register API response:', response);
            return response;
        } catch (error) {
            console.error('Register API error:', error);
            if (error.response) {
                console.error('Error response:', error.response.data);
                console.error('Status code:', error.response.status);
                console.error('Headers:', error.response.headers);
            } else if (error.request) {
                console.error('No response received, request:', error.request);
            } else {
                console.error('Error message:', error.message);
            }
            throw error;
        }
    },
    
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
};

export const services = {
    getAll: async () => {
        // Get user type and ID from localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                console.log('User data loaded:', userData);
                
                // Wait for provider profile if needed
                if (userData.user_type === 'provider' && !userData.provider_profile) {
                    console.log('Fetching provider profile...');
                    const profileResponse = await api.get('/provider/profile/');
                    userData.provider_profile = profileResponse.data;
                    console.log('Provider profile loaded:', userData.provider_profile);
                }
                
                if (userData.user_type === 'provider' && userData.provider_profile) {
                    // If user is a provider, get only their services
                    console.log('Getting provider services for ID:', userData.provider_profile.id);
                    return api.get(`/services/provider/${userData.provider_profile.id}/`);
                }
            } catch (e) {
                console.error('Error parsing user data or fetching provider profile:', e);
            }
        }
        // For consumers or if user type can't be determined, get all services
        console.log('Getting all services');
        return api.get('/services/');
    },
    
    getByProvider: (providerId) => {
        console.log('Getting services for provider:', providerId);
        return api.get(`/services/provider/${providerId}/`);
    },
    
    getById: (id) =>
        api.get(`/services/${id}/`),
    
    create: (serviceData) =>
        api.post('/services/create/', serviceData),
    
    update: (id, serviceData) =>
        api.put(`/services/${id}/`, serviceData),
    
    delete: (id) =>
        api.delete(`/services/${id}/`),
    
    getCategories: () =>
        api.get('/services/categories/'),
};

export const providers = {
    getAll: () =>
        api.get('/providers/'),
    
    getById: (id) =>
        api.get(`/providers/${id}/`),
    
    update: (id, providerData) =>
        api.put(`/providers/${id}/`, providerData),
    
    updateBusinessHours: (id, businessHours) =>
        api.put(`/providers/${id}/business-hours/`, { business_hours: businessHours }),
        
    setup: (businessData) =>
        api.post('/provider/setup/', businessData),
        
    getProfile: () =>
        api.get('/provider/profile/'),
    
    updateUserInfo: (userData) =>
        api.put('/auth/profile/', userData),
    
    updatePassword: (passwordData) =>
        api.put('/auth/password/', passwordData),
        
    getDiscountConfig: () =>
        api.get('/provider/discount-config/'),
        
    updateDiscountConfig: (configData) =>
        api.put('/provider/discount-config/', configData),
};

export const appointments = {
    getAll: () => {
        // Get user type and ID from localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                if (userData.user_type === 'provider' && userData.provider_profile) {
                    // If user is a provider, get their appointments
                    return api.get(`/appointments/provider/${userData.provider_profile.id}/`);
                } else if (userData.user_type === 'consumer') {
                    // If user is a consumer, get their appointments
                    return api.get(`/appointments/consumer/${userData.id}/`);
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        // Default to getting all appointments if user type can't be determined
        return api.get('/appointments/');
    },
    
    getByProvider: (providerId) =>
        api.get(`/appointments/provider/${providerId}/`),
    
    getByConsumer: (consumerId) =>
        api.get(`/appointments/consumer/${consumerId}/`),
    
    getById: (id) =>
        api.get(`/appointments/${id}/`),
    
    create: (appointmentData) =>
        api.post('/appointments/', appointmentData),
    
    update: (id, appointmentData) =>
        api.put(`/appointments/${id}/`, appointmentData),
    
    updateStatus: (id, status) =>
        api.patch(`/appointments/${id}/status/`, { status }),
    
    delete: (id) =>
        api.delete(`/appointments/${id}/`),
};

// API service for provider availability
export const availability = {
    // Get availability for a specific provider
    getForProvider: (providerId) => {
        console.log('Getting availability for provider:', providerId);
        return api.get(`/providers/${providerId}/availability/`);
    },
    
    // Get availability for a specific service (which includes provider info)
    getForService: (serviceId) => {
        console.log('Getting availability for service:', serviceId);
        return api.get(`/services/${serviceId}/availability/`);
    },
    
    // Get availability with proximity discount for a specific service
    getForServiceWithDiscount: (serviceId) => {
        console.log('Getting availability with discount for service:', serviceId);
        return api.get(`/services/${serviceId}/availability-with-discount/`);
    },
    
    // Save provider availability
    save: (providerId, availabilityData) => {
        console.log('Saving availability for provider:', providerId);
        console.log('Availability data being sent:', availabilityData);
        return api.post(`/providers/${providerId}/availability/`, availabilityData);
    },
    
    // Get provider profile
    getProviderProfile: () => {
        console.log('Getting provider profile');
        return api.get('/provider/profile/');
    }
};

// Export the configured axios instance for direct use
export { api }; 