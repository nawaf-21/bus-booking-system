-- =============================================
-- QUICK DEMO QUERIES - SHOW DATABASE STATE
-- Perform actions in website, then run these to show results
-- =============================================

USE TravelBookingDB;
GO

-- =============================================
-- SECTION 1: USERS
-- =============================================

-- 1.1 All Users
SELECT 
    user_id,
    full_name,
    email,
    role,
    is_active,
    created_at
FROM Users
ORDER BY role, full_name;
GO

-- 1.2 Users by Role
SELECT 
    role,
    COUNT(*) AS count,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
FROM Users
GROUP BY role;
GO

-- 1.3 Check if Specific User Exists (After deletion in website)
SELECT user_id, full_name, email, role
FROM Users
WHERE user_id = 5;  -- Change to user_id you deleted
GO

-- 1.4 Check Company Manager User (After creating company in website)
SELECT 
    u.user_id,
    u.full_name,
    u.email,
    u.role,
    u.is_active,
    bc.company_name
FROM Users u
INNER JOIN BusCompanies bc ON u.company_id = bc.company_id
WHERE u.role = 'BusCompany'
ORDER BY u.created_at DESC;
GO

-- =============================================
-- SECTION 2: BOOKINGS
-- =============================================

-- 2.1 All Bookings
SELECT 
    b.booking_id,
    u.full_name AS passenger,
    u.email,
    c1.city_name + N' → ' + c2.city_name AS route,
    bc.company_name,
    b.total_amount_pkr - b.discount_amount_pkr AS amount_paid,
    b.status,
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

-- 2.2 Bookings for Specific User (After user deletion, should be empty)
SELECT 
    b.booking_id,
    c1.city_name + N' → ' + c2.city_name AS route,
    b.total_amount_pkr,
    b.status
FROM Bookings b
INNER JOIN Trips t ON b.trip_id = t.trip_id
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
WHERE b.user_id = 5;  -- Change to deleted user_id
GO

-- 2.3 Booking Statistics
SELECT 
    status,
    COUNT(*) AS count,
    SUM(total_amount_pkr - discount_amount_pkr) AS revenue
FROM Bookings
GROUP BY status
ORDER BY count DESC;
GO

-- =============================================
-- SECTION 3: TRIPS
-- =============================================

-- 3.1 All Active Trips
SELECT 
    t.trip_id,
    c1.city_name + N' → ' + c2.city_name AS route,
    bc.company_name,
    t.departure_datetime,
    t.fare_pkr,
    t.status
FROM Trips t
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
INNER JOIN Buses b ON t.bus_id = b.bus_id
INNER JOIN BusCompanies bc ON b.company_id = bc.company_id
WHERE t.status = 'Scheduled'
ORDER BY t.departure_datetime;
GO

-- =============================================
-- SECTION 4: COMPANIES
-- =============================================

-- 4.1 All Bus Companies
SELECT 
    company_id,
    company_name,
    contact_email,
    status,
    created_at
FROM BusCompanies
ORDER BY company_name;
GO

-- 4.2 Company Revenue
SELECT 
    bc.company_name,
    COUNT(bk.booking_id) AS total_bookings,
    SUM(bk.total_amount_pkr - bk.discount_amount_pkr) AS total_revenue
FROM BusCompanies bc
INNER JOIN Buses b ON bc.company_id = b.company_id
INNER JOIN Trips t ON b.bus_id = t.bus_id
INNER JOIN Bookings bk ON t.trip_id = bk.trip_id
WHERE bk.status = 'Confirmed'
GROUP BY bc.company_name
ORDER BY total_revenue DESC;
GO

-- =============================================
-- SECTION 5: TOP ROUTES
-- =============================================

-- 5.1 Top 5 Routes by Bookings
SELECT TOP 5
    c1.city_name + N' → ' + c2.city_name AS route,
    COUNT(b.booking_id) AS total_bookings,
    SUM(b.total_amount_pkr - b.discount_amount_pkr) AS revenue
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
-- SECTION 6: PAYMENTS & INVOICES
-- =============================================

-- 6.1 Recent Payments
SELECT TOP 10
    p.payment_id,
    u.full_name AS customer,
    p.amount_pkr,
    p.payment_method,
    p.status,
    p.paid_at
FROM Payments p
INNER JOIN Bookings b ON p.booking_id = b.booking_id
INNER JOIN Users u ON b.user_id = u.user_id
ORDER BY p.paid_at DESC;
GO

-- 6.2 Recent Invoices
SELECT TOP 10
    i.invoice_number,
    u.full_name AS customer,
    c1.city_name + N' → ' + c2.city_name AS route,
    b.total_amount_pkr - b.discount_amount_pkr AS amount,
    i.invoice_date
FROM Invoices i
INNER JOIN Bookings b ON i.booking_id = b.booking_id
INNER JOIN Users u ON b.user_id = u.user_id
INNER JOIN Trips t ON b.trip_id = t.trip_id
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
ORDER BY i.invoice_date DESC;
GO

-- =============================================
-- SECTION 7: FEEDBACK
-- =============================================

-- 7.1 Recent Feedback
SELECT TOP 10
    u.full_name AS user_name,
    c1.city_name + N' → ' + c2.city_name AS route,
    bc.company_name,
    f.rating,
    LEFT(f.comments, 50) AS comment_preview,
    f.created_at
FROM Feedback f
INNER JOIN Users u ON f.user_id = u.user_id
INNER JOIN Trips t ON f.trip_id = t.trip_id
INNER JOIN Routes r ON t.route_id = r.route_id
INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
INNER JOIN Buses b ON t.bus_id = b.bus_id
INNER JOIN BusCompanies bc ON b.company_id = bc.company_id
ORDER BY f.created_at DESC;
GO

-- =============================================
-- SECTION 8: SYSTEM OVERVIEW
-- =============================================

-- 8.1 Complete System Statistics
SELECT 
    (SELECT COUNT(*) FROM Users WHERE role = 'Passenger') AS total_passengers,
    (SELECT COUNT(*) FROM BusCompanies) AS total_companies,
    (SELECT COUNT(*) FROM Buses) AS total_buses,
    (SELECT COUNT(*) FROM Routes) AS total_routes,
    (SELECT COUNT(*) FROM Trips WHERE status = 'Scheduled') AS active_trips,
    (SELECT COUNT(*) FROM Bookings WHERE status = 'Confirmed') AS total_bookings,
    (SELECT SUM(total_amount_pkr - discount_amount_pkr) FROM Bookings WHERE status = 'Confirmed') AS total_revenue;
GO

-- =============================================
-- END
-- =============================================
-- Use these queries to show database state after actions in website
-- =============================================
