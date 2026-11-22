const { getPool, sql } = require('../config/db');
const { validateGenderSeatRules, toIdList, addIdInputs } = require('../utils/helpers');

const PAYMENT_METHODS = ['Card', 'JazzCash', 'Easypaisa', 'CashOnCounter'];
const GENDERS = ['Male', 'Female'];

class BookingError extends Error {}

// db is the pool (preview) or a transaction (confirm)
const checkBooking = async (db, body) => {
    const { trip_id, seat_ids, passenger_names, passenger_genders, promo_code } = body;

    const tripId = Number(trip_id);
    const seatIds = toIdList(seat_ids);
    if (!Number.isInteger(tripId) || !seatIds || !Array.isArray(passenger_names) || !Array.isArray(passenger_genders)) {
        throw new BookingError('Missing required fields');
    }
    if (seatIds.length !== passenger_names.length || seatIds.length !== passenger_genders.length) {
        throw new BookingError('Seat IDs, passenger names, and genders must match');
    }
    if (seatIds.length > 6) {
        throw new BookingError('You can book at most 6 seats at a time');
    }
    if (new Set(seatIds).size !== seatIds.length) {
        throw new BookingError('The same seat was chosen twice');
    }
    if (passenger_names.some(name => !name || !String(name).trim())) {
        throw new BookingError('Please enter a name for every passenger');
    }
    if (passenger_genders.some(g => !GENDERS.includes(g))) {
        throw new BookingError('Please choose a gender for every passenger');
    }

    const tripResult = await db.request()
        .input('tripId', sql.Int, tripId)
        .query(`
            SELECT t.trip_id, t.fare_pkr, t.bus_id, t.departure_datetime, r.route_id, bus.company_id,
                   c1.city_name AS from_city, c2.city_name AS to_city
            FROM Trips t
            INNER JOIN Routes r ON t.route_id = r.route_id
            INNER JOIN Buses bus ON t.bus_id = bus.bus_id
            INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
            INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
            INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
            WHERE t.trip_id = @tripId AND t.status = 'Scheduled' AND t.departure_datetime > GETDATE()
              AND bus.status = 'Active' AND bc.status = 'Active'
        `);

    if (tripResult.recordset.length === 0) {
        throw new BookingError('This trip is not available for booking');
    }
    const trip = tripResult.recordset[0];

    const seatRequest = db.request()
        .input('tripId', sql.Int, tripId)
        .input('busId', sql.Int, trip.bus_id);
    const seatList = addIdInputs(seatRequest, seatIds, 'seat');
    const seatsResult = await seatRequest.query(`
        SELECT s.seat_id, s.seat_number,
               CASE WHEN EXISTS (
                   SELECT 1 FROM BookingDetails bd
                   INNER JOIN Bookings b ON bd.booking_id = b.booking_id
                   WHERE bd.seat_id = s.seat_id AND b.trip_id = @tripId AND b.status = 'Confirmed'
               ) THEN 1 ELSE 0 END AS is_booked
        FROM Seats s
        WHERE s.bus_id = @busId AND s.seat_id IN (${seatList})
    `);

    if (seatsResult.recordset.length !== seatIds.length) {
        throw new BookingError('Some of the chosen seats are not on this bus');
    }
    const bookedSeats = seatsResult.recordset.filter(s => s.is_booked === 1).map(s => s.seat_number);
    if (bookedSeats.length > 0) {
        throw new BookingError(`Seat ${bookedSeats.join(', ')} has just been booked by someone else. Please choose another seat.`);
    }

    const genderCheck = await validateGenderSeatRules(db, tripId, seatIds, passenger_genders);
    if (!genderCheck.valid) {
        throw new BookingError(genderCheck.error);
    }

    const baseAmount = Number(trip.fare_pkr) * seatIds.length;
    let discountAmount = 0;
    let promo = null;

    if (promo_code) {
        const code = String(promo_code).trim().toUpperCase();
        const promoResult = await db.request()
            .input('code', sql.VarChar, code)
            .query(`
                SELECT pc.promo_id, pc.code, pc.discount_type, pc.discount_value,
                       pc.is_active, pc.applicable_route_id, pc.applicable_company_id,
                       CASE WHEN pc.valid_from > GETDATE() THEN 1 ELSE 0 END AS not_started,
                       CASE WHEN pc.valid_to < GETDATE() THEN 1 ELSE 0 END AS expired,
                       CASE WHEN pc.max_uses IS NOT NULL AND pc.used_count >= pc.max_uses THEN 1 ELSE 0 END AS used_up,
                       c1.city_name + N' to ' + c2.city_name AS route_name,
                       bc.company_name
                FROM PromoCodes pc
                LEFT JOIN Routes r ON pc.applicable_route_id = r.route_id
                LEFT JOIN Cities c1 ON r.from_city_id = c1.city_id
                LEFT JOIN Cities c2 ON r.to_city_id = c2.city_id
                LEFT JOIN BusCompanies bc ON pc.applicable_company_id = bc.company_id
                WHERE pc.code = @code
            `);

        const found = promoResult.recordset[0];
        if (!found) {
            throw new BookingError(`There is no promo code called "${code}"`);
        }
        if (!found.is_active) {
            throw new BookingError('This promo code is no longer available');
        }
        if (found.not_started) {
            throw new BookingError('This promo code has not started yet');
        }
        if (found.expired) {
            throw new BookingError('This promo code has expired');
        }
        if (found.used_up) {
            throw new BookingError('This promo code has been fully used');
        }
        if (found.applicable_route_id && found.applicable_route_id !== trip.route_id) {
            throw new BookingError(`This promo code only works on ${found.route_name} trips`);
        }
        if (found.applicable_company_id && found.applicable_company_id !== trip.company_id) {
            throw new BookingError(`This promo code only works on ${found.company_name} trips`);
        }
        promo = found;
        discountAmount = promo.discount_type === 'Percentage'
            ? Math.round(baseAmount * Number(promo.discount_value)) / 100
            : Number(promo.discount_value);
        discountAmount = Math.min(discountAmount, baseAmount);
    }

    const seatNumbers = seatIds.map(id => seatsResult.recordset.find(s => s.seat_id === id).seat_number);

    return {
        trip,
        seatIds,
        seatNumbers,
        passengerNames: passenger_names.map(name => String(name).trim()),
        passengerGenders: passenger_genders,
        baseAmount,
        discountAmount,
        finalAmount: baseAmount - discountAmount,
        promo
    };
};

const previewBooking = async (req, res) => {
    try {
        const pool = await getPool();
        const booking = await checkBooking(pool, req.body);

        res.json({
            trip: {
                tripId: booking.trip.trip_id,
                routeId: booking.trip.route_id,
                companyId: booking.trip.company_id,
                fromCity: booking.trip.from_city,
                toCity: booking.trip.to_city,
                farePerSeat: booking.trip.fare_pkr
            },
            seats: booking.seatIds.map((seatId, i) => ({
                seatId,
                seatNumber: booking.seatNumbers[i],
                passengerName: booking.passengerNames[i],
                passengerGender: booking.passengerGenders[i]
            })),
            pricing: {
                baseAmount: booking.baseAmount,
                discountAmount: booking.discountAmount,
                finalAmount: booking.finalAmount,
                promoCode: booking.promo ? booking.promo.code : null
            },
            promoInfo: booking.promo
        });
    } catch (error) {
        if (error instanceof BookingError) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Preview booking error:', error);
        res.status(500).json({ error: 'Failed to preview booking' });
    }
};

const confirmBooking = async (req, res) => {
    const { payment_method } = req.body;
    if (!PAYMENT_METHODS.includes(payment_method)) {
        return res.status(400).json({ error: 'Please choose a payment method' });
    }

    let transaction;
    try {
        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        // serializable stops double booking the same seat
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

        const booking = await checkBooking(transaction, req.body);

        if (booking.promo) {
            await transaction.request()
                .input('promoId', sql.Int, booking.promo.promo_id)
                .query('UPDATE PromoCodes SET used_count = used_count + 1 WHERE promo_id = @promoId');
        }

        const bookingResult = await transaction.request()
            .input('userId', sql.Int, req.user.userId)
            .input('tripId', sql.Int, booking.trip.trip_id)
            .input('totalAmount', sql.Decimal(10, 2), booking.baseAmount)
            .input('discountAmount', sql.Decimal(10, 2), booking.discountAmount)
            .input('promoCode', sql.VarChar, booking.promo ? booking.promo.code : null)
            .query(`
                INSERT INTO Bookings (user_id, trip_id, total_amount_pkr, discount_amount_pkr, promo_code_used, status)
                OUTPUT INSERTED.booking_id
                VALUES (@userId, @tripId, @totalAmount, @discountAmount, @promoCode, 'Confirmed')
            `);

        const bookingId = bookingResult.recordset[0].booking_id;

        for (let i = 0; i < booking.seatIds.length; i++) {
            await transaction.request()
                .input('bookingId', sql.Int, bookingId)
                .input('seatId', sql.Int, booking.seatIds[i])
                .input('passengerName', sql.VarChar, booking.passengerNames[i])
                .input('passengerGender', sql.VarChar, booking.passengerGenders[i])
                .input('farePkr', sql.Decimal(10, 2), booking.trip.fare_pkr)
                .query(`
                    INSERT INTO BookingDetails (booking_id, seat_id, passenger_name, passenger_gender, fare_pkr)
                    VALUES (@bookingId, @seatId, @passengerName, @passengerGender, @farePkr)
                `);
        }

        // payments are simulated
        await transaction.request()
            .input('bookingId', sql.Int, bookingId)
            .input('amount', sql.Decimal(10, 2), booking.finalAmount)
            .input('paymentMethod', sql.VarChar, payment_method)
            .input('transactionRef', sql.VarChar, `TXN-${Date.now()}-${bookingId}`)
            .query(`
                INSERT INTO Payments (booking_id, amount_pkr, payment_method, transaction_ref, status, paid_at)
                VALUES (@bookingId, @amount, @paymentMethod, @transactionRef, 'Success', GETDATE())
            `);

        await transaction.request()
            .input('bookingId', sql.Int, bookingId)
            .input('invoiceNumber', sql.VarChar, `INV-${Date.now()}-${bookingId}`)
            .query('INSERT INTO Invoices (booking_id, invoice_number) VALUES (@bookingId, @invoiceNumber)');

        await transaction.commit();

        res.status(201).json({
            message: 'Booking confirmed successfully',
            bookingId,
            totalAmount: booking.finalAmount
        });
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch { /* already rolled back */ }
        }
        if (error instanceof BookingError) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Confirm booking error:', error);
        res.status(500).json({ error: 'Failed to confirm booking' });
    }
};

const getMyBookings = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .query(`
                SELECT 
                    b.booking_id,
                    b.trip_id,
                    t.status AS trip_status,
                    b.booking_datetime,
                    b.total_amount_pkr,
                    b.discount_amount_pkr,
                    b.total_amount_pkr - b.discount_amount_pkr AS amount_paid_pkr,
                    b.status AS booking_status,
                    u.full_name AS user_name,
                    u.email AS user_email,
                    u.phone_no AS user_phone,
                    c1.city_name + N' → ' + c2.city_name AS route_name,
                    bc.company_name,
                    t.departure_datetime,
                    t.arrival_datetime,
                    t.fare_pkr,
                    COUNT(bd.booking_detail_id) AS total_seats,
                    i.invoice_number,
                    p.payment_method,
                    p.status AS payment_status,
                    p.paid_at AS payment_datetime,
                    -- 1 if the passenger already reviewed this trip
                    CASE WHEN EXISTS (
                        SELECT 1 FROM Feedback f WHERE f.trip_id = b.trip_id AND f.user_id = b.user_id
                    ) THEN 1 ELSE 0 END AS has_review
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
                LEFT JOIN Payments p ON b.booking_id = p.booking_id
                WHERE b.user_id = @userId
                GROUP BY 
                    b.booking_id, b.trip_id, b.user_id, b.booking_datetime, b.total_amount_pkr, b.discount_amount_pkr,
                    b.status, u.full_name, u.email, u.phone_no, c1.city_name, c2.city_name,
                    bc.company_name, t.status, t.departure_datetime, t.arrival_datetime, t.fare_pkr,
                    i.invoice_number, p.payment_method, p.status, p.paid_at
                ORDER BY b.booking_datetime DESC
            `);

        res.json({ bookings: result.recordset });
    } catch (error) {
        console.error('Get my bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
};

const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('bookingId', sql.Int, id)
            .input('userId', sql.Int, req.user.userId)
            .query(`
                SELECT 
                    b.booking_id,
                    b.booking_datetime,
                    c1.city_name + N' → ' + c2.city_name AS route_name,
                    bc.company_name,
                    t.departure_datetime,
                    t.arrival_datetime,
                    b.total_amount_pkr,
                    b.discount_amount_pkr,
                    b.total_amount_pkr - b.discount_amount_pkr AS final_amount_pkr,
                    b.status AS booking_status,
                    i.invoice_number,
                    p.payment_method,
                    p.status AS payment_status,
                    p.transaction_ref
                FROM Bookings b
                INNER JOIN Trips t ON b.trip_id = t.trip_id
                INNER JOIN Routes r ON t.route_id = r.route_id
                INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
                INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
                LEFT JOIN Invoices i ON b.booking_id = i.booking_id
                LEFT JOIN Payments p ON b.booking_id = p.booking_id
                WHERE b.booking_id = @bookingId AND b.user_id = @userId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const detailsResult = await pool.request()
            .input('bookingId', sql.Int, id)
            .query(`
                SELECT bd.booking_detail_id, s.seat_number, bd.passenger_name, bd.passenger_gender, bd.fare_pkr
                FROM BookingDetails bd
                INNER JOIN Seats s ON bd.seat_id = s.seat_id
                WHERE bd.booking_id = @bookingId
            `);

        res.json({
            booking: result.recordset[0],
            details: detailsResult.recordset
        });
    } catch (error) {
        console.error('Get booking by id error:', error);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancellation_reason } = req.body;

        const pool = await getPool();

        const bookingCheck = await pool.request()
            .input('bookingId', sql.Int, id)
            .input('userId', sql.Int, req.user.userId)
            .query(`
                SELECT b.booking_id, b.status, t.departure_datetime, t.status AS trip_status
                FROM Bookings b
                INNER JOIN Trips t ON b.trip_id = t.trip_id
                WHERE b.booking_id = @bookingId AND b.user_id = @userId
            `);

        if (bookingCheck.recordset.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingCheck.recordset[0];

        if (booking.status !== 'Confirmed') {
            return res.status(400).json({ error: 'This booking is already cancelled' });
        }

        if (new Date(booking.departure_datetime) < new Date() || booking.trip_status === 'Completed') {
            return res.status(400).json({ error: 'Cannot cancel booking for a trip that has already departed' });
        }

        await pool.request()
            .input('bookingId', sql.Int, id)
            .input('reason', sql.VarChar, cancellation_reason || 'Cancelled by user')
            .query(`
                UPDATE Bookings 
                SET status = 'Cancelled', 
                    cancellation_reason = @reason,
                    cancelled_at = GETDATE()
                WHERE booking_id = @bookingId
            `);

        await pool.request()
            .input('bookingId', sql.Int, id)
            .query(`
                UPDATE Payments 
                SET status = 'Refunded'
                WHERE booking_id = @bookingId
            `);

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
};

module.exports = {
    previewBooking,
    confirmBooking,
    getMyBookings,
    getBookingById,
    cancelBooking
};

