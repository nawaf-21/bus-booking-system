-- =============================================
-- Musafir - Views and Sample Queries
-- For Dashboard Analytics and Reports
-- =============================================

USE TravelBookingDB;
GO

-- =============================================
-- VIEW 1: BookingSummaryView
-- Summary per booking with user, trip, route, and total amount
-- =============================================
CREATE OR ALTER VIEW BookingSummaryView AS
SELECT 
    b.booking_id,
    u.user_id,
    u.full_name AS passenger_name,
    u.email AS passenger_email,
    t.trip_id,
    r.route_id,
    c1.city_name AS from_city,
    c2.city_name AS to_city,
    bc.company_name,
    t.departure_datetime,
    t.arrival_datetime,
    b.total_amount_pkr,
    b.discount_amount_pkr,
    (b.total_amount_pkr - b.discount_amount_pkr) AS final_amount_pkr,
    b.status AS booking_status,
    b.booking_datetime,
    COUNT(bd.booking_detail_id) AS total_seats_booked
FROM Bookings b
INNER JOIN Users u ON b.user_id = u.user_id
INNER JOIN Trips t ON b.trip_id = t.trip_id
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
INNER JOIN Buses bus ON t.bus_id = bus.bus_id
INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
GROUP BY 
    b.booking_id, u.user_id, u.full_name, u.email, t.trip_id, r.route_id,
    c1.city_name, c2.city_name, bc.company_name, t.departure_datetime,
    t.arrival_datetime, b.total_amount_pkr, b.discount_amount_pkr,
    b.status, b.booking_datetime;
GO

-- =============================================
-- VIEW 2: TripOccupancyView
-- Each trip with total seats, booked seats, and occupancy percentage
-- =============================================
CREATE OR ALTER VIEW TripOccupancyView AS
SELECT 
    t.trip_id,
    r.route_id,
    c1.city_name AS from_city,
    c2.city_name AS to_city,
    bc.company_name,
    bus.bus_name,
    bus.bus_type,
    t.departure_datetime,
    t.arrival_datetime,
    t.fare_pkr,
    t.status AS trip_status,
    bus.total_seats AS total_seats_available,
    COUNT(DISTINCT bd.seat_id) AS seats_booked,
    (bus.total_seats - COUNT(DISTINCT bd.seat_id)) AS seats_available,
    CASE 
        WHEN bus.total_seats > 0 
        THEN CAST((COUNT(DISTINCT bd.seat_id) * 100.0 / bus.total_seats) AS DECIMAL(5,2))
        ELSE 0 
    END AS occupancy_percentage
FROM Trips t
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
INNER JOIN Buses bus ON t.bus_id = bus.bus_id
INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
LEFT JOIN Bookings b ON t.trip_id = b.trip_id AND b.status = 'Confirmed'
LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
GROUP BY 
    t.trip_id, r.route_id, c1.city_name, c2.city_name, bc.company_name,
    bus.bus_name, bus.bus_type, t.departure_datetime, t.arrival_datetime,
    t.fare_pkr, t.status, bus.total_seats;
GO

-- =============================================
-- VIEW 3: RevenueByRouteView
-- Route-wise revenue in PKR
-- =============================================
CREATE OR ALTER VIEW RevenueByRouteView AS
SELECT 
    r.route_id,
    c1.city_name AS from_city,
    c2.city_name AS to_city,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    COUNT(DISTINCT bd.booking_detail_id) AS total_seats_sold,
    SUM(b.total_amount_pkr) AS total_revenue_pkr,
    SUM(b.discount_amount_pkr) AS total_discounts_pkr,
    SUM(b.total_amount_pkr - b.discount_amount_pkr) AS net_revenue_pkr,
    AVG(b.total_amount_pkr - b.discount_amount_pkr) AS avg_booking_amount_pkr
FROM Routes r
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
LEFT JOIN Trips t ON r.route_id = t.route_id
LEFT JOIN Bookings b ON t.trip_id = b.trip_id AND b.status = 'Confirmed'
LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
GROUP BY r.route_id, c1.city_name, c2.city_name;
GO

-- =============================================
-- VIEW 4: CompanyRatingView
-- Average rating per bus company
-- =============================================
CREATE OR ALTER VIEW CompanyRatingView AS
SELECT 
    bc.company_id,
    bc.company_name,
    COUNT(DISTINCT f.feedback_id) AS total_ratings,
    AVG(CAST(f.rating AS DECIMAL(3,2))) AS average_rating,
    MIN(f.rating) AS min_rating,
    MAX(f.rating) AS max_rating
FROM BusCompanies bc
LEFT JOIN Buses bus ON bc.company_id = bus.company_id
LEFT JOIN Trips t ON bus.bus_id = t.bus_id
LEFT JOIN Feedback f ON t.trip_id = f.trip_id
GROUP BY bc.company_id, bc.company_name;
GO

-- =============================================
-- ANALYTICAL QUERIES FOR DASHBOARDS
-- =============================================

-- =============================================
-- QUERY 1: Top 5 Routes by Number of Bookings
-- =============================================
SELECT TOP 5
    c1.city_name + N' → ' + c2.city_name AS route_name,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    SUM(b.total_amount_pkr - b.discount_amount_pkr) AS total_revenue_pkr
FROM Routes r
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
INNER JOIN Trips t ON r.route_id = t.route_id
INNER JOIN Bookings b ON t.trip_id = b.trip_id
WHERE b.status = 'Confirmed'
GROUP BY c1.city_name, c2.city_name
ORDER BY total_bookings DESC;
GO

-- =============================================
-- QUERY 2: Top 5 Bus Companies by Average Rating
-- =============================================
SELECT TOP 5
    bc.company_name,
    crv.average_rating,
    crv.total_ratings,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    SUM(b.total_amount_pkr - b.discount_amount_pkr) AS total_revenue_pkr
FROM BusCompanies bc
INNER JOIN CompanyRatingView crv ON bc.company_id = crv.company_id
LEFT JOIN Buses bus ON bc.company_id = bus.company_id
LEFT JOIN Trips t ON bus.bus_id = t.bus_id
LEFT JOIN Bookings b ON t.trip_id = b.trip_id AND b.status = 'Confirmed'
WHERE crv.total_ratings > 0
GROUP BY bc.company_name, crv.average_rating, crv.total_ratings
ORDER BY crv.average_rating DESC, crv.total_ratings DESC;
GO

-- =============================================
-- QUERY 3: Top 5 Bus Companies by Revenue
-- =============================================
SELECT TOP 5
    bc.company_name,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    SUM(b.total_amount_pkr - b.discount_amount_pkr) AS total_revenue_pkr,
    AVG(b.total_amount_pkr - b.discount_amount_pkr) AS avg_booking_value_pkr
FROM BusCompanies bc
INNER JOIN Buses bus ON bc.company_id = bus.company_id
INNER JOIN Trips t ON bus.bus_id = t.bus_id
INNER JOIN Bookings b ON t.trip_id = b.trip_id
WHERE b.status = 'Confirmed'
GROUP BY bc.company_name
ORDER BY total_revenue_pkr DESC;
GO

-- =============================================
-- QUERY 4: Upcoming Trips for a Given User
-- =============================================
-- Example: Get upcoming trips for user_id = 5
SELECT 
    b.booking_id,
    c1.city_name + N' → ' + c2.city_name AS route_name,
    bc.company_name,
    t.departure_datetime,
    t.arrival_datetime,
    b.total_amount_pkr - b.discount_amount_pkr AS amount_paid_pkr,
    b.status AS booking_status,
    COUNT(bd.booking_detail_id) AS seats_booked
FROM Bookings b
INNER JOIN Users u ON b.user_id = u.user_id
INNER JOIN Trips t ON b.trip_id = t.trip_id
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
INNER JOIN Buses bus ON t.bus_id = bus.bus_id
INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
WHERE u.user_id = 5 -- Replace with parameter
    AND t.departure_datetime > GETDATE()
    AND b.status IN ('Confirmed', 'Pending')
GROUP BY 
    b.booking_id, c1.city_name, c2.city_name, bc.company_name,
    t.departure_datetime, t.arrival_datetime, b.total_amount_pkr,
    b.discount_amount_pkr, b.status
ORDER BY t.departure_datetime ASC;
GO

-- =============================================
-- QUERY 5: Revenue per Route and per Operator for Date Range
-- =============================================
-- Example: revenue for the last 30 days
SELECT 
    bc.company_name,
    c1.city_name + N' → ' + c2.city_name AS route_name,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    SUM(b.total_amount_pkr - b.discount_amount_pkr) AS net_revenue_pkr,
    SUM(b.discount_amount_pkr) AS total_discounts_pkr
FROM Bookings b
INNER JOIN Trips t ON b.trip_id = t.trip_id
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
INNER JOIN Buses bus ON t.bus_id = bus.bus_id
INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
WHERE b.status = 'Confirmed'
    AND b.booking_datetime >= DATEADD(DAY, -30, GETDATE())
GROUP BY bc.company_name, c1.city_name, c2.city_name
ORDER BY net_revenue_pkr DESC;
GO

-- =============================================
-- QUERY 6: Monthly Revenue Trend
-- =============================================
SELECT 
    YEAR(b.booking_datetime) AS booking_year,
    MONTH(b.booking_datetime) AS booking_month,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    SUM(b.total_amount_pkr - b.discount_amount_pkr) AS net_revenue_pkr
FROM Bookings b
WHERE b.status = 'Confirmed'
GROUP BY YEAR(b.booking_datetime), MONTH(b.booking_datetime)
ORDER BY booking_year DESC, booking_month DESC;
GO

-- =============================================
-- QUERY 7: Trip Occupancy Details for a Company
-- =============================================
-- Example: Get occupancy for company_id = 1 (Daewoo Express)
SELECT 
    t.trip_id,
    c1.city_name + N' → ' + c2.city_name AS route_name,
    t.departure_datetime,
    t.arrival_datetime,
    bus.total_seats AS total_seats,
    COUNT(DISTINCT bd.seat_id) AS booked_seats,
    (bus.total_seats - COUNT(DISTINCT bd.seat_id)) AS available_seats,
    CAST((COUNT(DISTINCT bd.seat_id) * 100.0 / bus.total_seats) AS DECIMAL(5,2)) AS occupancy_pct
FROM Trips t
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
INNER JOIN Buses bus ON t.bus_id = bus.bus_id
INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
LEFT JOIN Bookings b ON t.trip_id = b.trip_id AND b.status = 'Confirmed'
LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
WHERE bc.company_id = 1 -- Replace with parameter
    AND t.departure_datetime > GETDATE()
GROUP BY 
    t.trip_id, c1.city_name, c2.city_name, t.departure_datetime,
    t.arrival_datetime, bus.total_seats
ORDER BY t.departure_datetime ASC;
GO

-- =============================================
-- QUERY 8: User Booking History with Trip Details
-- =============================================
SELECT 
    b.booking_id,
    b.booking_datetime,
    c1.city_name + N' → ' + c2.city_name AS route_name,
    bc.company_name,
    t.departure_datetime,
    t.arrival_datetime,
    b.total_amount_pkr - b.discount_amount_pkr AS amount_paid_pkr,
    b.status AS booking_status,
    STRING_AGG(bd.passenger_name, ', ') AS passengers,
    COUNT(bd.booking_detail_id) AS total_seats
FROM Bookings b
INNER JOIN Trips t ON b.trip_id = t.trip_id
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
INNER JOIN Buses bus ON t.bus_id = bus.bus_id
INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
WHERE b.user_id = 5 -- Replace with parameter
GROUP BY 
    b.booking_id, b.booking_datetime, c1.city_name, c2.city_name,
    bc.company_name, t.departure_datetime, t.arrival_datetime,
    b.total_amount_pkr, b.discount_amount_pkr, b.status
ORDER BY b.booking_datetime DESC;
GO

-- =============================================
-- QUERY 9: Promo Code Usage Statistics
-- =============================================
SELECT 
    pc.code,
    pc.description,
    pc.discount_type,
    pc.discount_value,
    pc.max_uses,
    pc.used_count,
    COUNT(DISTINCT b.booking_id) AS times_used,
    SUM(b.discount_amount_pkr) AS total_discount_given_pkr
FROM PromoCodes pc
LEFT JOIN Bookings b ON pc.code = b.promo_code_used
WHERE pc.is_active = 1
GROUP BY 
    pc.code, pc.description, pc.discount_type, pc.discount_value,
    pc.max_uses, pc.used_count
ORDER BY times_used DESC;
GO

-- =============================================
-- QUERY 10: Most Popular Routes by Passenger Count
-- =============================================
SELECT TOP 10
    c1.city_name + N' → ' + c2.city_name AS route_name,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    COUNT(DISTINCT bd.booking_detail_id) AS total_passengers,
    SUM(b.total_amount_pkr - b.discount_amount_pkr) AS total_revenue_pkr
FROM Routes r
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
INNER JOIN Trips t ON r.route_id = t.route_id
INNER JOIN Bookings b ON t.trip_id = b.trip_id
INNER JOIN BookingDetails bd ON b.booking_id = bd.booking_id
WHERE b.status = 'Confirmed'
GROUP BY c1.city_name, c2.city_name
ORDER BY total_passengers DESC;
GO

PRINT 'Views and queries created successfully!';
GO

