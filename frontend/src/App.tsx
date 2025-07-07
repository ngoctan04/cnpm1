import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RoomsPage from './pages/RoomsPage';
import BookingsPage from './pages/BookingsPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import HotelDetailPage from './pages/HotelDetailPage';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Enhanced Navbar component with authentication
const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white backdrop-blur-lg bg-opacity-95 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
              <span className="text-white text-2xl"></span>
            </div>
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              LuxuryStay
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 relative group">
              Trang Chủ
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-200"></span>
            </Link>
            <Link to="/rooms" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 relative group">
               Phòng
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-200"></span>
            </Link>
            
            {user ? (
              <>
                <Link to="/bookings" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 relative group">
                   Đặt Phòng
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-200"></span>
                </Link>
                <Link to="/profile" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 relative group">
                  Hồ Sơ
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-200"></span>
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-purple-600 hover:text-purple-800 font-medium transition-colors duration-200 relative group">
                    Admin
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-600 group-hover:w-full transition-all duration-200"></span>
                  </Link>
                )}
                <div className="flex items-center space-x-3">
                  <span className="text-gray-700 text-sm">
                    Chào, {user.first_name || user.username}!
                  </span>
                  <button
                    onClick={logout}
                    className="text-red-600 hover:text-red-800 font-medium transition-colors duration-200"
                  >
                    Đăng Xuất
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                  Đăng Nhập
                </Link>
                <Link to="/register" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
                  Đăng Ký
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-gray-700 hover:text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Enhanced Footer component
const Footer = () => (
  <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Company Info */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-400 to-purple-400 p-2 rounded-xl">
              <span className="text-white text-xl"></span>
            </div>
            <span className="text-xl font-bold">LuxuryStay</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            Nền tảng đặt phòng khách sạn hàng đầu Việt Nam. 
            Mang đến trải nghiệm nghỉ dưỡng tuyệt vời nhất cho mọi chuyến đi.
          </p>
          <div className="flex space-x-4">
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
              <span className="text-xl">📘</span>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
              <span className="text-xl">📱</span>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
              <span className="text-xl">📧</span>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">🔗 Liên Kết Nhanh</h3>
          <ul className="space-y-3">
            <li><Link to="/" className="text-gray-300 hover:text-white transition-colors duration-200">Trang Chủ</Link></li>
            <li><Link to="/rooms" className="text-gray-300 hover:text-white transition-colors duration-200">Phòng</Link></li>
            <li><Link to="/bookings" className="text-gray-300 hover:text-white transition-colors duration-200">Đặt Phòng</Link></li>
            <li><Link to="/profile" className="text-gray-300 hover:text-white transition-colors duration-200">Hồ Sơ</Link></li>
            <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors duration-200">Liên Hệ</Link></li>
          </ul>
        </div>

        {/* Customer Support */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">🎧 Hỗ Trợ Khách Hàng</h3>
          <ul className="space-y-3">
            <li><Link to="/help" className="text-gray-300 hover:text-white transition-colors duration-200">Trung Tâm Trợ Giúp</Link></li>
            <li><Link to="/faq" className="text-gray-300 hover:text-white transition-colors duration-200">Câu Hỏi Thường Gặp</Link></li>
            <li><Link to="/terms" className="text-gray-300 hover:text-white transition-colors duration-200">Điều Khoản</Link></li>
            <li><Link to="/privacy" className="text-gray-300 hover:text-white transition-colors duration-200">Bảo Mật</Link></li>
            <li className="text-gray-300"> Hotline: 1900-1234</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-700 mt-12 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm">
            © 2024 LuxuryStay. Tất cả quyền được bảo lưu.
          </div>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <span className="text-gray-400 text-sm">🌟 Phục vụ hơn 100,000+ khách hàng</span>
            <span className="text-gray-400 text-sm"> Đánh giá 4.8/5 sao</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/hotels/:id" element={<HotelDetailPage />} />
                
                {/* Protected Routes */}
                <Route 
                  path="/bookings" 
                  element={
                    <ProtectedRoute>
                      <BookingsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* 404 Page */}
                <Route 
                  path="*" 
                  element={
                    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
                      <div className="text-center">
                        <div className="text-8xl mb-4">🔍</div>
                        <h2 className="text-4xl font-bold text-gray-800 mb-4">404 - Không tìm thấy trang</h2>
                        <p className="text-gray-600 mb-6">Trang bạn đang tìm kiếm không tồn tại.</p>
                        <Link to="/" className="btn-primary inline-block hover-lift">
                          🏠 Về trang chủ
                        </Link>
                      </div>
                    </div>
                  } 
                />
              </Routes>
            </main>
            
            <Footer />
          </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App; 