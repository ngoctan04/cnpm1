-- Initialize the hotel booking database with sample data

-- Insert sample hotel
INSERT INTO hotels (name, description, address, city, country, phone, email, star_rating, amenities) VALUES
('Grand Hotel Paradise', 'A luxurious 5-star hotel with ocean views and world-class amenities', '123 Ocean Drive', 'Miami', 'USA', '+1-305-555-0123', 'info@grandhotelparadise.com', 5, '["Free WiFi", "Pool", "Spa", "Restaurant", "Bar", "Gym", "Parking", "Room Service"]');

-- Insert sample rooms
INSERT INTO rooms (hotel_id, room_number, room_type, capacity, price_per_night, description, amenities, area_sqm, bed_type) VALUES
(1, '101', 'single', 1, 129.99, 'Comfortable single room with city view', '["Free WiFi", "Air Conditioning", "TV", "Mini Bar"]', 25, 'Single'),
(1, '102', 'single', 1, 129.99, 'Comfortable single room with city view', '["Free WiFi", "Air Conditioning", "TV", "Mini Bar"]', 25, 'Single'),
(1, '201', 'double', 2, 199.99, 'Spacious double room with ocean view', '["Free WiFi", "Air Conditioning", "TV", "Mini Bar", "Balcony"]', 35, 'Queen'),
(1, '202', 'double', 2, 199.99, 'Spacious double room with ocean view', '["Free WiFi", "Air Conditioning", "TV", "Mini Bar", "Balcony"]', 35, 'Queen'),
(1, '301', 'suite', 4, 399.99, 'Luxury suite with panoramic ocean view', '["Free WiFi", "Air Conditioning", "TV", "Mini Bar", "Balcony", "Living Area", "Kitchenette"]', 65, 'King'),
(1, '302', 'deluxe', 2, 299.99, 'Deluxe room with premium amenities', '["Free WiFi", "Air Conditioning", "TV", "Mini Bar", "Balcony", "Premium Bedding"]', 45, 'King');

-- Insert sample admin user (password: admin123)
INSERT INTO users (email, username, hashed_password, first_name, last_name, role, phone) VALUES
('admin@hotel.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeS5qroCJZ8Q5v6zy', 'Admin', 'User', 'admin', '+1-555-0100');

-- Insert sample guest user (password: guest123)
INSERT INTO users (email, username, hashed_password, first_name, last_name, role, phone) VALUES
('guest@example.com', 'guest', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Guest', 'User', 'guest', '+1-555-0200');

-- Note: To generate password hashes in Python:
-- from passlib.context import CryptContext
-- pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
-- print(pwd_context.hash("admin123"))
-- print(pwd_context.hash("guest123")) 