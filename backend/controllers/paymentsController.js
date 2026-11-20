const { getPool, sql } = require('../config/db');

const getPaymentByBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('bookingId', sql.Int, bookingId)
            .input('userId', sql.Int, req.user.userId)
            .query(`
                SELECT p.payment_id, p.amount_pkr, p.payment_method, p.transaction_ref,
                       p.status, p.paid_at, p.created_at
                FROM Payments p
                INNER JOIN Bookings b ON p.booking_id = b.booking_id
                WHERE p.booking_id = @bookingId AND b.user_id = @userId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json({ payment: result.recordset[0] });
    } catch (error) {
        console.error('Get payment by booking error:', error);
        res.status(500).json({ error: 'Failed to fetch payment' });
    }
};

module.exports = {
    getPaymentByBooking
};

