export interface User {
    id: number;
    username: string;
    email: string;
    user_type: 'provider' | 'consumer';
    phone_number?: string;
    address?: string;
    needs_setup?: boolean;
}

export interface ServiceProvider {
    id: number;
    user: User;
    business_name: string;
    business_description: string;
    business_hours: BusinessHours;
    created_at: string;
    updated_at: string;
}

export interface Service {
    id: number;
    provider: ServiceProvider;
    name: string;
    description: string;
    duration: number;
    price: number;
    category: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Appointment {
    id: number;
    service: Service;
    consumer: User;
    start_time: string;
    end_time: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface BusinessHours {
    [key: string]: {
        open: string;
        close: string;
    };
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
}

export interface AppointmentCreateRequest {
    service: number;  // service ID
    start_time: string;
    end_time: string;
    notes?: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    client_email?: string;
    client_phone?: string;
    client_address?: string;
}

export interface ServiceCreateRequest {
    name: string;
    description: string;
    duration: number;
    price: number;
    category: string;
    is_active: boolean;
}

export interface UserRegisterRequest {
    username: string;
    email: string;
    password: string;
    user_type: 'provider' | 'consumer';
    phone_number?: string;
    address?: string;
}

// API service interfaces
export interface ApiService {
    getAll(): Promise<{ data: Service[] }>;
    getById(id: number): Promise<{ data: Service }>;
    create(data: ServiceCreateRequest): Promise<{ data: Service }>;
    update(id: number, data: Partial<ServiceCreateRequest>): Promise<{ data: Service }>;
    delete(id: number): Promise<void>;
    getCategories(): Promise<{ data: ServiceCategory[] }>;
}

export interface ApiAppointment {
    getAll(): Promise<{ data: Appointment[] }>;
    getById(id: number): Promise<{ data: Appointment }>;
    create(data: AppointmentCreateRequest): Promise<{ data: Appointment }>;
    update(id: number, data: Partial<AppointmentCreateRequest>): Promise<{ data: Appointment }>;
    updateStatus(id: number, status: Appointment['status']): Promise<{ data: Appointment }>;
    delete(id: number): Promise<void>;
    getAllForProvider(): Promise<{ data: Appointment[] }>;
}

export interface ServiceCategory {
    value: string;
    label: string;
}

export interface TimeBlock {
    id: string;
    start: Date;
    end: Date;
} 