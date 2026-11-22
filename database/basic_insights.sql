USE TravelBookingDB;
GO

-- All users
SELECT 
    user_id,
    full_name,
    email,
    role,
    is_active,
    created_at
FROM Users
ORDER BY created_at DESC;
GO

-- User by email
DECLARE @checkEmail VARCHAR(255) = 'passenger@demo.test';
SELECT 
    user_id,
    full_name,
    email,
    role,
    is_active,
    created_at
FROM Users
WHERE email = @checkEmail;
GO

-- User by id
SELECT 
    user_id,
    full_name,
    email,
    role,
    is_active,
    created_at
FROM Users
WHERE user_id = 5;
GO

-- Bus companies
SELECT 
    company_id,
    company_name,
    contact_email,
    contact_phone,
    status,
    created_at
FROM BusCompanies
ORDER BY created_at DESC;
GO

-- Bookings
SELECT 
    booking_id,
    user_id,
    trip_id,
    booking_datetime,
    total_amount_pkr,
    discount_amount_pkr,
    status
FROM Bookings
ORDER BY booking_datetime DESC;
GO

-- Seats for one booking
SELECT 
    bd.booking_detail_id,
    bd.booking_id,
    bd.seat_id,
    bd.passenger_name,
    bd.passenger_gender,
    bd.fare_pkr
FROM BookingDetails bd
WHERE bd.booking_id = 1;
GO

-- Recent payments
SELECT 
    payment_id,
    booking_id,
    amount_pkr,
    payment_method,
    status,
    paid_at,
    created_at
FROM Payments
ORDER BY created_at DESC;
GO

-- Recent feedback
SELECT 
    f.feedback_id,
    f.user_id,
    f.trip_id,
    f.rating,
    f.comments,
    f.created_at
FROM Feedback f
ORDER BY f.created_at DESC;
GO

-- Favourite routes
SELECT 
    fav_id,
    user_id,
    route_id,
    preferred_company_id,
    created_at
FROM FavouriteRoutes
ORDER BY created_at DESC;
GO

-- Trips
SELECT 
    t.trip_id,
    c1.city_name AS from_city,
    c2.city_name AS to_city,
    t.departure_datetime,
    t.arrival_datetime,
    t.fare_pkr,
    t.status
FROM Trips t
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
ORDER BY t.departure_datetime DESC;
GO

-- Counts
SELECT 'Users' AS TableName, COUNT(*) AS TotalCount FROM Users
UNION ALL
SELECT 'BusCompanies', COUNT(*) FROM BusCompanies
UNION ALL
SELECT 'Trips', COUNT(*) FROM Trips
UNION ALL
SELECT 'Bookings', COUNT(*) FROM Bookings
UNION ALL
SELECT 'Payments', COUNT(*) FROM Payments
UNION ALL
SELECT 'Feedback', COUNT(*) FROM Feedback;
GO

-- Recent bookings with route and company
SELECT TOP 10
    b.booking_id,
    u.full_name AS passenger_name,
    c1.city_name + N' → ' + c2.city_name AS route_name,
    bc.company_name,
    t.departure_datetime,
    b.total_amount_pkr - b.discount_amount_pkr AS amount_paid_pkr,
    b.status AS booking_status,
    b.booking_datetime
FROM Bookings b
INNER JOIN Users u ON b.user_id = u.user_id
INNER JOIN Trips t ON b.trip_id = t.trip_id
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
INNER JOIN Buses bus ON t.bus_id = bus.bus_id
INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
ORDER BY b.booking_datetime DESC;
GO
