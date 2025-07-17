import axios from 'axios';
import { 
  User, Hotel, Room, Booking, Payment,
  CreateUserData, CreateHotelData, CreateRoomData, CreateBookingData, CreatePaymentData,
  UpdateUserData, UpdateHotelData, UpdateRoomData, UpdateBookingData, UpdatePaymentData
} from '../types';

// Đảm bảo BASE_URL luôn có hậu tố /api/v1
const rawBase = process.env.REACT_APP_API_URL || 'http://localhost:8000';
// Xóa dấu / cuối nếu có
const normalizedBase = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const BASE_URL = normalizedBase.endsWith('/api/v1') ? normalizedBase : `${normalizedBase}/api/v1`;

// ADD: derive media base URL (API origin without /api/v1)
export const MEDIA_BASE_URL = normalizedBase.replace(/\/?api\/v1$/, '');
export const getMediaUrl = (relativePath: string) =>
  relativePath.startsWith('http') ? relativePath : `${MEDIA_BASE_URL}${relativePath}`;

// Tạo axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor để thêm token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor để xử lý lỗi
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn, chuyển về trang đăng nhập
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========== AUTH API ==========
export const authAPI = {
  // Đăng ký
  register: async (userData: CreateUserData) => {
    const response = await api.post('/users/register', userData);
    return response.data;
  },

  // Đăng nhập
  login: async (credentials: { username: string; password: string }) => {
    const response = await api.post('/users/login', credentials);
    const { access_token, user } = response.data;
    
    // Lưu token và user info
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { token: access_token, user };
  },

  // Đăng xuất
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Lấy thông tin user hiện tại
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },

  // Lấy profile user hiện tại
  getProfile: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },

  // Cập nhật profile user hiện tại
  updateProfile: async (userData: UpdateUserData): Promise<User> => {
    const response = await api.put('/users/me', userData);
    return response.data;
  },

  // Thay đổi mật khẩu
  changePassword: async (passwords: { current_password: string; new_password: string }) => {
    const response = await api.post('/users/me/change-password', passwords);
    return response.data;
  },
};

// ========== HOTELS API ==========
export const hotelsAPI = {
  // Lấy danh sách khách sạn
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    city?: string;
    country?: string;
    min_rating?: number;
    search?: string;
  }) => {
    const response = await api.get('/hotels/', { params });
    return response.data.data; // Backend returns {code, message, data}
  },

  // Lấy khách sạn theo ID
  getById: async (hotelId: number): Promise<Hotel> => {
    const response = await api.get(`/hotels/${hotelId}`);
    return response.data.data; // Backend returns {code, message, data}
  },
};

// ========== ROOMS API ==========
export const roomsAPI = {
  // Lấy danh sách phòng
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    hotel_id?: string;
    room_type?: string;
    min_price?: string;
    max_price?: string;
    capacity?: number;
    available_only?: boolean;
    check_in?: string;
    check_out?: string;
  }) => {
    const response = await api.get('/rooms/', { params });
    return response.data;
  },

  // Lấy phòng theo ID
  getById: async (roomId: number): Promise<Room> => {
    const response = await api.get(`/rooms/${roomId}`);
    return response.data;
  },
};

// ========== BOOKINGS API ==========
export const bookingsAPI = {
  // Tạo booking mới
  create: async (bookingData: CreateBookingData): Promise<Booking> => {
    const response = await api.post('/bookings/', bookingData);
    return response.data;
  },

  // Lấy danh sách booking
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    user_id?: number;
    room_id?: number;
    hotel_id?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await api.get('/bookings/', { params });
    return response.data;
  },

  // Lấy booking của user hiện tại
  getMyBookings: async () => {
    const response = await api.get('/bookings/my-bookings/');
    return response.data;
  },

  // Hủy booking
  cancel: async (bookingId: string) => {
    const response = await api.post(`/bookings/${bookingId}/cancel/`);
    return response.data;
  },

  // Lấy booking theo ID
  getById: async (bookingId: number): Promise<Booking> => {
    const response = await api.get(`/bookings/${bookingId}/`);
    return response.data;
  },
};

// ========== PAYMENTS API ==========
export const paymentsAPI = {
  // Lấy danh sách thanh toán
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    booking_id?: number;
    user_id?: number;
    status?: string;
    payment_method?: string;
  }) => {
    const response = await api.get('/payments', { params });
    return response.data;
  },

  // Lấy thanh toán theo ID
  getById: async (paymentId: number): Promise<Payment> => {
    const response = await api.get(`/payments/${paymentId}`);
    return response.data;
  },
};

// ========== ADMIN API ==========
export const adminAPI = {
  // Lấy thống kê tổng quan
  getStats: async () => {
    const response = await api.get('/users/stats/overview');
    return response.data;
  },

  // ========== USERS MANAGEMENT ==========
  // Lấy danh sách users
  getUsers: async () => {
    const response = await api.get('/users/');
    return response.data;
  },

  // Tạo user mới
  createUser: async (userData: CreateUserData) => {
    const response = await api.post('/users/', userData);
    return response.data;
  },

  // Cập nhật user
  updateUser: async (userId: number, userData: UpdateUserData) => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },

  // Xóa user
  deleteUser: async (userId: number) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },

  // ========== HOTELS MANAGEMENT ==========
  // Lấy danh sách hotels
  getHotels: async () => {
    const response = await api.get('/hotels/');
    return response.data;
  },

  // Tạo hotel mới
  createHotel: async (hotelData: CreateHotelData) => {
    const response = await api.post('/hotels/', hotelData);
    return response.data;
  },

  // Cập nhật hotel
  updateHotel: async (hotelId: number, hotelData: UpdateHotelData) => {
    const response = await api.put(`/hotels/${hotelId}`, hotelData);
    return response.data;
  },

  // Xóa hotel
  deleteHotel: async (hotelId: number) => {
    const response = await api.delete(`/hotels/${hotelId}`);
    return response.data;
  },

  // ========== ROOMS MANAGEMENT ==========
  // Lấy danh sách rooms
  getRooms: async () => {
    const response = await api.get('/rooms/');
    return response.data;
  },

  // Tạo room mới
  createRoom: async (roomData: CreateRoomData) => {
    const response = await api.post('/rooms/', roomData);
    return response.data;
  },

  // Cập nhật room
  updateRoom: async (roomId: number, roomData: UpdateRoomData) => {
    const response = await api.put(`/rooms/${roomId}`, roomData);
    return response.data;
  },

  // Xóa room
  deleteRoom: async (roomId: number) => {
    const response = await api.delete(`/rooms/${roomId}`);
    return response.data;
  },

  // Đặt phòng vào bảo trì
  setRoomMaintenance: async (roomId: number, isMaintenance: boolean) => {
    const response = await api.post(`/rooms/${roomId}/maintenance?is_maintenance=${isMaintenance}`);
    return response.data;
  },

  // ========== BOOKINGS MANAGEMENT ==========
  // Lấy danh sách bookings
  getBookings: async () => {
    const response = await api.get('/bookings/');
    return response.data;
  },

  // Xác nhận booking
  confirmBooking: async (bookingId: number) => {
    const response = await api.post(`/bookings/${bookingId}/confirm`);
    return response.data;
  },

  // Từ chối booking (hủy)
  rejectBooking: async (bookingId: number) => {
    const response = await api.post(`/bookings/${bookingId}/cancel/`);
    return response.data;
  },

  // Cập nhật booking
  updateBooking: async (bookingId: number, bookingData: UpdateBookingData) => {
    const response = await api.put(`/bookings/${bookingId}`, bookingData);
    return response.data;
  },

  // Xóa booking
  deleteBooking: async (bookingId: number) => {
    const response = await api.delete(`/bookings/${bookingId}`);
    return response.data;
  },

  // ========== PAYMENTS MANAGEMENT ==========
  // Lấy danh sách payments
  getPayments: async () => {
    const response = await api.get('/payments');
    return response.data;
  },

  // Tạo payment mới
  createPayment: async (paymentData: CreatePaymentData) => {
    const response = await api.post('/payments', paymentData);
    return response.data;
  },

  // Cập nhật payment
  updatePayment: async (paymentId: number, paymentData: UpdatePaymentData) => {
    const response = await api.put(`/payments/${paymentId}`, paymentData);
    return response.data;
  },

  // Xóa payment
  deletePayment: async (paymentId: number) => {
    const response = await api.delete(`/payments/${paymentId}`);
    return response.data;
  },
};

// ========== UTILITY FUNCTIONS ==========
export const utilsAPI = {
  // Kiểm tra health của API
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Format currency
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  },

  // Format date
  formatDate: (date: string | Date): string => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));
  },

  // Format datetime
  formatDateTime: (date: string | Date): string => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  },
};

// Upload images for hotels
export const uploadHotelImages = async (hotelId: number, files: File[]): Promise<string[]> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(`${BASE_URL}/hotels/${hotelId}/upload-images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return data.data;
};

// Upload images for rooms
export const uploadRoomImages = async (roomId: number, files: File[]): Promise<string[]> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(`${BASE_URL}/rooms/${roomId}/upload-images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return data.data;
};

export default api; 