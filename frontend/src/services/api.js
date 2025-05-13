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
    } else {
        console.warn('No token available for request to:', config.url);
    }
    return config;
});

// Add response interceptor to help with auth errors
api.interceptors.response.use(
    (response) => {
        // Successful response
        return response;
    },
    (error) => {
        // Handle error
        if (error.response) {
            console.error('API error response:', {
                status: error.response.status,
                data: error.response.data,
                url: error.config.url
            });
            
            // If 401 Unauthorized, the token might be invalid
            if (error.response.status === 401) {
                console.error('Authentication token expired or invalid');
                // We don't automatically clear the token here, letting components handle this
            }
        } else if (error.request) {
            console.error('API error (no response):', error.request);
        } else {
            console.error('API setup error:', error.message);
        }
        return Promise.reject(error);
    }
);

// Create a non-authenticated axios instance for public endpoints
const publicApi = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Also add interceptors to publicApi
publicApi.interceptors.request.use((config) => {
    console.log('Public API Request to:', config.url);
    return config;
});

publicApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error('Public API error:', {
                status: error.response.status,
                data: error.response.data,
                url: error.config.url
            });
        } else if (error.request) {
            console.error('Public API error (no response):', error.request);
        } else {
            console.error('Public API setup error:', error.message);
        }
        return Promise.reject(error);
    }
);

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
    getAll: () => {
        console.log('Getting all services (auth required)');
        return api.get('/services/');
    },
    
    getById: (id) =>
        api.get(`/services/${id}/`),
    
    create: (serviceData) =>
        api.post('/services/create/', serviceData),
    
    update: (id, serviceData) =>
        api.post('/services/create/', { ...serviceData, id }),
    
    delete: (id) =>
        api.delete(`/services/${id}/`),
    
    getCategories: () => {
        console.log('Getting service categories (auth required)');
        return api.get('/services/categories/');
    },
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
};

export const appointments = {
    getAll: () =>
        api.get('/appointments/'),
    
    getById: (id) =>
        api.get(`/appointments/${id}/`),
    
    create: async (appointmentData) => {
        console.log('Creating appointment with data:', appointmentData);
        try {
            const response = await api.post('/appointments/', appointmentData);
            console.log('Appointment created successfully:', response.data);
            return response;
        } catch (error) {
            console.error('Error creating appointment:', error);
            if (error.response) {
                console.error('Error response data:', error.response.data);
                console.error('Status code:', error.response.status);
            } else if (error.request) {
                console.error('No response received, request:', error.request);
            } else {
                console.error('Error message:', error.message);
            }
            throw error;
        }
    },
    
    update: (id, appointmentData) =>
        api.put(`/appointments/${id}/`, appointmentData),
    
    updateStatus: async (id, status) => {
        console.log('Updating appointment status:', id, status);
        // Backend now accepts UUID directly in the URL
        return api.patch(`/appointments/${id}/status/`, { status });
    },
    
    delete: (id) =>
        api.delete(`/appointments/${id}/`),
        
    getAllForProvider: () =>
        api.get('/appointments/'),
};

// API service for provider availability
export const availability = {
    // Get availability for a specific provider
    getForProvider: (providerId) => {
        console.log('Getting availability for provider:', providerId);
        return api.get(`/providers/${providerId}/availability/`);
    },
    
    // Get availability for a specific service (which includes provider info)
    getForService: (serviceId, customUrl = null) => {
        console.log('Getting availability for service:', serviceId);
        
        // If a custom URL with location params is provided, use it
        if (customUrl) {
            console.log('Using custom URL for availability:', customUrl);
            return api.get(customUrl);
        }
        
        return api.get(`/services/${serviceId}/availability/`);
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

// Discount tiers management
export const discountTiers = {
    getAll: () => api.get('/discount-tiers/'),
    create: (data) => api.post('/discount-tiers/', data),
};

// Export the configured axios instance for direct use
export { api }; 