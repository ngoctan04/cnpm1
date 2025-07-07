import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { roomsAPI, hotelsAPI, bookingsAPI, getMediaUrl } from '../services/api';
import { Room, Hotel } from '../types';
import { useAuth } from '../contexts/AuthContext';

type RoomType = 'single' | 'double' | 'suite' | 'deluxe';

const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [filters, setFilters] = useState({
    hotel_id: '',
    room_type: '',
    min_price: '',
    max_price: '',
    available_only: true,
    check_in: '',
    check_out: '',
    guest_count: '1'
  });
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    check_in: '',
    check_out: '',
    guest_count: 1,
    special_requests: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');



  // Fetch rooms from API
  const { data: rooms, isLoading: roomsLoading, error: roomsError, refetch } = useQuery({
    queryKey: ['rooms', filters],
    queryFn: async () => {
      try {
        return await roomsAPI.getAll(filters);
      } catch (error) {
        console.error('API không khả dụng:', error);
        throw error;
      }
    },
    enabled: true
  });

  // Fetch hotels for filter dropdown
  const { data: hotels } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => hotelsAPI.getAll(),
    enabled: true
  });

  // Set default dates (today and tomorrow)
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    setFilters(prev => ({
      ...prev,
      check_in: today.toISOString().split('T')[0],
      check_out: tomorrow.toISOString().split('T')[0]
    }));
    
    setBookingData(prev => ({
      ...prev,
      check_in: today.toISOString().split('T')[0],
      check_out: tomorrow.toISOString().split('T')[0]
    }));
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleBookRoom = (room: Room) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/rooms' } } });
      return;
    }
    setSelectedRoom(room);
    setShowBookingModal(true);
    setBookingError('');
  };

  const handleBookingSubmit = async () => {
    if (!selectedRoom || !user) return;

    setBookingLoading(true);
    setBookingError('');

    try {
      // Validate dates
      const checkIn = new Date(bookingData.check_in);
      const checkOut = new Date(bookingData.check_out);
      const today = new Date();
      
      if (checkIn < today) {
        setBookingError('Ngày nhận phòng không thể là ngày đã qua');
        return;
      }
      
      if (checkOut <= checkIn) {
        setBookingError('Ngày trả phòng phải sau ngày nhận phòng');
        return;
      }

      // Calculate total price
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const total_amount = selectedRoom.price_per_night * nights;

      // Create booking
      const booking = {
        room_id: selectedRoom.id,
        check_in_date: bookingData.check_in,
        check_out_date: bookingData.check_out,
        guest_count: bookingData.guest_count,
        special_requests: bookingData.special_requests || undefined
      };

      const newBooking = await bookingsAPI.create(booking);
      
      // Success!
      setShowBookingModal(false);
      navigate('/bookings', { 
        state: { 
          message: `Đặt phòng thành công! Mã booking: ${newBooking.booking_reference || newBooking.id}`,
          booking: newBooking
        } 
      });
      
    } catch (error: any) {
      setBookingError(error.message || 'Có lỗi xảy ra khi đặt phòng');
    } finally {
      setBookingLoading(false);
    }
  };

  const getRoomTypeLabel = (type: RoomType) => {
    const labels = {
      'single': 'Phòng Đơn',
      'double': 'Phòng Đôi',
      'suite': 'Phòng Suite',
      'family': 'Phòng Gia Đình'
    };
    return labels[type] || type;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  if (roomsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải danh sách phòng...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <h1 className="heading-lg text-gradient-primary mb-2">
               Danh Sách Phòng
            </h1>
            <p className="text-gray-600 text-lg">
              Tìm kiếm và đặt phòng phù hợp với nhu cầu của bạn
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 modern-card mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Hotel Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Khách sạn
                </label>
                <select
                  name="hotel_id"
                  value={filters.hotel_id}
                  onChange={handleFilterChange}
                  className="input-modern w-full"
                >
                  <option value="">Tất cả khách sạn</option>
                  {hotels?.data?.map((hotel: Hotel) => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Type Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Loại phòng
                </label>
                <select
                  name="room_type"
                  value={filters.room_type}
                  onChange={handleFilterChange}
                  className="input-modern w-full"
                >
                  <option value="">Tất cả loại phòng</option>
                  <option value="single">Phòng Đơn</option>
                  <option value="double">Phòng Đôi</option>
                  <option value="suite">Phòng Suite</option>
                  <option value="family">Phòng Gia Đình</option>
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Giá từ
                </label>
                <input
                  type="number"
                  name="min_price"
                  value={filters.min_price}
                  onChange={handleFilterChange}
                  placeholder="0"
                  className="input-modern w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Giá đến
                </label>
                <input
                  type="number"
                  name="max_price"
                  value={filters.max_price}
                  onChange={handleFilterChange}
                  placeholder="10000000"
                  className="input-modern w-full"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Ngày nhận phòng
                </label>
                <input
                  type="date"
                  name="check_in"
                  value={filters.check_in}
                  onChange={handleFilterChange}
                  className="input-modern w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Ngày trả phòng
                </label>
                <input
                  type="date"
                  name="check_out"
                  value={filters.check_out}
                  onChange={handleFilterChange}
                  className="input-modern w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Số khách
                </label>
                <select
                  name="guest_count"
                  value={filters.guest_count}
                  onChange={handleFilterChange}
                  className="input-modern w-full"
                >
                  <option value="1">1 khách</option>
                  <option value="2">2 khách</option>
                  <option value="3">3 khách</option>
                  <option value="4">4 khách</option>
                  <option value="5">5+ khách</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => refetch()}
                  className="btn-primary w-full text-sm py-3 px-4 hover-lift"
                >
                  🔍 Tìm kiếm
                </button>
              </div>
            </div>

            {/* Available Only Checkbox */}
            <div className="flex items-center justify-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="available_only"
                  checked={filters.available_only}
                  onChange={handleFilterChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  ✅ Chỉ hiển thị phòng còn trống
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {roomsError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center">
              <span className="text-red-500 text-2xl mr-3">❌</span>
              <div>
                <h3 className="font-semibold text-red-800">Lỗi tải dữ liệu</h3>
                <p className="text-red-700">Không thể tải danh sách phòng. Vui lòng thử lại.</p>
              </div>
            </div>
          </div>
        )}

        {rooms?.data && rooms.data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.data.map((room: Room) => (
              <div
                key={room.id}
                className="modern-card rounded-2xl overflow-hidden hover-lift"
              >
                {/* Room Image */}
                <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden rounded-t-2xl">
                  {room.images && room.images.length > 0 ? (
                                          <>
                        <img 
                          src={getMediaUrl(room.images[0])} 
                          alt={`Phòng ${room.room_number}`}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                          onError={(e) => {
                            // Fallback to emoji if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      <div className="hidden w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                        <span className="text-6xl"></span>
                      </div>
                    </>
                  ) : (
                    <span className="text-6xl"></span>
                  )}
                  
                  <div className="absolute top-3 right-3 bg-white bg-opacity-90 rounded-full px-3 py-1">
                    <span className="text-sm font-semibold text-gray-700">
                      {getRoomTypeLabel(room.room_type)}
                    </span>
                  </div>
                  
                  {!room.is_available && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">Đã được đặt</span>
                    </div>
                  )}
                  
                  {/* Image gallery indicator */}
                  {room.images && room.images.length > 1 && (
                    <div className="absolute bottom-3 left-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                      📷 {room.images.length} ảnh
                    </div>
                  )}
                </div>

                {/* Room Details */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-xl text-gray-800">
                      Phòng {room.room_number}
                    </h3>
                    <div className="flex items-center text-yellow-500">
                      <span className="text-sm">⭐</span>
                      <span className="ml-1 font-semibold">
                        {room.hotel?.star_rating || 5}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-3 font-medium">
                    📍 {room.hotel?.name || 'Khách sạn'}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600">
                      <span className="text-sm"> Tối đa {room.capacity} khách</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="text-sm"> {getRoomTypeLabel(room.room_type)}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="text-sm">
                        {room.is_available ? '✅ Còn trống' : '❌ Đã được đặt'}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-2xl font-bold text-gradient-primary">
                        {formatPrice(room.price_per_night)}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">/đêm</span>
                    </div>
                  </div>

                  {/* Book Button */}
                  <button
                    onClick={() => handleBookRoom(room)}
                    disabled={!room.is_available}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                      room.is_available
                        ? 'btn-primary hover-lift'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {room.is_available ? '🎯 Đặt phòng ngay' : 'Không khả dụng'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Không tìm thấy phòng phù hợp
            </h3>
            <p className="text-gray-600 mb-6">
              Hãy thử thay đổi bộ lọc hoặc tìm kiếm với điều kiện khác
            </p>
            <button
              onClick={() => {
                setFilters({
                  hotel_id: '',
                  room_type: '',
                  min_price: '',
                  max_price: '',
                  available_only: true,
                  check_in: '',
                  check_out: '',
                  guest_count: '1'
                });
                refetch();
              }}
              className="btn-primary hover-lift"
            >
              🔄 Đặt lại bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                  🎯 Đặt phòng {selectedRoom.room_number}
                </h3>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Room Info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Phòng {selectedRoom.room_number}</span>
                  <span className="text-yellow-500">⭐ {selectedRoom.hotel?.star_rating || 5}</span>
                </div>
                <p className="text-gray-600 text-sm mb-2">
                  📍 {selectedRoom.hotel?.name}
                </p>
                <p className="text-gray-600 text-sm">
                   {getRoomTypeLabel(selectedRoom.room_type)} -  {selectedRoom.capacity} khách
                </p>
              </div>

              {/* Booking Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📅 Ngày nhận phòng
                    </label>
                    <input
                      type="date"
                      value={bookingData.check_in}
                      onChange={(e) => setBookingData(prev => ({ ...prev, check_in: e.target.value }))}
                      className="input-modern w-full"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📅 Ngày trả phòng
                    </label>
                    <input
                      type="date"
                      value={bookingData.check_out}
                      onChange={(e) => setBookingData(prev => ({ ...prev, check_out: e.target.value }))}
                      className="input-modern w-full"
                      min={bookingData.check_in}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                     Số khách
                  </label>
                  <select
                    value={bookingData.guest_count}
                    onChange={(e) => setBookingData(prev => ({ ...prev, guest_count: parseInt(e.target.value) }))}
                    className="input-modern w-full"
                  >
                    {[...Array(selectedRoom.capacity)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} khách
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📝 Yêu cầu đặc biệt (tùy chọn)
                  </label>
                  <textarea
                    value={bookingData.special_requests}
                    onChange={(e) => setBookingData(prev => ({ ...prev, special_requests: e.target.value }))}
                    placeholder="Ví dụ: Phòng tầng cao, giường đôi, ..."
                    rows={3}
                    className="input-modern w-full resize-none"
                  />
                </div>

                {/* Price Calculation */}
                {bookingData.check_in && bookingData.check_out && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Giá mỗi đêm:</span>
                        <span className="font-semibold">{formatPrice(selectedRoom.price_per_night)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Số đêm:</span>
                        <span className="font-semibold">
                          {Math.ceil((new Date(bookingData.check_out).getTime() - new Date(bookingData.check_in).getTime()) / (1000 * 60 * 60 * 24))}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between text-lg font-bold">
                        <span>Tổng cộng:</span>
                        <span className="text-gradient-primary">
                          {formatPrice(
                            selectedRoom.price_per_night * 
                            Math.ceil((new Date(bookingData.check_out).getTime() - new Date(bookingData.check_in).getTime()) / (1000 * 60 * 60 * 24))
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {bookingError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center">
                      <span className="text-red-500 text-xl mr-3">❌</span>
                      <p className="text-red-800 font-medium">{bookingError}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleBookingSubmit}
                    disabled={bookingLoading || !bookingData.check_in || !bookingData.check_out}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Đang đặt...
                      </div>
                    ) : (
                      '✅ Xác nhận đặt phòng'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomsPage; 