const { getPool, sql } = require('../config/db');

const getAllBuses = async (req, res) => {
    try {
        const { company_id, status } = req.query;
        const pool = await getPool();

        let query = `
            SELECT bus.bus_id, bus.company_id, bc.company_name, bus.bus_model, bus.bus_name,
                   bus.bus_type, bus.total_seats, bus.status, bus.created_at
            FROM Buses bus
            INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
            WHERE 1=1
        `;

        const request = pool.request();

        if (company_id) {
            query += ` AND bus.company_id = @company_id`;
            request.input('company_id', sql.Int, company_id);
        }

        if (status) {
            query += ` AND bus.status = @status`;
            request.input('status', sql.VarChar, status);
        }

        query += ` ORDER BY bc.company_name, bus.bus_name`;

        const result = await request.query(query);

        res.json({ buses: result.recordset });
    } catch (error) {
        console.error('Get all buses error:', error);
        res.status(500).json({ error: 'Failed to fetch buses' });
    }
};

const getBusById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('busId', sql.Int, id)
            .query(`
                SELECT bus.bus_id, bus.company_id, bc.company_name, bus.bus_model, bus.bus_name,
                       bus.bus_type, bus.total_seats, bus.status, bus.created_at
                FROM Buses bus
                INNER JOIN BusCompanies bc ON bus.company_id = bc.company_id
                WHERE bus.bus_id = @busId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Bus not found' });
        }

        res.json({ bus: result.recordset[0] });
    } catch (error) {
        console.error('Get bus by id error:', error);
        res.status(500).json({ error: 'Failed to fetch bus' });
    }
};

const BUS_TYPES = ['AC', 'Non-AC', 'Sleeper', 'Seater'];
const BUS_STATUSES = ['Active', 'Maintenance', 'Inactive'];

// total_seats must be a whole number from 1 to 60
const isValidSeatCount = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= 60;
};

// Create the seats of a bus, same layout as the seed data in the schema:
// 4 seats per row (A1 A2 | A3 A4), columns 1 and 4 are windows.
// Then link the seats that sit side by side (1-2 and 3-4) for the gender rule.
// "transaction" must be an open transaction.
const createSeatsForBus = async (transaction, busId, totalSeats) => {
    for (let i = 1; i <= totalSeats; i++) {
        const row = Math.floor((i - 1) / 4) + 1;
        const col = (i - 1) % 4 + 1;
        const seatNumber = String.fromCharCode(64 + row) + col;
        const seatType = (col === 1 || col === 4) ? 'Window' : 'Aisle';

        await transaction.request()
            .input('busId', sql.Int, busId)
            .input('seatNumber', sql.VarChar, seatNumber)
            .input('row', sql.Int, row)
            .input('col', sql.Int, col)
            .input('seatType', sql.VarChar, seatType)
            .query(`
                INSERT INTO Seats (bus_id, seat_number, seat_row, seat_column, seat_type, seat_gender_default)
                VALUES (@busId, @seatNumber, @row, @col, @seatType, 'Neutral')
            `);
    }

    // Same query as the seed: one row per pair, col 1 -> col 2 and col 3 -> col 4
    await transaction.request()
        .input('busId', sql.Int, busId)
        .query(`
            INSERT INTO SeatAdjacency (seat_id, adjacent_seat_id)
            SELECT s1.seat_id, s2.seat_id
            FROM Seats s1
            JOIN Seats s2 ON s1.bus_id = s2.bus_id
                AND s1.seat_row = s2.seat_row
                AND ((s1.seat_column = 1 AND s2.seat_column = 2) OR (s1.seat_column = 3 AND s2.seat_column = 4))
            WHERE s1.bus_id = @busId
        `);
};

const createBus = async (req, res) => {
    let transaction;
    try {
        const { company_id, bus_model, bus_name, bus_type, total_seats } = req.body;

        if (!company_id || !bus_type || !total_seats) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!BUS_TYPES.includes(bus_type)) {
            return res.status(400).json({ error: 'Invalid bus type' });
        }
        if (!isValidSeatCount(total_seats)) {
            return res.status(400).json({ error: 'Total seats must be a whole number from 1 to 60' });
        }

        // Check if user is BusCompany, verify company_id matches
        if (req.user.role === 'BusCompany' && req.user.companyId !== Number(company_id)) {
            return res.status(403).json({ error: 'You can only create buses for your own company' });
        }

        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const result = await transaction.request()
            .input('company_id', sql.Int, company_id)
            .input('bus_model', sql.VarChar, bus_model)
            .input('bus_name', sql.VarChar, bus_name)
            .input('bus_type', sql.VarChar, bus_type)
            .input('total_seats', sql.Int, Number(total_seats))
            .query(`
                INSERT INTO Buses (company_id, bus_model, bus_name, bus_type, total_seats)
                OUTPUT INSERTED.bus_id
                VALUES (@company_id, @bus_model, @bus_name, @bus_type, @total_seats)
            `);

        const busId = result.recordset[0].bus_id;
        await createSeatsForBus(transaction, busId, Number(total_seats));

        await transaction.commit();

        res.status(201).json({
            message: 'Bus created successfully',
            busId: busId
        });
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch { /* already rolled back */ }
        }
        console.error('Create bus error:', error);
        res.status(500).json({ error: 'Failed to create bus' });
    }
};

const updateBus = async (req, res) => {
    let transaction;
    try {
        const { id } = req.params;
        const { bus_model, bus_name, bus_type, total_seats, status } = req.body;

        const pool = await getPool();

        const busResult = await pool.request()
            .input('busId', sql.Int, id)
            .query('SELECT bus_id, company_id, total_seats FROM Buses WHERE bus_id = @busId');

        if (busResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Bus not found' });
        }
        const bus = busResult.recordset[0];

        // Check if user is BusCompany, verify bus belongs to their company
        if (req.user.role === 'BusCompany' && bus.company_id !== req.user.companyId) {
            return res.status(403).json({ error: 'You can only update buses for your own company' });
        }

        if (bus_type && !BUS_TYPES.includes(bus_type)) {
            return res.status(400).json({ error: 'Invalid bus type' });
        }
        if (status && !BUS_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Invalid bus status' });
        }

        // Changing the seat count means the seats have to be made again
        const seatsChanged = total_seats !== undefined && total_seats !== ''
            && Number(total_seats) !== bus.total_seats;

        if (seatsChanged) {
            if (!isValidSeatCount(total_seats)) {
                return res.status(400).json({ error: 'Total seats must be a whole number from 1 to 60' });
            }

            const tripCheck = await pool.request()
                .input('busId', sql.Int, id)
                .query('SELECT TOP 1 trip_id FROM Trips WHERE bus_id = @busId');

            if (tripCheck.recordset.length > 0) {
                return res.status(400).json({ error: 'You cannot change the number of seats of a bus that already has trips. Add a new bus instead.' });
            }
        }

        // Update the bus (and rebuild its seats if needed), all or nothing
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const updates = [];
        const request = transaction.request().input('busId', sql.Int, id);

        if (bus_model) {
            updates.push('bus_model = @bus_model');
            request.input('bus_model', sql.VarChar, bus_model);
        }
        if (bus_name) {
            updates.push('bus_name = @bus_name');
            request.input('bus_name', sql.VarChar, bus_name);
        }
        if (bus_type) {
            updates.push('bus_type = @bus_type');
            request.input('bus_type', sql.VarChar, bus_type);
        }
        if (status) {
            updates.push('status = @status');
            request.input('status', sql.VarChar, status);
        }
        if (seatsChanged) {
            updates.push('total_seats = @total_seats');
            request.input('total_seats', sql.Int, Number(total_seats));
        }

        if (updates.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'No fields to update' });
        }

        await request.query(`UPDATE Buses SET ${updates.join(', ')} WHERE bus_id = @busId`);

        if (seatsChanged) {
            // Adjacency rows point at the seats, so delete them first
            await transaction.request()
                .input('busId', sql.Int, id)
                .query(`
                    DELETE FROM SeatAdjacency
                    WHERE seat_id IN (SELECT seat_id FROM Seats WHERE bus_id = @busId)
                       OR adjacent_seat_id IN (SELECT seat_id FROM Seats WHERE bus_id = @busId)
                `);
            await transaction.request()
                .input('busId', sql.Int, id)
                .query('DELETE FROM Seats WHERE bus_id = @busId');

            await createSeatsForBus(transaction, Number(id), Number(total_seats));
        }

        await transaction.commit();
        res.json({ message: 'Bus updated successfully' });
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch { /* already rolled back */ }
        }
        console.error('Update bus error:', error);
        res.status(500).json({ error: 'Failed to update bus' });
    }
};

const deleteBus = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Check if user is BusCompany, verify bus belongs to their company
        if (req.user.role === 'BusCompany') {
            const busCheck = await pool.request()
                .input('busId', sql.Int, id)
                .input('companyId', sql.Int, req.user.companyId)
                .query('SELECT bus_id FROM Buses WHERE bus_id = @busId AND company_id = @companyId');

            if (busCheck.recordset.length === 0) {
                return res.status(403).json({ error: 'You can only delete buses for your own company' });
            }
        }

        // Soft delete
        await pool.request()
            .input('busId', sql.Int, id)
            .query("UPDATE Buses SET status = 'Inactive' WHERE bus_id = @busId");

        res.json({ message: 'Bus deactivated successfully' });
    } catch (error) {
        console.error('Delete bus error:', error);
        res.status(500).json({ error: 'Failed to delete bus' });
    }
};

const getCompanyBuses = async (req, res) => {
    try {
        const pool = await getPool();
        const companyId = req.user.companyId;

        const result = await pool.request()
            .input('companyId', sql.Int, companyId)
            .query(`
                SELECT bus.bus_id, bus.company_id, bus.bus_model, bus.bus_name,
                       bus.bus_type, bus.total_seats, bus.status, bus.created_at
                FROM Buses bus
                WHERE bus.company_id = @companyId
                ORDER BY bus.bus_name
            `);

        res.json({ buses: result.recordset });
    } catch (error) {
        console.error('Get company buses error:', error);
        res.status(500).json({ error: 'Failed to fetch buses' });
    }
};

module.exports = {
    getAllBuses,
    getBusById,
    createBus,
    updateBus,
    deleteBus,
    getCompanyBuses
};

