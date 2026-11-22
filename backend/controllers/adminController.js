const { getPool, sql } = require('../config/db');

const getOverview = async (req, res) => {
    try {
        const pool = await getPool();

        const bookingsResult = await pool.request().query(`
            SELECT COUNT(*) AS total_bookings
            FROM Bookings
            WHERE status = 'Confirmed'
        `);

        const revenueResult = await pool.request().query(`
            SELECT SUM(total_amount_pkr - discount_amount_pkr) AS total_revenue_pkr
            FROM Bookings
            WHERE status = 'Confirmed'
        `);

        const usersResult = await pool.request().query(`
            SELECT COUNT(*) AS total_users
            FROM Users
            WHERE role = 'Passenger' AND is_active = 1
        `);

        const topRoutesResult = await pool.request().query(`
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
            ORDER BY total_bookings DESC
        `);

        const topCompaniesRevenueResult = await pool.request().query(`
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
            ORDER BY total_revenue_pkr DESC
        `);

        const topCompaniesRatingResult = await pool.request().query(`
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
            ORDER BY crv.average_rating DESC, crv.total_ratings DESC
        `);

        res.json({
            stats: {
                totalBookings: bookingsResult.recordset[0].total_bookings || 0,
                totalRevenue: revenueResult.recordset[0].total_revenue_pkr || 0,
                totalUsers: usersResult.recordset[0].total_users || 0
            },
            topRoutes: topRoutesResult.recordset,
            topCompaniesByRevenue: topCompaniesRevenueResult.recordset,
            topCompaniesByRating: topCompaniesRatingResult.recordset
        });
    } catch (error) {
        console.error('Get admin overview error:', error);
        res.status(500).json({ error: 'Failed to fetch overview' });
    }
};

const getAllBookings = async (req, res) => {
    try {
        const { status, from_date, to_date } = req.query;
        const pool = await getPool();

        let query = `
            SELECT 
                b.booking_id,
                u.full_name AS passenger_name,
                u.email AS passenger_email,
                c1.city_name + N' → ' + c2.city_name AS route_name,
                bc.company_name,
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
            INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
            LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
            WHERE 1=1
        `;

        const request = pool.request();

        if (status) {
            query += ` AND b.status = @status`;
            request.input('status', sql.VarChar, status);
        }

        if (from_date) {
            query += ` AND CAST(b.booking_datetime AS DATE) >= @from_date`;
            request.input('from_date', sql.Date, from_date);
        }

        if (to_date) {
            query += ` AND CAST(b.booking_datetime AS DATE) <= @to_date`;
            request.input('to_date', sql.Date, to_date);
        }

        query += `
            GROUP BY 
                b.booking_id, u.full_name, u.email, c1.city_name, c2.city_name,
                bc.company_name, t.departure_datetime, b.total_amount_pkr,
                b.discount_amount_pkr, b.status, b.booking_datetime
            ORDER BY b.booking_datetime DESC
        `;

        const result = await request.query(query);

        res.json({ bookings: result.recordset });
    } catch (error) {
        console.error('Get all bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
};

const searchBookings = async (req, res) => {
    try {
        const { status, from_date, to_date, route_id, user_id, company_id } = req.query;
        const pool = await getPool();

        let query = `
            SELECT 
                b.booking_id,
                u.user_id,
                u.full_name AS passenger_name,
                u.email AS passenger_email,
                u.phone_no AS passenger_phone,
                c1.city_name + N' → ' + c2.city_name AS route_name,
                r.route_id,
                bc.company_id,
                bc.company_name,
                t.departure_datetime,
                b.total_amount_pkr,
                b.discount_amount_pkr,
                b.total_amount_pkr - b.discount_amount_pkr AS final_amount_pkr,
                b.status AS booking_status,
                b.booking_datetime,
                i.invoice_number,
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
            LEFT JOIN Invoices i ON b.booking_id = i.booking_id
            WHERE 1=1
        `;

        const request = pool.request();

        if (status) {
            query += ` AND b.status = @status`;
            request.input('status', sql.VarChar, status);
        }
        if (from_date) {
            query += ` AND CAST(b.booking_datetime AS DATE) >= @from_date`;
            request.input('from_date', sql.Date, from_date);
        }
        if (to_date) {
            query += ` AND CAST(b.booking_datetime AS DATE) <= @to_date`;
            request.input('to_date', sql.Date, to_date);
        }
        if (route_id) {
            query += ` AND r.route_id = @route_id`;
            request.input('route_id', sql.Int, route_id);
        }
        if (user_id) {
            query += ` AND u.user_id = @user_id`;
            request.input('user_id', sql.Int, user_id);
        }
        if (company_id) {
            query += ` AND bc.company_id = @company_id`;
            request.input('company_id', sql.Int, company_id);
        }

        query += `
            GROUP BY 
                b.booking_id, u.user_id, u.full_name, u.email, u.phone_no,
                c1.city_name, c2.city_name, r.route_id, bc.company_id, bc.company_name,
                t.departure_datetime, b.total_amount_pkr, b.discount_amount_pkr,
                b.status, b.booking_datetime, i.invoice_number
            ORDER BY b.booking_datetime DESC
        `;

        const result = await request.query(query);
        res.json({ bookings: result.recordset });
    } catch (error) {
        console.error('Search bookings error:', error);
        res.status(500).json({ error: 'Failed to search bookings' });
    }
};

const forceCancelBooking = async (req, res) => {
    let transaction;
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const pool = await getPool();

        const bookingResult = await pool.request()
            .input('bookingId', sql.Int, id)
            .query('SELECT booking_id, status FROM Bookings WHERE booking_id = @bookingId');

        if (bookingResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (bookingResult.recordset[0].status !== 'Confirmed') {
            return res.status(400).json({ error: 'This booking is not active' });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        await transaction.request()
            .input('bookingId', sql.Int, id)
            .input('reason', sql.VarChar, reason || 'Cancelled by admin')
            .query(`
                UPDATE Bookings
                SET status = 'Cancelled',
                    cancellation_reason = @reason,
                    cancelled_at = GETDATE()
                WHERE booking_id = @bookingId
            `);

        await transaction.request()
            .input('bookingId', sql.Int, id)
            .query(`
                UPDATE Payments
                SET status = 'Refunded'
                WHERE booking_id = @bookingId
            `);

        await transaction.commit();

        res.json({ message: 'Booking force cancelled and refunded successfully' });
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch { /* already rolled back */ }
        }
        console.error('Force cancel booking error:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
};

const processRefund = async (req, res) => {
    let transaction;
    try {
        const { id } = req.params;
        const { amount, reason } = req.body;
        const pool = await getPool();

        const bookingResult = await pool.request()
            .input('bookingId', sql.Int, id)
            .query(`
                SELECT b.booking_id, b.status, b.total_amount_pkr - b.discount_amount_pkr AS paid_amount,
                       p.payment_id, p.status AS payment_status
                FROM Bookings b
                LEFT JOIN Payments p ON b.booking_id = p.booking_id
                WHERE b.booking_id = @bookingId
            `);

        if (bookingResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingResult.recordset[0];

        if (booking.status !== 'Confirmed') {
            return res.status(400).json({ error: 'Only confirmed bookings can be refunded' });
        }
        if (booking.payment_status === 'Refunded') {
            return res.status(400).json({ error: 'This booking is already refunded' });
        }

        const paidAmount = Number(booking.paid_amount);
        const refundAmount = (amount === undefined || amount === null || amount === '')
            ? paidAmount
            : Number(amount);

        if (!(refundAmount > 0)) {
            return res.status(400).json({ error: 'Refund amount must be more than zero' });
        }
        if (refundAmount > paidAmount) {
            return res.status(400).json({ error: `Refund amount cannot be more than the paid amount (PKR ${paidAmount})` });
        }

        const refundReason = reason || 'Admin refund';

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        await transaction.request()
            .input('bookingId', sql.Int, id)
            .input('reason', sql.VarChar, refundReason)
            .query(`
                UPDATE Bookings
                SET status = 'Refunded',
                    cancellation_reason = @reason,
                    cancelled_at = GETDATE()
                WHERE booking_id = @bookingId
            `);

        await transaction.request()
            .input('bookingId', sql.Int, id)
            .query("UPDATE Payments SET status = 'Refunded' WHERE booking_id = @bookingId");

        await transaction.commit();

        res.json({
            message: 'Refund processed successfully',
            refundAmount: refundAmount,
            reason: refundReason
        });
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch { /* already rolled back */ }
        }
        console.error('Process refund error:', error);
        res.status(500).json({ error: 'Failed to process refund' });
    }
};

const reserveSeat = async (req, res) => {
    let transaction;
    try {
        const { trip_id, seat_id, passenger_name, passenger_gender } = req.body;

        if (!trip_id || !seat_id || !passenger_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const gender = passenger_gender || 'Neutral';
        if (!['Male', 'Female', 'Neutral'].includes(gender)) {
            return res.status(400).json({ error: 'Invalid passenger gender' });
        }

        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        // serializable so two people can't grab the same seat
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

        const tripCheck = await transaction.request()
            .input('tripId', sql.Int, trip_id)
            .query(`
                SELECT trip_id FROM Trips
                WHERE trip_id = @tripId AND status = 'Scheduled' AND departure_datetime > GETDATE()
            `);

        if (tripCheck.recordset.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Seats can only be reserved on upcoming scheduled trips' });
        }

        const seatOnBus = await transaction.request()
            .input('tripId', sql.Int, trip_id)
            .input('seatId', sql.Int, seat_id)
            .query(`
                SELECT s.seat_id
                FROM Trips t
                INNER JOIN Seats s ON s.bus_id = t.bus_id
                WHERE t.trip_id = @tripId AND s.seat_id = @seatId
            `);

        if (seatOnBus.recordset.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'This seat is not on the bus for this trip' });
        }

        const seatCheck = await transaction.request()
            .input('tripId', sql.Int, trip_id)
            .input('seatId', sql.Int, seat_id)
            .query(`
                SELECT bd.booking_detail_id
                FROM BookingDetails bd
                INNER JOIN Bookings b ON bd.booking_id = b.booking_id
                WHERE b.trip_id = @tripId AND bd.seat_id = @seatId AND b.status = 'Confirmed'
            `);

        if (seatCheck.recordset.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Seat is already booked' });
        }

        const bookingResult = await transaction.request()
            .input('tripId', sql.Int, trip_id)
            .input('adminId', sql.Int, req.user.userId)
            .query(`
                INSERT INTO Bookings (user_id, trip_id, total_amount_pkr, discount_amount_pkr, status)
                OUTPUT INSERTED.booking_id
                VALUES (@adminId, @tripId, 0, 0, 'Confirmed')
            `);

        const bookingId = bookingResult.recordset[0].booking_id;

        await transaction.request()
            .input('bookingId', sql.Int, bookingId)
            .input('seatId', sql.Int, seat_id)
            .input('passengerName', sql.VarChar, passenger_name)
            .input('passengerGender', sql.VarChar, gender)
            .input('farePkr', sql.Decimal(10,2), 0)
            .query(`
                INSERT INTO BookingDetails (booking_id, seat_id, passenger_name, passenger_gender, fare_pkr)
                VALUES (@bookingId, @seatId, @passengerName, @passengerGender, @farePkr)
            `);

        await transaction.commit();

        res.status(201).json({
            message: 'Seat reserved successfully (admin override)',
            bookingId: bookingId
        });
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch { /* already rolled back */ }
        }
        console.error('Reserve seat error:', error);
        res.status(500).json({ error: 'Failed to reserve seat' });
    }
};

const getAllTrips = async (req, res) => {
    try {
        const { status, company_id } = req.query;
        const pool = await getPool();

        let query = `
            SELECT 
                t.trip_id,
                c1.city_name + N' → ' + c2.city_name AS route_name,
                bc.company_name,
                bus.bus_name,
                t.departure_datetime,
                t.arrival_datetime,
                t.fare_pkr,
                t.status AS trip_status,
                bus.total_seats AS total_seats_available,
                COUNT(DISTINCT bd.seat_id) AS seats_booked,
                (bus.total_seats - COUNT(DISTINCT bd.seat_id)) AS seats_available
            FROM Trips t
            INNER JOIN Routes r ON t.route_id = r.route_id
            INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
            INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
            INNER JOIN Buses bus ON t.bus_id = bus.bus_id
            INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
            LEFT JOIN Bookings b ON t.trip_id = b.trip_id AND b.status = 'Confirmed'
            LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
            WHERE 1=1
        `;

        const request = pool.request();

        if (status) {
            query += ` AND t.status = @status`;
            request.input('status', sql.VarChar, status);
        }

        if (company_id) {
            query += ` AND bc.company_id = @company_id`;
            request.input('company_id', sql.Int, company_id);
        }

        query += `
            GROUP BY 
                t.trip_id, c1.city_name, c2.city_name, bc.company_name,
                bus.bus_name, t.departure_datetime, t.arrival_datetime,
                t.fare_pkr, t.status, bus.total_seats
            ORDER BY t.departure_datetime DESC
        `;

        const result = await request.query(query);

        res.json({ trips: result.recordset });
    } catch (error) {
        console.error('Get all trips error:', error);
        res.status(500).json({ error: 'Failed to fetch trips' });
    }
};

module.exports = {
    getOverview,
    getAllBookings,
    searchBookings,
    getAllTrips,
    forceCancelBooking,
    processRefund,
    reserveSeat
};

