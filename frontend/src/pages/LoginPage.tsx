import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Show success message from registration
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [location.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Tên đăng nhập là bắt buộc';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await authAPI.login({
        username: formData.username,
        password: formData.password
      });
      
      login(response.user, response.token);
      
      // Redirect based on role or intended destination
      const from = location.state?.from?.pathname || '/';
      if (response.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate(from);
      }
      
    } catch (error: any) {
      console.error('Lỗi đăng nhập:', error);
      if (error.response?.data?.detail) {
        setErrors({ general: error.response.data.detail });
      } else {
        setErrors({ general: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'guest') => {
    setLoading(true);
    const demoCredentials = {
      admin: { username: 'admin', password: 'admin123' },
      guest: { username: 'guest1', password: 'guest123' }
    };

    try {
      const response = await authAPI.login(demoCredentials[role]);
      login(response.user, response.token);
      
      if (response.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      setErrors({ general: 'Không thể đăng nhập với tài khoản demo' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
      {/* Background (removed for production) */}

      <div className="relative max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8 fade-in-up">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
              <span className="text-white text-4xl"></span>
            </div>
          </div>
          <h1 className="heading-lg text-gradient-primary mb-2">Đăng Nhập</h1>
          <p className="text-gray-600 text-lg">
            Đăng nhập để tiếp tục trải nghiệm tuyệt vời
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl bounce-in">
            <div className="flex items-center">
              <span className="text-green-500 text-xl mr-3">✅</span>
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <div className="modern-card rounded-2xl p-8 shadow-2xl slide-in-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Error */}
            {errors.general && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center">
                  <span className="text-red-500 text-xl mr-3">❌</span>
                  <p className="text-red-800 font-medium">{errors.general}</p>
                </div>
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700">Tên đăng nhập</label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                className={`input-modern w-full ${errors.username ? 'border-red-500' : ''}`}
                placeholder="Nhập tên đăng nhập"
                disabled={loading}
              />
              {errors.username && (
                <p className="text-red-600 text-sm font-medium">{errors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Mật khẩu</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`input-modern w-full pr-12 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Nhập mật khẩu"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm font-medium">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-600">Ghi nhớ đăng nhập</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Quên mật khẩu?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Đang đăng nhập...
                </div>
              ) : (
                '🚀 Đăng Nhập'
              )}
            </button>
          </form>

          {/* Demo buttons removed for production */}

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Chưa có tài khoản?{' '}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Features removed */}

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 