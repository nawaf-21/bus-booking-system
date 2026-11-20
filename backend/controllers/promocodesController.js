const { getPool, sql } = require('../config/db');

const validatePromoCode = async (req, res) => {
    try {
        const { code, route_id, company_id } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Promo code is required' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('code', sql.VarChar, String(code).trim().toUpperCase())
            .input('routeId', sql.Int, route_id || null)
            .input('companyId', sql.Int, company_id || null)
            .input('now', sql.DateTime, new Date())
            .query(`
                SELECT promo_id, code, description, discount_type, discount_value,
                       applicable_route_id, applicable_company_id, max_uses, used_count
                FROM PromoCodes
                WHERE code = @code 
                    AND is_active = 1
                    AND valid_from <= @now
                    AND valid_to >= @now
                    AND (max_uses IS NULL OR used_count < max_uses)
                    AND (applicable_route_id IS NULL OR applicable_route_id = @routeId)
                    AND (applicable_company_id IS NULL OR applicable_company_id = @companyId OR @companyId IS NULL)
            `);

        if (result.recordset.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired promo code' });
        }

        res.json({ promo: result.recordset[0] });
    } catch (error) {
        console.error('Validate promo code error:', error);
        res.status(500).json({ error: 'Failed to validate promo code' });
    }
};

const getAllPromoCodes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT pc.promo_id, pc.code, pc.description, pc.discount_type, pc.discount_value,
                   pc.valid_from, pc.valid_to, pc.max_uses, pc.used_count, pc.is_active,
                   r.route_id, c1.city_name + N' → ' + c2.city_name AS route_name,
                   bc.company_id, bc.company_name
            FROM PromoCodes pc
            LEFT JOIN Routes r ON pc.applicable_route_id = r.route_id
            LEFT JOIN Cities c1 ON r.from_city_id = c1.city_id
            LEFT JOIN Cities c2 ON r.to_city_id = c2.city_id
            LEFT JOIN BusCompanies bc ON pc.applicable_company_id = bc.company_id
            ORDER BY pc.created_at DESC
        `);

        res.json({ promoCodes: result.recordset });
    } catch (error) {
        console.error('Get all promo codes error:', error);
        res.status(500).json({ error: 'Failed to fetch promo codes' });
    }
};

const createPromoCode = async (req, res) => {
    try {
        const { code, description, discount_type, discount_value, valid_from, valid_to, max_uses, applicable_route_id, applicable_company_id } = req.body;

        if (!code || !discount_type || !discount_value || !valid_from || !valid_to) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('code', sql.VarChar, code)
            .input('description', sql.VarChar, description)
            .input('discount_type', sql.VarChar, discount_type)
            .input('discount_value', sql.Decimal(10,2), discount_value)
            .input('valid_from', sql.DateTime, valid_from)
            .input('valid_to', sql.DateTime, valid_to)
            .input('max_uses', sql.Int, max_uses)
            .input('applicable_route_id', sql.Int, applicable_route_id)
            .input('applicable_company_id', sql.Int, applicable_company_id)
            .query(`
                INSERT INTO PromoCodes (code, description, discount_type, discount_value, valid_from, valid_to, max_uses, applicable_route_id, applicable_company_id)
                OUTPUT INSERTED.promo_id
                VALUES (@code, @description, @discount_type, @discount_value, @valid_from, @valid_to, @max_uses, @applicable_route_id, @applicable_company_id)
            `);

        res.status(201).json({
            message: 'Promo code created successfully',
            promoId: result.recordset[0].promo_id
        });
    } catch (error) {
        console.error('Create promo code error:', error);
        res.status(500).json({ error: 'Failed to create promo code' });
    }
};

const updatePromoCode = async (req, res) => {
    try {
        const { id } = req.params;
        const { description, discount_value, valid_from, valid_to, max_uses, is_active } = req.body;

        const pool = await getPool();
        const updates = [];
        const request = pool.request().input('promoId', sql.Int, id);

        if (description !== undefined) {
            updates.push('description = @description');
            request.input('description', sql.VarChar, description);
        }
        if (discount_value !== undefined) {
            updates.push('discount_value = @discount_value');
            request.input('discount_value', sql.Decimal(10,2), discount_value);
        }
        if (valid_from) {
            updates.push('valid_from = @valid_from');
            request.input('valid_from', sql.DateTime, valid_from);
        }
        if (valid_to) {
            updates.push('valid_to = @valid_to');
            request.input('valid_to', sql.DateTime, valid_to);
        }
        if (max_uses !== undefined) {
            updates.push('max_uses = @max_uses');
            request.input('max_uses', sql.Int, max_uses);
        }
        if (is_active !== undefined) {
            updates.push('is_active = @is_active');
            request.input('is_active', sql.Bit, is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const query = `UPDATE PromoCodes SET ${updates.join(', ')} WHERE promo_id = @promoId`;
        await request.query(query);

        res.json({ message: 'Promo code updated successfully' });
    } catch (error) {
        console.error('Update promo code error:', error);
        res.status(500).json({ error: 'Failed to update promo code' });
    }
};

const deletePromoCode = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        await pool.request()
            .input('promoId', sql.Int, id)
            .query('UPDATE PromoCodes SET is_active = 0 WHERE promo_id = @promoId');

        res.json({ message: 'Promo code deactivated successfully' });
    } catch (error) {
        console.error('Delete promo code error:', error);
        res.status(500).json({ error: 'Failed to delete promo code' });
    }
};

module.exports = {
    validatePromoCode,
    getAllPromoCodes,
    createPromoCode,
    updatePromoCode,
    deletePromoCode
};

