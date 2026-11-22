const { getPool, sql } = require('../config/db');

const isBlank = (value) => value === undefined || value === null || value === '';

const checkDistanceAndDuration = (distance_km, approx_duration_min) => {
    if (!isBlank(distance_km) && !(Number(distance_km) >= 0)) {
        return 'Distance cannot be negative';
    }
    if (!isBlank(approx_duration_min) && !(Number.isInteger(Number(approx_duration_min)) && Number(approx_duration_min) >= 0)) {
        return 'Duration must be a whole number of minutes (0 or more)';
    }
    return null;
};

const getAllRoutes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT r.route_id, 
                   c1.city_name AS from_city, c1.city_id AS from_city_id,
                   c2.city_name AS to_city, c2.city_id AS to_city_id,
                   r.distance_km, r.approx_duration_min, r.base_fare_pkr
            FROM Routes r
            INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
            INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
            ORDER BY c1.city_name, c2.city_name
        `);

        res.json({ routes: result.recordset });
    } catch (error) {
        console.error('Get all routes error:', error);
        res.status(500).json({ error: 'Failed to fetch routes' });
    }
};

const getRouteById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('routeId', sql.Int, id)
            .query(`
                SELECT r.route_id,
                       c1.city_name AS from_city, c1.city_id AS from_city_id,
                       c2.city_name AS to_city, c2.city_id AS to_city_id,
                       r.distance_km, r.approx_duration_min, r.base_fare_pkr
                FROM Routes r
                INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
                INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
                WHERE r.route_id = @routeId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Route not found' });
        }

        res.json({ route: result.recordset[0] });
    } catch (error) {
        console.error('Get route by id error:', error);
        res.status(500).json({ error: 'Failed to fetch route' });
    }
};

const createRoute = async (req, res) => {
    try {
        const { from_city_id, to_city_id, distance_km, approx_duration_min, base_fare_pkr } = req.body;

        if (!from_city_id || !to_city_id) {
            return res.status(400).json({ error: 'Please choose the from and to cities' });
        }

        if (Number(from_city_id) === Number(to_city_id)) {
            return res.status(400).json({ error: 'From and to cities must be different' });
        }

        if (!(Number(base_fare_pkr) > 0)) {
            return res.status(400).json({ error: 'Base fare must be more than zero' });
        }

        const error = checkDistanceAndDuration(distance_km, approx_duration_min);
        if (error) {
            return res.status(400).json({ error });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('from_city_id', sql.Int, from_city_id)
            .input('to_city_id', sql.Int, to_city_id)
            .input('distance_km', sql.Decimal(10,2), isBlank(distance_km) ? null : distance_km)
            .input('approx_duration_min', sql.Int, isBlank(approx_duration_min) ? null : approx_duration_min)
            .input('base_fare_pkr', sql.Decimal(10,2), base_fare_pkr)
            .query(`
                INSERT INTO Routes (from_city_id, to_city_id, distance_km, approx_duration_min, base_fare_pkr)
                OUTPUT INSERTED.route_id
                VALUES (@from_city_id, @to_city_id, @distance_km, @approx_duration_min, @base_fare_pkr)
            `);

        res.status(201).json({
            message: 'Route created successfully',
            routeId: result.recordset[0].route_id
        });
    } catch (error) {
        console.error('Create route error:', error);
        // 2627/2601 = route already exists
        if (error.number === 2627 || error.number === 2601) {
            return res.status(400).json({ error: 'This route already exists' });
        }
        res.status(500).json({ error: 'Failed to create route' });
    }
};

const updateRoute = async (req, res) => {
    try {
        const { id } = req.params;
        const { distance_km, approx_duration_min, base_fare_pkr } = req.body;

        if (base_fare_pkr !== undefined && !(Number(base_fare_pkr) > 0)) {
            return res.status(400).json({ error: 'Base fare must be more than zero' });
        }

        const error = checkDistanceAndDuration(distance_km, approx_duration_min);
        if (error) {
            return res.status(400).json({ error });
        }

        const pool = await getPool();
        const updates = [];
        const request = pool.request().input('routeId', sql.Int, id);

        if (distance_km !== undefined) {
            updates.push('distance_km = @distance_km');
            request.input('distance_km', sql.Decimal(10,2), isBlank(distance_km) ? null : distance_km);
        }
        if (approx_duration_min !== undefined) {
            updates.push('approx_duration_min = @approx_duration_min');
            request.input('approx_duration_min', sql.Int, isBlank(approx_duration_min) ? null : approx_duration_min);
        }
        if (base_fare_pkr !== undefined) {
            updates.push('base_fare_pkr = @base_fare_pkr');
            request.input('base_fare_pkr', sql.Decimal(10,2), base_fare_pkr);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const query = `UPDATE Routes SET ${updates.join(', ')} WHERE route_id = @routeId`;
        await request.query(query);

        res.json({ message: 'Route updated successfully' });
    } catch (error) {
        console.error('Update route error:', error);
        res.status(500).json({ error: 'Failed to update route' });
    }
};

const getCompanyRoutes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT r.route_id, 
                   c1.city_name AS from_city, c1.city_id AS from_city_id,
                   c2.city_name AS to_city, c2.city_id AS to_city_id,
                   r.distance_km, r.approx_duration_min, r.base_fare_pkr
            FROM Routes r
            INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
            INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
            ORDER BY c1.city_name, c2.city_name
        `);

        res.json({ routes: result.recordset });
    } catch (error) {
        console.error('Get company routes error:', error);
        res.status(500).json({ error: 'Failed to fetch routes' });
    }
};

module.exports = {
    getAllRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    getCompanyRoutes
};

