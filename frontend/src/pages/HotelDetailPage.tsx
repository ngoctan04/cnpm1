import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Hotel } from '../types';
import { hotelsAPI } from '../services/api';
import { getMediaUrl } from '../services/api';

const HotelDetailPage: React.FC = () => {
  const { id } = useParams();
  interface HotelWithImg extends Hotel { images?: string[]; website?: string | null }
  const [hotel, setHotel] = useState<HotelWithImg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        if (id) {
          const res = await hotelsAPI.getById(parseInt(id));
          setHotel(res as unknown as HotelWithImg);
        }
      } catch (e: any) {
        setError(e.message || 'Lỗi tải chi tiết khách sạn');
      } finally {
        setLoading(false);
      }
    };
    fetchHotel();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">Đang tải...</div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">{error || 'Không tìm thấy khách sạn'}</div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <Link to="/" className="text-blue-600 hover:underline">← Quay lại Trang Chủ</Link>
        <h1 className="text-4xl font-bold mb-4 mt-4">{hotel.name}</h1>
        {hotel.images && hotel.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {hotel.images.map((img, idx) => (
              <img key={idx} src={getMediaUrl(img)} alt={hotel.name} className="w-full h-64 object-cover rounded-xl" />
            ))}
          </div>
        )}
        <p className="mb-2">📍 {hotel.address}, {hotel.city}</p>
        <p className="mb-2">⭐ {hotel.star_rating}/5</p>
        <p className="mb-4">{hotel.description}</p>
        <div className="space-y-1 text-sm text-gray-700">
          {hotel.phone && <p>📞 {hotel.phone}</p>}
          {hotel.email && <p>📧 {hotel.email}</p>}
          {hotel.website && <a href={hotel.website} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">🌐 Website</a>}
        </div>
      </div>
    </div>
  );
};

export default HotelDetailPage; 