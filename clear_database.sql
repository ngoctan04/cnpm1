-- Script xóa tất cả dữ liệu trong database
-- Sử dụng database hotel_booking
USE hotel_booking;

-- Xóa dữ liệu theo thứ tự để tránh lỗi foreign key constraint
-- Xóa payments trước (vì có foreign key đến bookings)
DELETE FROM payments;

-- Xóa bookings (vì có foreign key đến rooms và users)
DELETE FROM bookings;

-- Xóa rooms (vì có foreign key đến hotels)
DELETE FROM rooms;

-- Xóa hotels
DELETE FROM hotels;

-- Xóa users (trừ admin account nếu muốn giữ lại)
-- DELETE FROM users;

-- Reset auto increment counters
ALTER TABLE payments AUTO_INCREMENT = 1;
ALTER TABLE bookings AUTO_INCREMENT = 1;
ALTER TABLE rooms AUTO_INCREMENT = 1;
ALTER TABLE hotels AUTO_INCREMENT = 1;
-- ALTER TABLE users AUTO_INCREMENT = 1;

-- Hiển thị thông báo
SELECT 'Đã xóa  tất cả dữ liệu trong database!' AS message;
SELECT 'Bảng payments: ' AS table_name, COUNT(*) AS count FROM payments
UNION ALL
SELECT 'Bảng bookings: ', COUNT(*) FROM bookings
UNION ALL
SELECT 'Bảng rooms: ', COUNT(*) FROM rooms
UNION ALL
SELECT 'Bảng hotels: ', COUNT(*) FROM hotels
UNION ALL
SELECT 'Bảng users: ', COUNT(*) FROM users; 