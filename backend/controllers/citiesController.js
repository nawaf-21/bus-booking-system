const { getPool, sql } = require('../config/db');

const getAllCities = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT city_id, city_name, province
            FROM Cities
            ORDER BY city_name
        `);

        res.json({ cities: result.recordset });
    } catch (error) {
        console.error('Get all cities error:', error);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
};

module.exports = {
    getAllCities
};

