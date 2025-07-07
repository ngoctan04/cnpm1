import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { User } from '../types';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [showPasswordChange, setShowPasswordChange] = useState(false);

  // Initialize form data with user info
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        username: user.username || ''
      });
    }
  }, [user]);

  // Fetch user profile
  const { data: profile, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => authAPI.getProfile(),
    enabled: !!user
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.updateProfile(formData);
      setMessage('Cập nhật thông tin thành công!');
      setEditMode(false);
      refetch();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (passwordData.new_password.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      setMessage('Đổi mật khẩu thành công!');
      setShowPasswordChange(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Vui lòng đăng nhập
          </h2>
          <p className="text-gray-600">
            Bạn cần đăng nhập để xem thông tin cá nhân
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 fade-in-up">
          <h1 className="heading-lg text-gradient-primary mb-2">
            👤 Thông Tin Cá Nhân
          </h1>
          <p className="text-gray-600 text-lg">
            Quản lý thông tin và cài đặt tài khoản của bạn
          </p>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl bounce-in">
            <div className="flex items-center">
              <span className="text-green-500 text-xl mr-3">✅</span>
              <p className="text-green-800 font-medium">{message}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-3">❌</span>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <div className="modern-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                   Thông tin cá nhân
                </h2>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                    editMode 
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                      : 'btn-primary hover-lift'
                  }`}
                >
                  {editMode ? '❌ Hủy' : '✏️ Chỉnh sửa'}
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Họ
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      className={`input-modern w-full ${!editMode ? 'bg-gray-50' : ''}`}
                      placeholder="Nhập họ của bạn"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tên
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      className={`input-modern w-full ${!editMode ? 'bg-gray-50' : ''}`}
                      placeholder="Nhập tên của bạn"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📧 Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`input-modern w-full ${!editMode ? 'bg-gray-50' : ''}`}
                    placeholder="Nhập email của bạn"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📱 Số điện thoại
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`input-modern w-full ${!editMode ? 'bg-gray-50' : ''}`}
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    👤 Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`input-modern w-full ${!editMode ? 'bg-gray-50' : ''}`}
                    placeholder="Nhập tên đăng nhập"
                  />
                </div>

                {editMode && (
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Đang cập nhật...
                        </div>
                      ) : (
                        '✅ Cập nhật'
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Password Change Section */}
            {showPasswordChange && (
              <div className="modern-card rounded-2xl p-6 mt-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  🔒 Đổi mật khẩu
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      type="password"
                      name="current_password"
                      value={passwordData.current_password}
                      onChange={handlePasswordChange}
                      className="input-modern w-full"
                      placeholder="Nhập mật khẩu hiện tại"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      name="new_password"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      className="input-modern w-full"
                      placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      name="confirm_password"
                      value={passwordData.confirm_password}
                      onChange={handlePasswordChange}
                      className="input-modern w-full"
                      placeholder="Nhập lại mật khẩu mới"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowPasswordChange(false)}
                      className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Đang đổi...
                        </div>
                      ) : (
                        '🔒 Đổi mật khẩu'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Info Card */}
            <div className="modern-card rounded-2xl p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {user.first_name?.charAt(0) || user.username?.charAt(0) || '👤'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">
                {user.first_name && user.last_name 
                  ? `${user.last_name} ${user.first_name}`
                  : user.username}
              </h3>
              <p className="text-gray-600 mb-3">
                {user.email}
              </p>
              <div className="flex justify-center mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  user.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {user.role === 'admin' ? '👑 Admin' : '👤 Khách hàng'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Thành viên từ {new Date(user.created_at || '').toLocaleDateString('vi-VN', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="modern-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                 Thao tác nhanh
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-semibold hover:bg-blue-100 transition-colors"
                >
                  🔒 Đổi mật khẩu
                </button>
                <a
                  href="/bookings"
                  className="block w-full text-left px-4 py-3 bg-green-50 text-green-700 rounded-xl font-semibold hover:bg-green-100 transition-colors"
                >
                   Xem lịch sử đặt phòng
                </a>
                <a
                  href="/rooms"
                  className="block w-full text-left px-4 py-3 bg-purple-50 text-purple-700 rounded-xl font-semibold hover:bg-purple-100 transition-colors"
                >
                   Tìm phòng mới
                </a>
              </div>
            </div>

            {/* Account Settings */}
            <div className="modern-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                ⚙️ Cài đặt tài khoản
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Nhận thông báo email</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Nhận tin khuyến mãi</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Chế độ tối</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Logout */}
            <div className="modern-card rounded-2xl p-6">
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 bg-red-50 text-red-700 rounded-xl font-semibold hover:bg-red-100 transition-colors"
              >
                🚪 Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 