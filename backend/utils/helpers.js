const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('../config/db');

const hashPassword = async (password) => {
    if (!password) return null;
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
    if (!password || !hash) return false;
    try {
        return await bcrypt.compare(password, hash);
    } catch {
        return false;
    }
};

const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

const toIdList = (list) => {
    if (!Array.isArray(list) || list.length === 0) return null;
    const ids = list.map(Number);
    if (ids.some(id => !Number.isInteger(id) || id <= 0)) return null;
    return ids;
};

// builds @id0, @id1... for a safe IN (...)
const addIdInputs = (request, ids, prefix = 'id') => {
    return ids.map((id, i) => {
        request.input(`${prefix}${i}`, sql.Int, id);
        return `@${prefix}${i}`;
    }).join(', ');
};

// gender rule: no seat next to opposite gender on same trip
const validateGenderSeatRules = async (db, tripId, seatIds, passengerGenders) => {
    const request = db.request();
    request.input('tripId', sql.Int, tripId);
    const seatList = addIdInputs(request, seatIds, 'seat');

    const result = await request.query(`
        SELECT sa.seat_id AS chosen_seat_id, sa.adjacent_seat_id, s.seat_number, bd.passenger_gender
        FROM (
            SELECT seat_id, adjacent_seat_id FROM SeatAdjacency
            UNION
            SELECT adjacent_seat_id, seat_id FROM SeatAdjacency
        ) sa
        INNER JOIN Seats s ON s.seat_id = sa.adjacent_seat_id
        INNER JOIN BookingDetails bd ON bd.seat_id = sa.adjacent_seat_id
        INNER JOIN Bookings b ON b.booking_id = bd.booking_id
        WHERE sa.seat_id IN (${seatList})
            AND b.trip_id = @tripId
            AND b.status = 'Confirmed'
    `);

    for (const row of result.recordset) {
        const gender = passengerGenders[seatIds.indexOf(row.chosen_seat_id)];
        if (gender === 'Neutral' || row.passenger_gender === 'Neutral') continue;
        if (gender !== row.passenger_gender) {
            return {
                valid: false,
                error: `This seat is next to seat ${row.seat_number}, which is booked by a ${row.passenger_gender.toLowerCase()} passenger. Please choose another seat.`
            };
        }
    }

    // seats in the same booking (family) are fine together
    return { valid: true };
};

const checkPassword = (password) => {
    const value = String(password || '');
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (value.length > 64) return 'Password must be 64 characters or fewer';
    if (!/[A-Za-z]/.test(value)) return 'Password must contain at least one letter';
    if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
    return null;
};

module.exports = {
    checkPassword,
    hashPassword,
    comparePassword,
    generateToken,
    toIdList,
    addIdInputs,
    validateGenderSeatRules
};
