import React from 'react';
import { render, screen } from '@testing-library/react';
import HotelDetailPage from './HotelDetailPage';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

test('Hiển thị thông báo không tìm thấy khách sạn khi không có dữ liệu', () => {
  render(
    <BrowserRouter>
      <HotelDetailPage />
    </BrowserRouter>
  );
  expect(screen.getByText(/Không tìm thấy khách sạn/i)).toBeInTheDocument();
});
