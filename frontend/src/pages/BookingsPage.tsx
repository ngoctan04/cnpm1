import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { Booking } from '../types';
import { useAuth } from '../contexts/AuthContext';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

const BookingsPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Show success message from booking
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [location.state]);

  // Fetch user bookings
  const { data: bookings, isLoading, error, refetch } = useQuery({
    queryKey: ['bookings', user?.id],
    queryFn: () => bookingsAPI.getMyBookings(),
    enabled: !!user
  });

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đặt phòng này?')) return;

    setCancellingId(bookingId);
    try {
      await bookingsAPI.cancel(bookingId);
      refetch();
      setSuccessMessage('Đã hủy đặt phòng thành công');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Không thể hủy đặt phòng. Vui lòng thử lại.');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed':
        return '✅ Đã xác nhận';
      case 'cancelled':
        return '❌ Đã hủy';
      case 'completed':
        return '✅ Hoàn thành';
      case 'pending':
      default:
        return '⏳ Chờ xác nhận';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const canCancel = (booking: Booking) => {
    return booking.status === 'pending' || booking.status === 'confirmed';
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
            Bạn cần đăng nhập để xem lịch sử đặt phòng
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải lịch sử đặt phòng...</p>
          </div>
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
             Lịch Sử Đặt Phòng
          </h1>
          <p className="text-gray-600 text-lg">
            Quản lý và theo dõi tất cả các đặt phòng của bạn
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-3">❌</span>
              <p className="text-red-800 font-medium">
                Không thể tải lịch sử đặt phòng. Vui lòng thử lại.
              </p>
            </div>
          </div>
        )}

        {/* Bookings List */}
        {bookings?.data && bookings.data.length > 0 ? (
          <div className="space-y-6">
            {bookings.data.map((booking: Booking) => (
              <div
                key={booking.id}
                className="modern-card rounded-2xl p-6 hover-lift"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">
                         Phòng {booking.room?.room_number}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>
                    <p className="text-gray-600 font-medium mb-1">
                      📍 {booking.room?.hotel?.name}
                    </p>
                    <p className="text-gray-500 text-sm">
                      Mã đặt phòng: <span className="font-mono font-semibold">{booking.booking_reference || booking.id}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gradient-primary">
                      {formatPrice(booking.total_price)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.ceil((new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / (1000 * 60 * 60 * 24))} đêm
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="text-green-600 mr-2">📅</span>
                      <div>
                        <div className="font-semibold">Nhận phòng</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(booking.check_in_date)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-red-600 mr-2">📅</span>
                      <div>
                        <div className="font-semibold">Trả phòng</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(booking.check_out_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-2"></span>
                      <div>
                        <div className="font-semibold">Số khách</div>
                        <div className="text-sm text-gray-600">
                          {booking.guest_count} người
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-purple-600 mr-2"></span>
                      <div>
                        <div className="font-semibold">Loại phòng</div>
                        <div className="text-sm text-gray-600">
                          {booking.room?.room_type === 'single' ? 'Phòng Đơn' :
                           booking.room?.room_type === 'double' ? 'Phòng Đôi' :
                           booking.room?.room_type === 'suite' ? 'Phòng Suite' :
                           booking.room?.room_type === 'deluxe' ? 'Phòng Deluxe' : 
                           booking.room?.room_type}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                {booking.special_requests && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                    <div className="font-semibold text-gray-700 mb-1">
                      📝 Yêu cầu đặc biệt:
                    </div>
                    <div className="text-gray-600 text-sm">
                      {booking.special_requests}
                    </div>
                  </div>
                )}

                {/* Payment Info */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600">💳</span>
                      <span className="font-semibold">Trạng thái:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>
                    {canCancel(booking) && (
                      <button
                        onClick={() => handleCancelBooking(booking.id.toString())}
                        disabled={cancellingId === booking.id.toString()}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {cancellingId === booking.id.toString() ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Đang hủy...
                          </div>
                        ) : (
                          '❌ Hủy đặt phòng'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4"></div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Chưa có đặt phòng nào
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn chưa có lịch sử đặt phòng. Hãy khám phá các phòng tuyệt vời!
            </p>
            <a
              href="/rooms"
              className="btn-primary inline-flex items-center hover-lift"
            >
               Tìm phòng ngay
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsPage; 