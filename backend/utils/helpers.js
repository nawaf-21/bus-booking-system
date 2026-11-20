const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('../config/db');

// Hash a password with bcrypt
const hashPassword = async (password) => {
    if (!password) return null;
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

// Check a password against a bcrypt hash
const comparePassword = async (password, hash) => {
    if (!password || !hash) return false;
    try {
        return await bcrypt.compare(password, hash);
    } catch {
        return false;
    }
};

// Create a login token
const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Turn a list like [1, "2", 3] into whole numbers.
// Returns null if anything in the list is not a positive whole number.
const toIdList = (list) => {
    if (!Array.isArray(list) || list.length === 0) return null;
    const ids = list.map(Number);
    if (ids.some(id => !Number.isInteger(id) || id <= 0)) return null;
    return ids;
};

// Add @id0, @id1, ... inputs to a request and return "@id0, @id1, ..."
// so a list can be used in an IN (...) clause safely.
const addIdInputs = (request, ids, prefix = 'id') => {
    return ids.map((id, i) => {
        request.input(`${prefix}${i}`, sql.Int, id);
        return `@${prefix}${i}`;
    }).join(', ');
};

// Gender rule: a seat cannot be booked next to a seat already taken by a
// passenger of the opposite gender on the same trip.
// "db" can be the connection pool or an open transaction.
const validateGenderSeatRules = async (db, tripId, seatIds, passengerGenders) => {
    const request = db.request();
    request.input('tripId', sql.Int, tripId);
    const seatList = addIdInputs(request, seatIds, 'seat');

    // Booked seats on this trip that sit next to one of the chosen seats
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

    // Seats chosen together in one booking (e.g. a family) are allowed together
    return { valid: true };
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    toIdList,
    addIdInputs,
    validateGenderSeatRules
};
