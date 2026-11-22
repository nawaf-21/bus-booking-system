const { getPool, sql } = require('../config/db');

const getOverview = async (req, res) => {
    try {
        const pool = await getPool();
        const companyId = req.user.companyId;

        const bookingsResult = await pool.request()
            .input('companyId', sql.Int, companyId)
            .query(`
                SELECT COUNT(DISTINCT b.booking_id) AS total_bookings
                FROM Bookings b
                INNER JOIN Trips t ON b.trip_id = t.trip_id
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                WHERE bus.company_id = @companyId AND b.status = 'Confirmed'
            `);

        const revenueResult = await pool.request()
            .input('companyId', sql.Int, companyId)
            .query(`
                SELECT SUM(b.total_amount_pkr - b.discount_amount_pkr) AS total_revenue_pkr
                FROM Bookings b
                INNER JOIN Trips t ON b.trip_id = t.trip_id
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                WHERE bus.company_id = @companyId AND b.status = 'Confirmed'
            `);

        const upcomingTripsResult = await pool.request()
            .input('companyId', sql.Int, companyId)
            .query(`
                SELECT COUNT(*) AS upcoming_trips
                FROM Trips t
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                WHERE bus.company_id = @companyId 
                    AND t.status = 'Scheduled'
                    AND t.departure_datetime > GETDATE()
            `);

        const ratingResult = await pool.request()
            .input('companyId', sql.Int, companyId)
            .query(`
                SELECT 
                    AVG(CAST(f.rating AS DECIMAL(3,2))) AS average_rating,
                    COUNT(DISTINCT f.feedback_id) AS total_ratings
                FROM Feedback f
                INNER JOIN Trips t ON f.trip_id = t.trip_id
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                WHERE bus.company_id = @companyId
            `);

        const upcomingTripsResult2 = await pool.request()
            .input('companyId', sql.Int, companyId)
            .query(`
                SELECT 
                    t.trip_id,
                    c1.city_name + N' → ' + c2.city_name AS route_name,
                    t.departure_datetime,
                    bus.total_seats AS total_seats,
                    COUNT(DISTINCT bd.seat_id) AS booked_seats,
                    (bus.total_seats - COUNT(DISTINCT bd.seat_id)) AS available_seats,
                    CAST((COUNT(DISTINCT bd.seat_id) * 100.0 / bus.total_seats) AS DECIMAL(5,2)) AS occupancy_pct
                FROM Trips t
                INNER JOIN Routes r ON t.route_id = r.route_id
                INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
                INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                LEFT JOIN Bookings b ON t.trip_id = b.trip_id AND b.status = 'Confirmed'
                LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
                WHERE bus.company_id = @companyId
                    AND t.status = 'Scheduled'
                    AND t.departure_datetime > GETDATE()
                GROUP BY 
                    t.trip_id, c1.city_name, c2.city_name, t.departure_datetime,
                    bus.total_seats
                ORDER BY t.departure_datetime ASC
            `);

        const feedbackResult = await pool.request()
            .input('companyId', sql.Int, companyId)
            .query(`
                SELECT TOP 5
                    f.feedback_id,
                    f.rating,
                    f.comments,
                    u.full_name AS passenger_name,
                    c1.city_name + N' → ' + c2.city_name AS route_name,
                    f.created_at
                FROM Feedback f
                INNER JOIN Trips t ON f.trip_id = t.trip_id
                INNER JOIN Routes r ON t.route_id = r.route_id
                INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
                INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                INNER JOIN Users u ON f.user_id = u.user_id
                WHERE bus.company_id = @companyId
                ORDER BY f.created_at DESC
            `);

        res.json({
            stats: {
                totalBookings: bookingsResult.recordset[0].total_bookings || 0,
                totalRevenue: revenueResult.recordset[0].total_revenue_pkr || 0,
                upcomingTrips: upcomingTripsResult.recordset[0].upcoming_trips || 0,
                averageRating: ratingResult.recordset[0].average_rating || 0,
                totalRatings: ratingResult.recordset[0].total_ratings || 0
            },
            upcomingTrips: upcomingTripsResult2.recordset,
            recentFeedback: feedbackResult.recordset
        });
    } catch (error) {
        console.error('Get company overview error:', error);
        res.status(500).json({ error: 'Failed to fetch overview' });
    }
};

const getCompanyTrips = async (req, res) => {
    try {
        const pool = await getPool();
        const companyId = req.user.companyId;

        const result = await pool.request()
            .input('companyId', sql.Int, companyId)
            .query(`
                SELECT 
                    t.trip_id,
                    c1.city_name + N' → ' + c2.city_name AS route_name,
                    bus.bus_name,
                    t.departure_datetime,
                    t.arrival_datetime,
                    t.fare_pkr,
                    t.status AS trip_status,
                    bus.total_seats AS total_seats,
                    COUNT(DISTINCT bd.seat_id) AS booked_seats,
                    (bus.total_seats - COUNT(DISTINCT bd.seat_id)) AS available_seats
                FROM Trips t
                INNER JOIN Routes r ON t.route_id = r.route_id
                INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
                INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                LEFT JOIN Bookings b ON t.trip_id = b.trip_id AND b.status = 'Confirmed'
                LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
                WHERE bus.company_id = @companyId
                GROUP BY 
                    t.trip_id, c1.city_name, c2.city_name, bus.bus_name,
                    t.departure_datetime, t.arrival_datetime, t.fare_pkr, t.status, bus.total_seats
                ORDER BY t.departure_datetime DESC
            `);

        res.json({ trips: result.recordset });
    } catch (error) {
        console.error('Get company trips error:', error);
        res.status(500).json({ error: 'Failed to fetch trips' });
    }
};

const getCompanyBookings = async (req, res) => {
    try {
        const pool = await getPool();
        const companyId = req.user.companyId;

        const result = await pool.request()
            .input('companyId', sql.Int, companyId)
            .query(`
                SELECT 
                    b.booking_id,
                    u.full_name AS passenger_name,
                    c1.city_name + N' → ' + c2.city_name AS route_name,
                    t.departure_datetime,
                    b.total_amount_pkr - b.discount_amount_pkr AS final_amount_pkr,
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
                LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
                WHERE bus.company_id = @companyId
                GROUP BY 
                    b.booking_id, u.full_name, c1.city_name, c2.city_name,
                    t.departure_datetime, b.total_amount_pkr, b.discount_amount_pkr,
                    b.status, b.booking_datetime
                ORDER BY b.booking_datetime DESC
            `);

        res.json({ bookings: result.recordset });
    } catch (error) {
        console.error('Get company bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
};

const getCompanyFeedback = async (req, res) => {
    try {
        const pool = await getPool();
        const companyId = req.user.companyId;

        const result = await pool.request()
            .input('companyId', sql.Int, companyId)
            .query(`
                SELECT 
                    f.feedback_id,
                    f.rating,
                    f.comments,
                    u.full_name AS passenger_name,
                    c1.city_name + N' → ' + c2.city_name AS route_name,
                    t.departure_datetime,
                    f.created_at
                FROM Feedback f
                INNER JOIN Trips t ON f.trip_id = t.trip_id
                INNER JOIN Routes r ON t.route_id = r.route_id
                INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
                INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                INNER JOIN Users u ON f.user_id = u.user_id
                WHERE bus.company_id = @companyId
                ORDER BY f.created_at DESC
            `);

        res.json({ feedback: result.recordset });
    } catch (error) {
        console.error('Get company feedback error:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
};

module.exports = {
    getOverview,
    getCompanyTrips,
    getCompanyBookings,
    getCompanyFeedback
};

