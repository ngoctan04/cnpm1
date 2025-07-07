import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI, uploadHotelImages, getMediaUrl } from '../services/api';
import { User, Hotel, Room, Booking } from '../types';
import AdminModal from '../components/AdminModals';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'hotels' | 'rooms' | 'bookings'>('overview');
  const queryClient = useQueryClient();
  
  // Modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Form data states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [deleteItem, setDeleteItem] = useState<{type: string, id: number, name: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Fetch admin data
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminAPI.getStats(),
    enabled: user?.role === 'admin'
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminAPI.getUsers(),
    enabled: user?.role === 'admin' && activeTab === 'users'
  });

  const { data: hotels } = useQuery({
    queryKey: ['admin-hotels'],
    queryFn: () => adminAPI.getHotels(),
    enabled: user?.role === 'admin' && activeTab === 'hotels'
  });

  const { data: rooms } = useQuery({
    queryKey: ['admin-rooms'],
    queryFn: () => adminAPI.getRooms(),
    enabled: user?.role === 'admin' && activeTab === 'rooms'
  });

  const { data: bookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => adminAPI.getBookings(),
    enabled: user?.role === 'admin' && activeTab === 'bookings'
  });

  // Mutations for CRUD operations
  const confirmBookingMutation = useMutation(adminAPI.confirmBooking, {
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-bookings']);
      alert('Xác nhận booking thành công!');
    },
    onError: () => alert('Lỗi khi xác nhận booking!')
  });

  const rejectBookingMutation = useMutation(adminAPI.rejectBooking, {
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-bookings']);
      alert('Từ chối booking thành công!');
    },
    onError: () => alert('Lỗi khi từ chối booking!')
  });

  const deleteItemMutation = useMutation(
    async ({ type, id }: { type: string; id: number }) => {
      switch (type) {
        case 'user': return await adminAPI.deleteUser(id);
        case 'hotel': return await adminAPI.deleteHotel(id);
        case 'room': return await adminAPI.deleteRoom(id);
        case 'booking': return await adminAPI.deleteBooking(id);
        default: throw new Error('Unknown type');
      }
    },
    {
      onSuccess: (_, { type }) => {
        queryClient.invalidateQueries([`admin-${type}s`]);
        setIsDeleteModalOpen(false);
        setDeleteItem(null);
        alert('Xóa thành công!');
      },
      onError: () => alert('Lỗi khi xóa!')
    }
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper functions
  const openEditModal = (type: string, item: any) => {
    switch (type) {
      case 'user':
        setSelectedUser(item);
        setIsUserModalOpen(true);
        break;
      case 'hotel':
        setSelectedHotel(item);
        setIsHotelModalOpen(true);
        break;
      case 'room':
        setSelectedRoom(item);
        setIsRoomModalOpen(true);
        break;
    }
  };

  const openDeleteModal = (type: string, id: number, name: string) => {
    setDeleteItem({ type, id, name });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmBooking = (bookingId: number) => {
    if (window.confirm('Xác nhận booking này?')) {
      confirmBookingMutation.mutate(bookingId);
    }
  };

  const handleRejectBooking = (bookingId: number) => {
    if (window.confirm('Từ chối booking này?')) {
      rejectBookingMutation.mutate(bookingId);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((f) => f.type.startsWith('image/') && f.size > 0);

    if (validFiles.length !== files.length) {
      alert('Một số tệp không phải ảnh hoặc rỗng đã bị bỏ qua');
    }

    setSelectedFiles(validFiles);
  };

  const handleImageUpload = async (hotelId: number) => {
    if (selectedFiles.length === 0) return;
    
    try {
      const imageUrls = await uploadHotelImages(hotelId, selectedFiles);
      setUploadedImages(prev => [...prev, ...imageUrls]);
      setSelectedFiles([]);
      alert('Upload ảnh thành công!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Lỗi upload ảnh');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Không có quyền truy cập
          </h2>
          <p className="text-gray-600">
            Trang này chỉ dành cho quản trị viên
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="heading-lg text-gradient-primary">
                👑 Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Chào mừng, {user.first_name || user.username}! Quản lý hệ thống hotel booking
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-semibold">
                👑 Admin
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', name: 'Tổng quan', icon: '' },
              { id: 'users', name: 'Người dùng', icon: '' },
              { id: 'hotels', name: 'Khách sạn', icon: '' },
              { id: 'rooms', name: 'Phòng', icon: '' },
              { id: 'bookings', name: 'Đặt phòng', icon: '' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="modern-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl"></span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {stats?.data?.total_users || 0}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800">Người dùng</h3>
                <p className="text-sm text-gray-600">Tổng số tài khoản</p>
              </div>

              <div className="modern-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl"></span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {stats?.data?.total_hotels || 0}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800">Khách sạn</h3>
                <p className="text-sm text-gray-600">Đã đăng ký</p>
              </div>

              <div className="modern-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl"></span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">
                    {stats?.data?.total_rooms || 0}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800">Phòng</h3>
                <p className="text-sm text-gray-600">Có sẵn</p>
              </div>

              <div className="modern-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl"></span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">
                    {stats?.data?.total_bookings || 0}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800">Đặt phòng</h3>
                <p className="text-sm text-gray-600">Tổng số booking</p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="modern-card rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                 Doanh thu tháng này
              </h3>
              <div className="text-center py-12">
                <div className="text-4xl font-bold text-gradient-primary mb-2">
                  {formatPrice(stats?.data?.monthly_revenue || 0)}
                </div>
                <p className="text-gray-600">
                  Tổng doanh thu từ {stats?.data?.monthly_bookings || 0} đặt phòng
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="modern-card rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                 Quản lý người dùng
              </h3>
              <button
                onClick={() => {setSelectedUser(null); setIsUserModalOpen(true);}}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold"
              >
                ➕ Thêm người dùng
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tên</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Vai trò</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Ngày tạo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Trạng thái</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user: User) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{user.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">
                          {user.first_name && user.last_name 
                            ? `${user.last_name} ${user.first_name}`
                            : user.username}
                        </div>
                        <div className="text-sm text-gray-600">{user.username}</div>
                      </td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'admin' ? '👑 Admin' : '👤 Khách'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(user.created_at || '')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          ✅ Hoạt động
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal('user', user)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            onClick={() => openDeleteModal('user', user.id, user.username)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            🗑️ Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Hotels Tab */}
        {activeTab === 'hotels' && (
          <div className="modern-card rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                 Quản lý khách sạn
              </h3>
              <button
                onClick={() => {setSelectedHotel(null); setIsHotelModalOpen(true);}}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold"
              >
                ➕ Thêm khách sạn
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels?.data?.map((hotel: Hotel) => (
                <div key={hotel.id} className="bg-gray-50 rounded-xl p-4 hover-lift">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-800">{hotel.name}</h4>
                    <div className="flex items-center text-yellow-500">
                      <span className="text-sm">⭐</span>
                      <span className="ml-1 font-semibold">{hotel.star_rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">
                    📍 {hotel.address}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      ID: {hotel.id}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal('hotel', hotel)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => openDeleteModal('hotel', hotel.id, hotel.name)}
                        className="text-red-600 hover:text-red-800 font-semibold text-sm"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rooms Tab */}
        {activeTab === 'rooms' && (
          <div className="modern-card rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                 Quản lý phòng
              </h3>
              <button
                onClick={() => {setSelectedRoom(null); setIsRoomModalOpen(true);}}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold"
              >
                ➕ Thêm phòng
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Số phòng</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Khách sạn</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Loại phòng</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Giá/đêm</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Sức chứa</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Trạng thái</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms?.data?.map((room: Room) => (
                    <tr key={room.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold">{room.room_number}</td>
                      <td className="py-3 px-4">{room.hotel?.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {room.room_type === 'single' ? 'Đơn' :
                           room.room_type === 'double' ? 'Đôi' :
                           room.room_type === 'suite' ? 'Suite' : 'Gia đình'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {formatPrice(room.price_per_night)}
                      </td>
                      <td className="py-3 px-4">{room.capacity} khách</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          room.is_available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {room.is_available ? '✅ Có sẵn' : '❌ Đã đặt'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal('room', room)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            onClick={() => openDeleteModal('room', room.id, `Phòng ${room.room_number}`)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            🗑️ Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="modern-card rounded-2xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
               Quản lý đặt phòng
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Khách hàng</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Phòng</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Ngày</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Số tiền</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Trạng thái</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings?.data?.map((booking: Booking) => (
                    <tr key={booking.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{booking.booking_reference || booking.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">
                          {booking.user?.first_name && booking.user?.last_name 
                            ? `${booking.user.last_name} ${booking.user.first_name}`
                            : booking.user?.username}
                        </div>
                        <div className="text-sm text-gray-600">{booking.user?.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">Phòng {booking.room?.room_number}</div>
                        <div className="text-sm text-gray-600">{booking.room?.hotel?.name}</div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div>{formatDate(booking.check_in_date)}</div>
                        <div className="text-gray-600">đến {formatDate(booking.check_out_date)}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {formatPrice(booking.total_price)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status === 'confirmed' ? '✅ Đã xác nhận' :
                           booking.status === 'cancelled' ? '❌ Đã hủy' :
                           booking.status === 'completed' ? '✅ Hoàn thành' :
                           '⏳ Chờ xác nhận'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleConfirmBooking(booking.id)}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                ✅ Xác nhận
                              </button>
                              <button
                                onClick={() => handleRejectBooking(booking.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                ❌ Từ chối
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openDeleteModal('booking', booking.id, booking.booking_reference || booking.id.toString())}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            🗑️ Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AdminModal
        open={isDeleteModalOpen}
        title="Xác nhận xóa"
        onClose={() => setIsDeleteModalOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          if (deleteItem) {
            deleteItemMutation.mutate({ type: deleteItem.type, id: deleteItem.id });
          }
        }}
        submitLabel="Xóa"
        loading={deleteItemMutation.isLoading}
      >
        <div className="text-center py-4">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-gray-700">
            Bạn có chắc chắn muốn xóa <strong>{deleteItem?.name}</strong>?
          </p>
          <p className="text-red-600 text-sm mt-2">
            Hành động này không thể hoàn tác!
          </p>
        </div>
      </AdminModal>

      {/* User Modal */}
      <AdminModal
        open={isUserModalOpen}
        title={selectedUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
        onClose={() => {setIsUserModalOpen(false); setSelectedUser(null);}}
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const formData = new FormData(e.target as HTMLFormElement);
          
          try {
            if (selectedUser) {
              const updateData = {
                username: formData.get('username') as string,
                email: formData.get('email') as string,
                first_name: formData.get('first_name') as string,
                last_name: formData.get('last_name') as string,
                phone: formData.get('phone') as string,
                role: formData.get('role') as 'guest' | 'admin',
              };
              await adminAPI.updateUser(selectedUser.id, updateData);
              alert('Cập nhật người dùng thành công!');
            } else {
              const createData = {
                username: formData.get('username') as string,
                email: formData.get('email') as string,
                first_name: formData.get('first_name') as string,
                last_name: formData.get('last_name') as string,
                phone: formData.get('phone') as string,
                role: formData.get('role') as 'guest' | 'admin',
                password: formData.get('password') as string
              };
              await adminAPI.createUser(createData);
              alert('Thêm người dùng thành công!');
            }
            
            queryClient.invalidateQueries(['admin-users']);
            setIsUserModalOpen(false);
            setSelectedUser(null);
          } catch (error: any) {
            alert(`Lỗi: ${error.response?.data?.detail || error.message}`);
          } finally {
            setLoading(false);
          }
        }}
        submitLabel={selectedUser ? "Cập nhật" : "Thêm"}
        loading={loading}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên đăng nhập *
            </label>
            <input
              type="text"
              name="username"
              defaultValue={selectedUser?.username || ''}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              defaultValue={selectedUser?.email || ''}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {!selectedUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu *
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ
              </label>
              <input
                type="text"
                name="last_name"
                defaultValue={selectedUser?.last_name || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên
              </label>
              <input
                type="text"
                name="first_name"
                defaultValue={selectedUser?.first_name || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={selectedUser?.phone || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vai trò *
            </label>
            <select
              name="role"
              defaultValue={selectedUser?.role || 'guest'}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="guest">Khách hàng</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>
        </div>
      </AdminModal>

      {/* Hotel Modal */}
      <AdminModal
        open={isHotelModalOpen}
        title={selectedHotel ? "Chỉnh sửa khách sạn" : "Thêm khách sạn mới"}
        onClose={() => {setIsHotelModalOpen(false); setSelectedHotel(null);}}
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const formData = new FormData(e.target as HTMLFormElement);
          
          try {
            const hotelData = {
              name: formData.get('name') as string,
              description: formData.get('description') as string,
              address: formData.get('address') as string,
              city: formData.get('city') as string,
              country: formData.get('country') as string,
              phone: formData.get('phone') as string,
              email: formData.get('email') as string,
              star_rating: parseInt(formData.get('rating') as string),
              amenities: (formData.get('amenities') as string).split(',').map(a => a.trim()).join(',')
            };

            let hotelId: number;
            if (selectedHotel) {
              await adminAPI.updateHotel(selectedHotel.id, hotelData);
              hotelId = selectedHotel.id;
              alert('Cập nhật khách sạn thành công!');
            } else {
              const res = await adminAPI.createHotel(hotelData);
              // Giả định API trả { data: { id: ... } }
              hotelId = res.data?.id ?? res.id ?? 0;
              alert('Thêm khách sạn thành công!');
            }

            // Auto upload images if selected
            if (selectedFiles.length > 0 && hotelId) {
              try {
                await uploadHotelImages(hotelId, selectedFiles);
              } catch (e) {
                console.error('Upload image error:', e);
              }
            }
            queryClient.invalidateQueries(['admin-hotels']);
            setSelectedFiles([]);
            setUploadedImages([]);
            setIsHotelModalOpen(false);
            setSelectedHotel(null);
          } catch (error: any) {
            console.error('Hotel operation error:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Có lỗi xảy ra';
            alert(`Lỗi: ${errorMessage}`);
          } finally {
            setLoading(false);
          }
        }}
        submitLabel={selectedHotel ? "Cập nhật" : "Thêm"}
        loading={loading}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên khách sạn *
            </label>
            <input
              type="text"
              name="name"
              defaultValue={selectedHotel?.name || ''}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              name="description"
              defaultValue={selectedHotel?.description || ''}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ *
            </label>
            <input
              type="text"
              name="address"
              defaultValue={selectedHotel?.address || ''}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thành phố *
              </label>
              <input
                type="text"
                name="city"
                defaultValue={selectedHotel?.city || ''}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quốc gia *
              </label>
              <input
                type="text"
                name="country"
                defaultValue={selectedHotel?.country || 'Vietnam'}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                name="phone"
                defaultValue={selectedHotel?.phone || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                defaultValue={selectedHotel?.email || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đánh giá (1-5 sao) *
            </label>
            <select
              name="rating"
              defaultValue={selectedHotel?.star_rating || 3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={1}>1 sao</option>
              <option value={2}>2 sao</option>
              <option value={3}>3 sao</option>
              <option value={4}>4 sao</option>
              <option value={5}>5 sao</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiện ích (cách nhau bằng dấu phẩy)
            </label>
            <input
              type="text"
              name="amenities"
              defaultValue={selectedHotel?.amenities || ''}
              placeholder="WiFi, Bể bơi, Gym, Spa..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🖼️ Ảnh khách sạn
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {selectedFiles.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">Đã chọn {selectedFiles.length} ảnh</p>
            )}
            {uploadedImages.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">Ảnh đã upload:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {uploadedImages.map((url, index) => (
                    <img
                      key={index}
                      src={getMediaUrl(url)}
                      alt={`Hotel ${index + 1}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminModal>

      {/* Room Modal */}
      <AdminModal
        open={isRoomModalOpen}
        title={selectedRoom ? "Chỉnh sửa phòng" : "Thêm phòng mới"}
        onClose={() => {setIsRoomModalOpen(false); setSelectedRoom(null);}}
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const formData = new FormData(e.target as HTMLFormElement);
          
          try {
            const roomData = {
              hotel_id: parseInt(formData.get('hotel_id') as string),
              room_number: formData.get('room_number') as string,
              room_type: formData.get('room_type') as 'single' | 'double' | 'suite' | 'deluxe',
              price_per_night: parseFloat(formData.get('price_per_night') as string),
              capacity: parseInt(formData.get('capacity') as string),
              description: formData.get('description') as string,
              amenities: (formData.get('amenities') as string).split(',').map(a => a.trim()).join(','),
              ...(selectedRoom ? {} : { is_available: true })
            };

            if (selectedRoom) {
              await adminAPI.updateRoom(selectedRoom.id, roomData);
              alert('Cập nhật phòng thành công!');
            } else {
              await adminAPI.createRoom(roomData);
              alert('Thêm phòng thành công!');
            }
            
            queryClient.invalidateQueries(['admin-rooms']);
            setIsRoomModalOpen(false);
            setSelectedRoom(null);
          } catch (error: any) {
            alert(`Lỗi: ${error.response?.data?.detail || error.message}`);
          } finally {
            setLoading(false);
          }
        }}
        submitLabel={selectedRoom ? "Cập nhật" : "Thêm"}
        loading={loading}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Khách sạn *
            </label>
            <select
              name="hotel_id"
              defaultValue={selectedRoom?.hotel_id || ''}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Chọn khách sạn</option>
              {hotels?.data?.map((hotel: Hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số phòng *
              </label>
              <input
                type="text"
                name="room_number"
                defaultValue={selectedRoom?.room_number || ''}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại phòng *
              </label>
              <select
                name="room_type"
                defaultValue={selectedRoom?.room_type || 'single'}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="single">Phòng đơn</option>
                <option value="double">Phòng đôi</option>
                <option value="suite">Suite</option>
                <option value="deluxe">Deluxe</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giá/đêm (VND) *
              </label>
              <input
                type="number"
                name="price_per_night"
                defaultValue={selectedRoom?.price_per_night || ''}
                required
                min="0"
                step="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sức chứa (người) *
              </label>
              <input
                type="number"
                name="capacity"
                defaultValue={selectedRoom?.capacity || ''}
                required
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              name="description"
              defaultValue={selectedRoom?.description || ''}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiện ích phòng (cách nhau bằng dấu phẩy)
            </label>
            <input
              type="text"
              name="amenities"
              defaultValue={selectedRoom?.amenities || ''}
              placeholder="TV, Điều hòa, Tủ lạnh, WiFi..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </AdminModal>
    </div>
  );
};

export default AdminDashboard; 