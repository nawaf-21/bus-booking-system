const { getPool, sql } = require('../config/db');

const createFeedback = async (req, res) => {
    try {
        const { tripId } = req.params;
        const { rating, comments } = req.body;

        if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const pool = await getPool();

        // Only someone with a confirmed booking on this trip, after it has left, can review it
        const bookingCheck = await pool.request()
            .input('tripId', sql.Int, tripId)
            .input('userId', sql.Int, req.user.userId)
            .query(`
                SELECT TOP 1 b.booking_id
                FROM Bookings b
                INNER JOIN Trips t ON b.trip_id = t.trip_id
                WHERE b.trip_id = @tripId AND b.user_id = @userId AND b.status = 'Confirmed'
                    AND t.departure_datetime < GETDATE()
            `);

        if (bookingCheck.recordset.length === 0) {
            return res.status(403).json({ error: 'You can only review trips you have travelled on' });
        }

        // Check if user already gave feedback for this trip
        const existingFeedback = await pool.request()
            .input('tripId', sql.Int, tripId)
            .input('userId', sql.Int, req.user.userId)
            .query('SELECT feedback_id FROM Feedback WHERE trip_id = @tripId AND user_id = @userId');

        if (existingFeedback.recordset.length > 0) {
            return res.status(400).json({ error: 'You have already provided feedback for this trip' });
        }

        const result = await pool.request()
            .input('bookingId', sql.Int, bookingCheck.recordset[0].booking_id)
            .input('tripId', sql.Int, tripId)
            .input('userId', sql.Int, req.user.userId)
            .input('rating', sql.Int, rating)
            .input('comments', sql.VarChar, comments ? String(comments).trim().slice(0, 500) : null)
            .query(`
                INSERT INTO Feedback (booking_id, trip_id, user_id, rating, comments)
                OUTPUT INSERTED.feedback_id
                VALUES (@bookingId, @tripId, @userId, @rating, @comments)
            `);

        res.status(201).json({
            message: 'Feedback submitted successfully',
            feedbackId: result.recordset[0].feedback_id
        });
    } catch (error) {
        console.error('Create feedback error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
};

const getTripFeedback = async (req, res) => {
    try {
        const { tripId } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('tripId', sql.Int, tripId)
            .query(`
                SELECT f.feedback_id, f.rating, f.comments, u.full_name AS passenger_name, f.created_at
                FROM Feedback f
                INNER JOIN Users u ON f.user_id = u.user_id
                WHERE f.trip_id = @tripId
                ORDER BY f.created_at DESC
            `);

        res.json({ feedback: result.recordset });
    } catch (error) {
        console.error('Get trip feedback error:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
};

const getMyFeedback = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .query(`
                SELECT f.feedback_id, f.rating, f.comments,
                       c1.city_name + N' → ' + c2.city_name AS route_name,
                       bc.company_name, f.created_at
                FROM Feedback f
                INNER JOIN Trips t ON f.trip_id = t.trip_id
                INNER JOIN Routes r ON t.route_id = r.route_id
                INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
                INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
                WHERE f.user_id = @userId
                ORDER BY f.created_at DESC
            `);

        res.json({ feedback: result.recordset });
    } catch (error) {
        console.error('Get my feedback error:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
};

module.exports = {
    createFeedback,
    getTripFeedback,
    getMyFeedback
};

