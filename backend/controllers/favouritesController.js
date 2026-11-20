const { getPool, sql } = require('../config/db');

const getFavouriteRoutes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .query(`
                SELECT fr.fav_id, fr.route_id, fr.preferred_company_id,
                       r.from_city_id, r.to_city_id,
                       c1.city_name + N' → ' + c2.city_name AS route_name,
                       bc.company_name AS preferred_company_name,
                       r.base_fare_pkr, fr.created_at
                FROM FavouriteRoutes fr
                INNER JOIN Routes r ON fr.route_id = r.route_id
                INNER JOIN Cities c1 ON r.from_city_id = c1.city_id
                INNER JOIN Cities c2 ON r.to_city_id = c2.city_id
                LEFT JOIN BusCompanies bc ON fr.preferred_company_id = bc.company_id
                WHERE fr.user_id = @userId
                ORDER BY fr.created_at DESC
            `);

        res.json({ favouriteRoutes: result.recordset });
    } catch (error) {
        console.error('Get favourite routes error:', error);
        res.status(500).json({ error: 'Failed to fetch favourite routes' });
    }
};

const addFavouriteRoute = async (req, res) => {
    try {
        const { route_id, preferred_company_id } = req.body;

        if (!route_id) {
            return res.status(400).json({ error: 'Route ID is required' });
        }

        const pool = await getPool();

        // Check if already exists
        const existing = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .input('routeId', sql.Int, route_id)
            .input('companyId', sql.Int, preferred_company_id)
            .query(`
                SELECT fav_id FROM FavouriteRoutes 
                WHERE user_id = @userId AND route_id = @routeId 
                    AND (preferred_company_id = @companyId OR (preferred_company_id IS NULL AND @companyId IS NULL))
            `);

        if (existing.recordset.length > 0) {
            return res.status(400).json({ error: 'Route is already in favourites' });
        }

        const result = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .input('routeId', sql.Int, route_id)
            .input('companyId', sql.Int, preferred_company_id)
            .query(`
                INSERT INTO FavouriteRoutes (user_id, route_id, preferred_company_id)
                OUTPUT INSERTED.fav_id
                VALUES (@userId, @routeId, @companyId)
            `);

        res.status(201).json({
            message: 'Route added to favourites',
            favId: result.recordset[0].fav_id
        });
    } catch (error) {
        console.error('Add favourite route error:', error);
        res.status(500).json({ error: 'Failed to add favourite route' });
    }
};

const removeFavouriteRoute = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        await pool.request()
            .input('favId', sql.Int, id)
            .input('userId', sql.Int, req.user.userId)
            .query('DELETE FROM FavouriteRoutes WHERE fav_id = @favId AND user_id = @userId');

        res.json({ message: 'Route removed from favourites' });
    } catch (error) {
        console.error('Remove favourite route error:', error);
        res.status(500).json({ error: 'Failed to remove favourite route' });
    }
};

module.exports = {
    getFavouriteRoutes,
    addFavouriteRoute,
    removeFavouriteRoute
};

