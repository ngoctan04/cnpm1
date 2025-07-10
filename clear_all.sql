-- Script xóa tất cả dữ liệu bao gồm cả users
USE hotel_booking;

-- Xóa dữ liệu theo thứ tự để tránh lỗi foreign key constraint
DELETE FROM payments;
DELETE FROM bookings;
DELETE FROM rooms;
DELETE FROM hotels;
DELETE FROM users;

-- Reset auto increment counters
ALTER TABLE payments AUTO_INCREMENT = 1;
ALTER TABLE bookings AUTO_INCREMENT = 1;
ALTER TABLE rooms AUTO_INCREMENT = 1;
ALTER TABLE hotels AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;

-- Hiển thị thông báo
SELECT 'Đã xóa TẤT CẢ dữ liệu trong database!' AS message;
SELECT 'Bảng payments: ' AS table_name, COUNT(*) AS count FROM payments
UNION ALL
SELECT 'Bảng bookings: ', COUNT(*) FROM bookings
UNION ALL
SELECT 'Bảng rooms: ', COUNT(*) FROM rooms
UNION ALL
SELECT 'Bảng hotels: ', COUNT(*) FROM hotels
UNION ALL
SELECT 'Bảng users: ', COUNT(*) FROM users; 