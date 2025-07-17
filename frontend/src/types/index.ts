// User types
export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'guest' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: 'guest' | 'admin';
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
}

// Authentication types
export interface Token {
  access_token: string;
  token_type: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  loginWithCredentials: (credentials: UserLogin) => Promise<void>;
  register: (userData: UserCreate) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Hotel types
export interface Hotel {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  rating?: number;
  star_rating?: number;
  amenities?: string;
  images?: string[];
  created_at: string;
  updated_at: string;
}

export interface HotelCreate {
  name: string;
  address: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  description?: string;
  star_rating?: number;
  amenities?: string;
}

export interface HotelUpdate {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  description?: string;
  star_rating?: number;
  amenities?: string;
}

// Room types
export interface Room {
  id: number;
  hotel_id: number;
  room_number: string;
  room_type: 'single' | 'double' | 'suite' | 'deluxe';
  price_per_night: number;
  capacity: number;
  description?: string;
  amenities?: string;
  images?: string[];
  is_available: boolean;
  created_at: string;
  updated_at: string;
  hotel?: Hotel;
}

export interface RoomCreate {
  hotel_id: number;
  room_number: string;
  room_type: 'single' | 'double' | 'suite' | 'deluxe';
  price_per_night: number;
  capacity: number;
  description?: string;
  amenities?: string;
  images?: string[];
}

export interface RoomUpdate {
  room_number?: string;
  room_type?: 'single' | 'double' | 'suite' | 'deluxe';
  price_per_night?: number;
  capacity?: number;
  description?: string;
  amenities?: string;
  images?: string[];
  is_available?: boolean;
}

export interface RoomSearchFilters {
  hotel_id?: number;
  room_type?: string;
  min_price?: number;
  max_price?: number;
  capacity?: number;
  check_in_date?: string;
  check_out_date?: string;
  is_available?: boolean;
}

// Booking types
export interface Booking {
  id: number;
  user_id: number;
  room_id: number;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  guest_count: number;
  booking_reference?: string;
  special_requests?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  room?: Room;
}

export interface BookingCreate {
  room_id: number;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  special_requests?: string;
}

export interface BookingUpdate {
  check_in_date?: string;
  check_out_date?: string;
  guest_count?: number;
  special_requests?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

export interface BookingSearchFilters {
  user_id?: number;
  room_id?: number;
  status?: string;
  check_in_date?: string;
  check_out_date?: string;
  start_date?: string;
  end_date?: string;
}

// Payment types
export interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  payment_method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_date?: string;
  created_at: string;
  updated_at: string;
  booking?: Booking;
}

export interface PaymentCreate {
  booking_id: number;
  amount: number;
  payment_method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  transaction_id?: string;
}

export interface PaymentUpdate {
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  payment_date?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  detail?: string;
  status?: number;
}

// Form types
export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface BookingFormData {
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  special_requests?: string;
}

export interface PaymentFormData {
  payment_method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  card_number?: string;
  expiry_date?: string;
  cvv?: string;
  cardholder_name?: string;
}

// Utility types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SearchParams {
  query?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

// Type aliases for API compatibility
export type CreateUserData = UserCreate;
export type CreateHotelData = HotelCreate;
export type CreateRoomData = RoomCreate;
export type CreateBookingData = BookingCreate;
export type CreatePaymentData = PaymentCreate;

export type UpdateUserData = UserUpdate;
export type UpdateHotelData = HotelUpdate;
export type UpdateRoomData = RoomUpdate;
export type UpdateBookingData = BookingUpdate;
export type UpdatePaymentData = PaymentUpdate;

// Additional type aliases for component compatibility
export type RoomType = 'single' | 'double' | 'suite' | 'deluxe';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'; 
