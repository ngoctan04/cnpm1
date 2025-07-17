import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Hotel } from '../types';
import { hotelsAPI } from '../services/api';
import { getMediaUrl } from '../services/api';

const HotelDetailPage: React.FC = () => {
  const { id } = useParams();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        if (id) {
          const hotelData = await hotelsAPI.getById(parseInt(id));
          setHotel(hotelData);
        }
      } catch (e: any) {
        console.error('Error fetching hotel:', e);
        setError(e.message || 'Lỗi tải chi tiết khách sạn');
      } finally {
        setLoading(false);
      }
    };
    fetchHotel();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Lỗi</h2>
          <p className="text-gray-600">{error || 'Không tìm thấy khách sạn'}</p>
          <Link to="/" className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            ← Quay lại Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <Link to="/" className="text-blue-600 hover:underline flex items-center gap-2 mb-6">
          <span>←</span> Quay lại Trang Chủ
        </Link>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <h1 className="text-4xl font-bold mb-4 text-gray-800">{hotel.name}</h1>
            
            {hotel.images && hotel.images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {hotel.images.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={getMediaUrl(img)} 
                    alt={`${hotel.name} - Ảnh ${idx + 1}`} 
                    className="w-full h-64 object-cover rounded-xl"
                    onError={(e) => {
                      console.log('Image load error:', img);
                      e.currentTarget.src = '/placeholder-hotel.jpg'; // fallback image
                    }}
                  />
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Thông tin cơ bản</h2>
                <div className="space-y-3">
                  <p className="flex items-center gap-2">
                    <span className="text-blue-600">📍</span>
                    {hotel.address}, {hotel.city}, {hotel.country}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-yellow-500">⭐</span>
                    {hotel.star_rating}/5 sao
                  </p>
                  {hotel.phone && (
                    <p className="flex items-center gap-2">
                      <span className="text-green-600">📞</span>
                      {hotel.phone}
                    </p>
                  )}
                  {hotel.email && (
                    <p className="flex items-center gap-2">
                      <span className="text-red-600">📧</span>
                      {hotel.email}
                    </p>
                  )}
                  {hotel.website && (
                    <p className="flex items-center gap-2">
                      <span className="text-purple-600">🌐</span>
                      <a 
                        href={hotel.website} 
                        className="text-blue-600 hover:underline" 
                        target="_blank" 
                        rel="noreferrer"
                      >
                        Website
                      </a>
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Mô tả</h2>
                <p className="text-gray-600 leading-relaxed">
                  {hotel.description || 'Chưa có mô tả chi tiết'}
                </p>
                
                {hotel.amenities && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">Tiện nghi</h3>
                    <p className="text-gray-600">{hotel.amenities}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetailPage; 