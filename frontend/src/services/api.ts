import axios from 'axios';
import { AuthResponse, User, Service, ServiceProvider, Appointment, AppointmentCreateRequest, ServiceCreateRequest, UserRegisterRequest, ApiService, ApiAppointment, ServiceCategory, TimeBlock } from '../types';

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
    login: (username: string, password: string) =>
        api.post<AuthResponse>('/auth/login/', { username, password }),
    
    register: (userData: UserRegisterRequest) =>
        api.post<AuthResponse>('/auth/register/', userData),
    
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
};

export const services: ApiService = {
    getAll: () => 
        api.get<Service[]>('/services/'),
    
    getById: (id: number) =>
        api.get<Service>(`/services/${id}/`),
    
    create: (serviceData: ServiceCreateRequest) =>
        api.post<Service>('/services/create/', serviceData),
    
    update: (id: number, serviceData: Partial<ServiceCreateRequest>) =>
        api.post<Service>('/services/create/', { ...serviceData, id }),
    
    delete: (id: number) =>
        api.delete(`/services/${id}/`),
    
    getCategories: () =>
        api.get<ServiceCategory[]>('/services/categories/'),
};

export const providers = {
    getAll: () =>
        api.get<ServiceProvider[]>('/providers/'),
    
    getById: (id: number) =>
        api.get<ServiceProvider>(`/providers/${id}/`),
    
    update: (id: number, providerData: Partial<ServiceProvider>) =>
        api.put<ServiceProvider>(`/providers/${id}/`, providerData),
    
    updateBusinessHours: (id: number, businessHours: Record<string, { open: string; close: string }>) =>
        api.put<ServiceProvider>(`/providers/${id}/business-hours/`, { business_hours: businessHours }),
        
    setup: (businessData: { business_name: string, business_description: string }) =>
        api.post<ServiceProvider>('/provider/setup/', businessData),
        
    getProfile: () =>
        api.get<ServiceProvider>('/provider/profile/'),
    
    updateUserInfo: (userData: { email?: string; phone_number?: string; address?: string }) =>
        api.put<User>('/auth/profile/', userData),
    
    updatePassword: (passwordData: { current_password: string; new_password: string }) =>
        api.put<{ message: string; token: string }>('/auth/password/', passwordData),
};

export const appointments: ApiAppointment = {
    getAll: () =>
        api.get<Appointment[]>('/appointments/'),
    
    getById: (id: number) =>
        api.get<Appointment>(`/appointments/${id}/`),
    
    create: (appointmentData: AppointmentCreateRequest) =>
        api.post<Appointment>('/appointments/', appointmentData),
    
    update: (id: number, appointmentData: Partial<AppointmentCreateRequest>) =>
        api.put<Appointment>(`/appointments/${id}/`, appointmentData),
    
    updateStatus: (id: number, status: Appointment['status']) =>
        api.patch<Appointment>(`/appointments/${id}/status/`, { status }),
    
    delete: (id: number) =>
        api.delete(`/appointments/${id}/`),
        
    getAllForProvider: () =>
        api.get<Appointment[]>('/appointments/'),
};

// New API service for provider availability
export const availability = {
    // Get availability for a specific provider
    getForProvider: (providerId: number) => {
        console.log('API: Getting availability for provider:', providerId);
        return api.get<Record<string, TimeBlock[]>>(`/providers/${providerId}/availability/`);
    },
    
    // Get availability for a specific service (which includes provider info)
    getForService: (serviceId: number) => {
        console.log('API: Getting availability for service:', serviceId);
        return api.get<Record<string, TimeBlock[]>>(`/services/${serviceId}/availability/`);
    },
    
    // Save provider availability
    save: (providerId: number, availabilityData: Record<string, TimeBlock[]>) => {
        console.log('API: Saving availability for provider:', providerId);
        console.log('API: Availability data being sent:', availabilityData);
        return api.post<Record<string, TimeBlock[]>>(`/providers/${providerId}/availability/`, availabilityData);
    },
    
    // Get provider profile
    getProviderProfile: () => {
        console.log('API: Getting provider profile');
        return api.get<ServiceProvider>('/provider/profile/');
    }
};

// Export the configured axios instance for direct use
export { api }; 