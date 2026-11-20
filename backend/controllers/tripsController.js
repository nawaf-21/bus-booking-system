const { getPool, sql } = require('../config/db');

const searchTrips = async (req, res) => {
    try {
        const { from_city_id, to_city_id, travel_date, bus_type, company_id } = req.query;

        if (!from_city_id || !to_city_id) {
            return res.status(400).json({ error: 'From and to cities are required' });
        }

        const pool = await getPool();
        let query = `
            SELECT 
                t.trip_id,
                r.route_id,
                c1.city_name AS from_city,
                c2.city_name AS to_city,
                bc.company_id,
                bc.company_name,
                bus.bus_id,
                bus.bus_name,
                bus.bus_type,
                t.departure_datetime,
                t.arrival_datetime,
                t.fare_pkr,
                t.status AS trip_status,
                bus.total_seats,
                COUNT(DISTINCT bd.seat_id) AS seats_booked,
                (bus.total_seats - COUNT(DISTINCT bd.seat_id)) AS seats_available,
                CASE 
                    WHEN bus.total_seats > 0 
                    THEN CAST((COUNT(DISTINCT bd.seat_id) * 100.0 / bus.total_seats) AS DECIMAL(5,2))
                    ELSE 0 
                END AS occupancy_percentage,
                -- Rating of the bus company (from all its past trips)
                crv.average_rating AS avg_rating,
                crv.total_ratings
            FROM Trips t
            INNER JOIN Routes r ON t.route_id = r.route_id
            INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
            INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
            INNER JOIN Buses bus ON t.bus_id = bus.bus_id
            INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
            LEFT JOIN Bookings b ON t.trip_id = b.trip_id AND b.status = 'Confirmed'
            LEFT JOIN BookingDetails bd ON b.booking_id = bd.booking_id
            LEFT JOIN CompanyRatingView crv ON bc.company_id = crv.company_id
            WHERE r.from_city_id = @from_city_id
                AND r.to_city_id = @to_city_id
                AND t.status = 'Scheduled'
                -- Hide trips on inactive buses or from suspended companies
                AND bus.status = 'Active'
                AND bc.status = 'Active'
        `;

        const request = pool.request()
            .input('from_city_id', sql.Int, from_city_id)
            .input('to_city_id', sql.Int, to_city_id);

        if (travel_date) {
            query += ` AND CAST(t.departure_datetime AS DATE) = @travel_date`;
            request.input('travel_date', sql.Date, travel_date);
        }

        if (bus_type) {
            query += ` AND bus.bus_type = @bus_type`;
            request.input('bus_type', sql.VarChar, bus_type);
        }

        if (company_id) {
            query += ` AND bc.company_id = @company_id`;
            request.input('company_id', sql.Int, company_id);
        }

        query += `
            GROUP BY 
                t.trip_id, r.route_id, c1.city_name, c2.city_name, bc.company_id,
                bc.company_name, bus.bus_id, bus.bus_name, bus.bus_type,
                t.departure_datetime, t.arrival_datetime, t.fare_pkr, t.status, bus.total_seats,
                crv.average_rating, crv.total_ratings
            HAVING (bus.total_seats - COUNT(DISTINCT bd.seat_id)) > 0
                AND t.departure_datetime >= GETDATE()
            ORDER BY t.departure_datetime ASC
        `;

        const result = await request.query(query);

        res.json({ trips: result.recordset });
    } catch (error) {
        console.error('Search trips error:', error);
        res.status(500).json({ error: 'Failed to search trips' });
    }
};

const getTripById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('tripId', sql.Int, id)
            .query(`
                SELECT 
                    t.trip_id,
                    r.route_id,
                    c1.city_name AS from_city,
                    c2.city_name AS to_city,
                    bc.company_id,
                    bc.company_name,
                    bus.bus_id,
                    bus.bus_name,
                    bus.bus_type,
                    t.departure_datetime,
                    t.arrival_datetime,
                    t.fare_pkr,
                    t.status AS trip_status
                FROM Trips t
                INNER JOIN Routes r ON t.route_id = r.route_id
                INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
                INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
                WHERE t.trip_id = @tripId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        res.json({ trip: result.recordset[0] });
    } catch (error) {
        console.error('Get trip by id error:', error);
        res.status(500).json({ error: 'Failed to fetch trip' });
    }
};

const getTripSeats = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Get trip and bus info
        const tripResult = await pool.request()
            .input('tripId', sql.Int, id)
            .query(`
                SELECT t.trip_id, t.bus_id, bus.total_seats
                FROM Trips t
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                WHERE t.trip_id = @tripId
            `);

        if (tripResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        const busId = tripResult.recordset[0].bus_id;

        // Get all seats with booking status
        const seatsResult = await pool.request()
            .input('tripId', sql.Int, id)
            .input('busId', sql.Int, busId)
            .query(`
                SELECT 
                    s.seat_id,
                    s.seat_number,
                    s.seat_row,
                    s.seat_column,
                    s.seat_type,
                    s.seat_gender_default,
                    CASE WHEN booked.seat_id IS NOT NULL THEN 'Booked' ELSE 'Available' END AS seat_status,
                    booked.passenger_gender AS booked_gender
                FROM Seats s
                LEFT JOIN (
                    -- Seats taken on this trip only (other trips on the same bus don't count)
                    SELECT bd.seat_id, bd.passenger_gender
                    FROM BookingDetails bd
                    INNER JOIN Bookings b ON bd.booking_id = b.booking_id
                    WHERE b.trip_id = @tripId AND b.status = 'Confirmed'
                ) booked ON booked.seat_id = s.seat_id
                WHERE s.bus_id = @busId
                ORDER BY s.seat_row, s.seat_column
            `);

        res.json({
            tripId: id,
            busId: busId,
            totalSeats: tripResult.recordset[0].total_seats,
            seats: seatsResult.recordset
        });
    } catch (error) {
        console.error('Get trip seats error:', error);
        res.status(500).json({ error: 'Failed to fetch seats' });
    }
};

// Returns true if this bus already has another Scheduled/InProgress trip
// that overlaps the given times. excludeTripId is used when editing a trip.
const busHasOverlap = async (pool, busId, departure, arrival, excludeTripId) => {
    const result = await pool.request()
        .input('busId', sql.Int, busId)
        .input('departure', sql.DateTime, departure)
        .input('arrival', sql.DateTime, arrival)
        .input('excludeId', sql.Int, excludeTripId || 0)
        .query(`
            SELECT TOP 1 trip_id
            FROM Trips
            WHERE bus_id = @busId
                AND trip_id <> @excludeId
                AND status IN ('Scheduled', 'InProgress')
                AND departure_datetime < @arrival
                AND arrival_datetime > @departure
        `);
    return result.recordset.length > 0;
};

const createTrip = async (req, res) => {
    try {
        const { bus_id, route_id, departure_datetime, arrival_datetime, fare_pkr } = req.body;

        if (!bus_id || !route_id || !departure_datetime || !arrival_datetime || !fare_pkr) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const departure = new Date(departure_datetime);
        const arrival = new Date(arrival_datetime);

        if (isNaN(departure) || isNaN(arrival)) {
            return res.status(400).json({ error: 'Please enter valid dates' });
        }
        if (departure <= new Date()) {
            return res.status(400).json({ error: 'Departure time must be in the future' });
        }
        if (arrival <= departure) {
            return res.status(400).json({ error: 'Arrival time must be after departure time' });
        }
        if (!(Number(fare_pkr) > 0)) {
            return res.status(400).json({ error: 'Fare must be more than zero' });
        }

        const pool = await getPool();

        // The bus must exist and be Active
        const busResult = await pool.request()
            .input('busId', sql.Int, bus_id)
            .query('SELECT bus_id, company_id, status FROM Buses WHERE bus_id = @busId');

        if (busResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Bus not found' });
        }
        const bus = busResult.recordset[0];

        // A bus company can only use its own buses
        if (req.user.role === 'BusCompany' && bus.company_id !== req.user.companyId) {
            return res.status(403).json({ error: 'You can only create trips for your own buses' });
        }
        if (bus.status !== 'Active') {
            return res.status(400).json({ error: 'This bus is not active' });
        }

        if (await busHasOverlap(pool, bus_id, departure, arrival, null)) {
            return res.status(409).json({ error: 'This bus already has a trip at that time' });
        }

        const result = await pool.request()
            .input('bus_id', sql.Int, bus_id)
            .input('route_id', sql.Int, route_id)
            .input('departure_datetime', sql.DateTime, departure)
            .input('arrival_datetime', sql.DateTime, arrival)
            .input('fare_pkr', sql.Decimal(10,2), fare_pkr)
            .query(`
                INSERT INTO Trips (bus_id, route_id, departure_datetime, arrival_datetime, fare_pkr)
                OUTPUT INSERTED.trip_id
                VALUES (@bus_id, @route_id, @departure_datetime, @arrival_datetime, @fare_pkr)
            `);

        res.status(201).json({
            message: 'Trip created successfully',
            tripId: result.recordset[0].trip_id
        });
    } catch (error) {
        console.error('Create trip error:', error);
        res.status(500).json({ error: 'Failed to create trip' });
    }
};

// Only the times, fare and status can be edited. Bus and route stay the same.
const updateTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const { departure_datetime, arrival_datetime, fare_pkr, status } = req.body;

        const pool = await getPool();

        // Load the trip with its bus so we can check ownership and the current times
        const tripResult = await pool.request()
            .input('tripId', sql.Int, id)
            .query(`
                SELECT t.trip_id, t.bus_id, t.departure_datetime, t.arrival_datetime, t.status,
                       bus.company_id
                FROM Trips t
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                WHERE t.trip_id = @tripId
            `);

        if (tripResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        const trip = tripResult.recordset[0];

        if (req.user.role === 'BusCompany' && trip.company_id !== req.user.companyId) {
            return res.status(403).json({ error: 'You can only update trips for your own company' });
        }
        if (trip.status !== 'Scheduled') {
            return res.status(400).json({ error: 'Only scheduled trips can be edited' });
        }

        const updates = [];
        const request = pool.request().input('tripId', sql.Int, id);

        // Work out the new times (keep the old ones if not sent)
        const departure = departure_datetime ? new Date(departure_datetime) : new Date(trip.departure_datetime);
        const arrival = arrival_datetime ? new Date(arrival_datetime) : new Date(trip.arrival_datetime);

        if (isNaN(departure) || isNaN(arrival)) {
            return res.status(400).json({ error: 'Please enter valid dates' });
        }
        if (departure_datetime && departure <= new Date()) {
            return res.status(400).json({ error: 'Departure time must be in the future' });
        }
        if (arrival <= departure) {
            return res.status(400).json({ error: 'Arrival time must be after departure time' });
        }

        if (departure_datetime || arrival_datetime) {
            if (await busHasOverlap(pool, trip.bus_id, departure, arrival, trip.trip_id)) {
                return res.status(409).json({ error: 'This bus already has a trip at that time' });
            }
        }

        if (departure_datetime) {
            updates.push('departure_datetime = @departure_datetime');
            request.input('departure_datetime', sql.DateTime, departure);
        }
        if (arrival_datetime) {
            updates.push('arrival_datetime = @arrival_datetime');
            request.input('arrival_datetime', sql.DateTime, arrival);
        }
        if (fare_pkr !== undefined) {
            if (!(Number(fare_pkr) > 0)) {
                return res.status(400).json({ error: 'Fare must be more than zero' });
            }
            updates.push('fare_pkr = @fare_pkr');
            request.input('fare_pkr', sql.Decimal(10,2), fare_pkr);
        }
        if (status) {
            // Cancelling goes through DELETE /trips/:id so bookings get cancelled too
            if (!['Scheduled', 'InProgress', 'Completed'].includes(status)) {
                return res.status(400).json({ error: 'Invalid trip status' });
            }
            updates.push('status = @status');
            request.input('status', sql.VarChar, status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const query = `UPDATE Trips SET ${updates.join(', ')} WHERE trip_id = @tripId`;
        await request.query(query);

        res.json({ message: 'Trip updated successfully' });
    } catch (error) {
        console.error('Update trip error:', error);
        res.status(500).json({ error: 'Failed to update trip' });
    }
};

// Cancel a trip, cancel its confirmed bookings and refund their payments
const deleteTrip = async (req, res) => {
    let transaction;
    try {
        const { id } = req.params;
        const pool = await getPool();

        const tripResult = await pool.request()
            .input('tripId', sql.Int, id)
            .query(`
                SELECT t.trip_id, t.status, bus.company_id
                FROM Trips t
                INNER JOIN Buses bus ON t.bus_id = bus.bus_id
                WHERE t.trip_id = @tripId
            `);

        if (tripResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        const trip = tripResult.recordset[0];

        if (req.user.role === 'BusCompany' && trip.company_id !== req.user.companyId) {
            return res.status(403).json({ error: 'You can only cancel trips for your own company' });
        }
        if (trip.status !== 'Scheduled') {
            return res.status(400).json({ error: 'Only scheduled trips can be cancelled' });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Refund payments first, while we can still find the Confirmed bookings
        await transaction.request()
            .input('tripId', sql.Int, id)
            .query(`
                UPDATE Payments SET status = 'Refunded'
                WHERE booking_id IN (
                    SELECT booking_id FROM Bookings WHERE trip_id = @tripId AND status = 'Confirmed'
                )
            `);

        await transaction.request()
            .input('tripId', sql.Int, id)
            .query(`
                UPDATE Bookings
                SET status = 'Cancelled',
                    cancellation_reason = 'Trip cancelled by the bus company',
                    cancelled_at = GETDATE()
                WHERE trip_id = @tripId AND status = 'Confirmed'
            `);

        await transaction.request()
            .input('tripId', sql.Int, id)
            .query("UPDATE Trips SET status = 'Cancelled' WHERE trip_id = @tripId");

        await transaction.commit();

        res.json({ message: 'Trip cancelled successfully' });
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch { /* already rolled back */ }
        }
        console.error('Delete trip error:', error);
        res.status(500).json({ error: 'Failed to cancel trip' });
    }
};

module.exports = {
    searchTrips,
    getTripById,
    getTripSeats,
    createTrip,
    updateTrip,
    deleteTrip
};
