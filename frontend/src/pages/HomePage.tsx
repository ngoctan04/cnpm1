import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hotelsAPI, roomsAPI, getMediaUrl } from '../services/api';
import { Hotel, Room } from '../types';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<any[]>([]);
  const [featuredRooms, setFeaturedRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingForm, setBookingForm] = useState({
    destination: '',
    checkIn: '',
    checkOut: '',
    guest_count: 1
  });



  const fetchData = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Fetch from API
      const [hotelsData, roomsData] = await Promise.all([
        hotelsAPI.getAll({ limit: 6 }),
        roomsAPI.getAll({ limit: 8, available_only: true })
      ]);
      setHotels(hotelsData?.data || []);
      setFeaturedRooms(roomsData?.data || []);
    } catch (error) {
      console.error('API không khả dụng:', error);
      setHotels([]);
      setFeaturedRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (bookingForm.destination) params.set('destination', bookingForm.destination);
    if (bookingForm.checkIn) params.set('check_in_date', bookingForm.checkIn);
    if (bookingForm.checkOut) params.set('check_out_date', bookingForm.checkOut);
    if (bookingForm.guest_count) params.set('guest_count', bookingForm.guest_count.toString());
    
    navigate(`/rooms?${params.toString()}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section with Search */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-16 h-16 bg-purple-400 rounded-full opacity-20 animate-bounce"></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-pink-400 rounded-full opacity-20 animate-pulse"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
               Khách Sạn Sang Trọng
            </h1>
            <p className="text-xl md:text-2xl font-light mb-8 max-w-3xl mx-auto leading-relaxed">
              Khám phá những khách sạn tuyệt vời nhất Việt Nam. Đặt phòng dễ dàng, trải nghiệm đẳng cấp.
            </p>
            <div className="flex justify-center space-x-4">
              <span className="px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm backdrop-blur-sm">
                ✨ Hơn 1000+ khách sạn
              </span>
              <span className="px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm backdrop-blur-sm">
                🎯 Giá tốt nhất
              </span>
              <span className="px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm backdrop-blur-sm">
                 Đặt ngay lập tức
              </span>
            </div>
          </div>

          {/* Modern Search Form */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                🔍 Tìm Khách Sạn Hoàn Hảo
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📍 Điểm đến
                  </label>
                  <input
                    type="text"
                    value={bookingForm.destination}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, destination: e.target.value }))}
                    placeholder="Hồ Chí Minh, Hà Nội, Đà Nẵng..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📅 Ngày nhận phòng
                  </label>
                  <input
                    type="date"
                    value={bookingForm.checkIn}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, checkIn: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📅 Ngày trả phòng
                  </label>
                  <input
                    type="date"
                    value={bookingForm.checkOut}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, checkOut: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                     Số khách
                  </label>
                  <select
                    value={bookingForm.guest_count}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, guest_count: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    {[1,2,3,4,5,6].map(num => (
                      <option key={num} value={num}>{num} khách</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={handleSearch}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                🚀 Tìm Kiếm Ngay
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Hotels Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
               Khách Sạn Nổi Bật
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Những khách sạn được đánh giá cao nhất với dịch vụ xuất sắc và tiện nghi hiện đại
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                  <div className="h-64 bg-gray-300"></div>
                  <div className="p-6">
                    <div className="h-6 bg-gray-300 rounded mb-4"></div>
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {hotels.map((hotel) => (
                <div key={hotel.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                  <div className="relative h-64 overflow-hidden">
                    {/* Hotel Image */}
                    {hotel.images && hotel.images.length > 0 ? (
                      <>
                        <img 
                          src={getMediaUrl(hotel.images[0])} 
                          alt={hotel.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            // Fallback to gradient if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        {/* Overlay tên khách sạn */}
                        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                          <h3 className="text-center text-white text-xl font-bold px-4">{hotel.name}</h3>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500">
                        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-300"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-white">
                            <h3 className="text-2xl font-bold mb-2">{hotel.name}</h3>
                            <p className="text-lg opacity-90">📍 {hotel.address}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Star Rating */}
                    <div className="absolute top-4 right-4">
                      <div className="bg-white bg-opacity-90 px-3 py-1 rounded-full">
                        <div className="flex items-center">
                          <span className="text-yellow-500">
                            {'⭐'.repeat(hotel.star_rating || 4)}
                          </span>
                          <span className="ml-1 text-sm font-medium">
                            {hotel.star_rating || 4}/5
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Image count indicator */}
                    {hotel.images && hotel.images.length > 1 && (
                      <div className="absolute bottom-3 left-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                        📷 {hotel.images.length}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    {hotel.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">{hotel.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between mb-4">
                      {hotel.email && (
                        <div className="text-sm text-gray-500">{hotel.email}</div>
                      )}
                      {hotel.phone && (
                        <div className="text-sm text-gray-500">{hotel.phone}</div>
                      )}
                    </div>
                    
                    <Link
                      to={`/hotels/${hotel.id}`}
                      className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
                    >
                      Xem Chi Tiết
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/hotels"
              className="inline-flex items-center px-8 py-4 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-200"
            >
              Xem Tất Cả Khách Sạn
              <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Rooms Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 fade-in-up">
            <h2 className="heading-lg text-gradient-primary mb-4">
               Phòng Nổi Bật
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Khám phá những phòng được yêu thích nhất với tiện nghi hiện đại và view tuyệt đẹp
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredRooms.map((room: any, index: number) => (
              <div
                key={room.id}
                className={`modern-card rounded-2xl overflow-hidden hover-lift ${
                  index % 2 === 0 ? 'slide-in-left' : 'slide-in-right'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Room Image */}
                <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
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
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl"></span>
                    </div>
                  )}
                  
                  {/* Room Type Badge */}
                  <div className="absolute top-3 right-3 bg-white bg-opacity-90 rounded-full px-3 py-1">
                    <span className="text-xs font-semibold text-gray-700">
                      {room.room_type === 'single' ? 'Đơn' :
                       room.room_type === 'double' ? 'Đôi' :
                       room.room_type === 'suite' ? 'Suite' :
                       room.room_type === 'deluxe' ? 'Deluxe' : room.room_type}
                    </span>
                  </div>
                  
                  {/* Available/Unavailable indicator */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      room.is_available 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {room.is_available ? '✅ Có sẵn' : '❌ Đã đặt'}
                    </span>
                  </div>
                  
                  {/* Image count indicator */}
                  {room.images && room.images.length > 1 && (
                    <div className="absolute bottom-3 left-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                      📷 {room.images.length}
                    </div>
                  )}
                </div>

                {/* Room Details */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-xl text-gray-800">
                      Phòng {room.room_number}
                    </h3>
                    {room.hotel?.star_rating && (
                      <div className="flex items-center text-yellow-500">
                        <span className="text-sm">⭐</span>
                        <span className="ml-1 font-semibold">{room.hotel.star_rating}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-600 mb-3 font-medium">
                    📍 {room.hotel?.name || 'Khách sạn'}
                  </p>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {room.description || 'Phòng hiện đại với đầy đủ tiện nghi'}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600 text-sm">
                      <span className="mr-2"></span>
                      <span>Tối đa {room.capacity} khách</span>
                    </div>
                    {room.amenities && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <span className="mr-2">✨</span>
                        <span>
                          {typeof room.amenities === 'string' 
                            ? room.amenities.split(', ').slice(0, 2).join(', ')
                            : Array.isArray(room.amenities)
                            ? room.amenities.slice(0, 2).join(', ')
                            : room.amenities
                          }
                        </span>
                        {typeof room.amenities === 'string' 
                          ? room.amenities.split(', ').length > 2 && <span>...</span>
                          : Array.isArray(room.amenities) && room.amenities.length > 2 && <span>...</span>
                        }
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-2xl font-bold text-gradient-primary">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND'
                        }).format(room.price_per_night)}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">/đêm</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => navigate('/rooms')}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                      room.is_available
                        ? 'btn-primary hover-lift'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {room.is_available ? '🎯 Xem chi tiết' : 'Không khả dụng'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* View All Rooms Button */}
          <div className="text-center mt-12 fade-in-up">
            <button
              onClick={() => navigate('/rooms')}
              className="btn-primary text-lg px-8 py-4 hover-lift"
            >
               Xem Tất Cả Phòng
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ✨ Tại Sao Chọn Chúng Tôi?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: '',
                title: 'Chất Lượng Cao',
                description: 'Chỉ những khách sạn được kiểm duyệt kỹ lưỡng'
              },
              {
                icon: '',
                title: 'Giá Tốt Nhất',
                description: 'Đảm bảo giá tốt nhất thị trường'
              },
              {
                icon: '',
                title: 'Hỗ Trợ 24/7',
                description: 'Đội ngũ chăm sóc khách hàng luôn sẵn sàng'
              },
              {
                icon: '',
                title: 'Đặt Phòng Nhanh',
                description: 'Xác nhận đặt phòng trong vài phút'
              }
            ].map((feature, index) => (
              <div key={index} className="text-center p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">
            🎉 Sẵn Sàng Cho Chuyến Đi Tuyệt Vời?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Khám phá hàng nghìn khách sạn tuyệt vời trên khắp Việt Nam. Đặt ngay hôm nay!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-100 transition-all duration-200 transform hover:scale-105"
            >
              📝 Đăng Ký Ngay
            </Link>
            <Link
              to="/rooms"
              className="px-8 py-4 border-2 border-white text-white font-bold rounded-xl hover:bg-white hover:text-blue-600 transition-all duration-200 transform hover:scale-105"
            >
              🔍 Khám Phá Phòng
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage; 