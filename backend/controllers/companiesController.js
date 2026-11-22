const { getPool, sql } = require('../config/db');

const getAllCompanies = async (req, res) => {
    try {
        const pool = await getPool();

        const isAdmin = req.user && req.user.role === 'Admin';
        const result = await pool.request().query(`
            SELECT bc.company_id, bc.company_name, bc.contact_email, bc.contact_phone,
                   c.city_name AS office_city, bc.logo_url, bc.status, bc.created_at
            FROM BusCompanies bc
            INNER JOIN Cities c ON bc.office_city_id = c.city_id
            ${isAdmin ? '' : "WHERE bc.status = 'Active'"}
            ORDER BY bc.company_name
        `);

        res.json({ companies: result.recordset });
    } catch (error) {
        console.error('Get all companies error:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
};

const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('companyId', sql.Int, id)
            .query(`
                SELECT bc.company_id, bc.company_name, bc.contact_email, bc.contact_phone,
                       c.city_name AS office_city, bc.office_city_id, bc.logo_url, bc.status, bc.created_at
                FROM BusCompanies bc
                INNER JOIN Cities c ON bc.office_city_id = c.city_id
                WHERE bc.company_id = @companyId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json({ company: result.recordset[0] });
    } catch (error) {
        console.error('Get company by id error:', error);
        res.status(500).json({ error: 'Failed to fetch company' });
    }
};

const createCompany = async (req, res) => {
    try {
        const { company_name, contact_email, contact_phone, office_city_id, logo_url } = req.body;

        if (!company_name || !contact_email || !contact_phone || !office_city_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const pool = await getPool();

        const companyResult = await pool.request()
            .input('company_name', sql.VarChar, company_name)
            .input('contact_email', sql.VarChar, contact_email)
            .input('contact_phone', sql.VarChar, contact_phone)
            .input('office_city_id', sql.Int, office_city_id)
            .input('logo_url', sql.VarChar, logo_url && logo_url.trim() !== '' ? logo_url : null)
            .query(`
                INSERT INTO BusCompanies (company_name, contact_email, contact_phone, office_city_id, logo_url)
                OUTPUT INSERTED.company_id, INSERTED.company_name, INSERTED.contact_email, INSERTED.contact_phone
                VALUES (@company_name, @contact_email, @contact_phone, @office_city_id, @logo_url)
            `);

        res.status(201).json({
            message: 'Company created successfully',
            company: companyResult.recordset[0]
        });
    } catch (error) {
        console.error('Create company error:', error);
        if (error.number === 2627 || error.number === 2601) {
            return res.status(400).json({ error: 'A company with this name already exists' });
        }
        res.status(500).json({ error: 'Failed to create company' });
    }
};

const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { company_name, contact_email, contact_phone, office_city_id, logo_url, status } = req.body;

        const pool = await getPool();
        const updates = [];
        const request = pool.request().input('companyId', sql.Int, id);

        if (company_name) {
            updates.push('company_name = @company_name');
            request.input('company_name', sql.VarChar, company_name);
        }
        if (contact_email) {
            updates.push('contact_email = @contact_email');
            request.input('contact_email', sql.VarChar, contact_email);
        }
        if (contact_phone) {
            updates.push('contact_phone = @contact_phone');
            request.input('contact_phone', sql.VarChar, contact_phone);
        }
        if (office_city_id) {
            updates.push('office_city_id = @office_city_id');
            request.input('office_city_id', sql.Int, office_city_id);
        }
        if (logo_url !== undefined) {
            updates.push('logo_url = @logo_url');
            request.input('logo_url', sql.VarChar, logo_url);
        }
        if (status) {
            if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
                return res.status(400).json({ error: 'Invalid company status' });
            }
            updates.push('status = @status');
            request.input('status', sql.VarChar, status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const query = `UPDATE BusCompanies SET ${updates.join(', ')} WHERE company_id = @companyId`;
        const result = await request.query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json({ message: 'Company updated successfully' });
    } catch (error) {
        console.error('Update company error:', error);
        if (error.number === 2627 || error.number === 2601) {
            return res.status(400).json({ error: 'A company with this name already exists' });
        }
        res.status(500).json({ error: 'Failed to update company' });
    }
};

const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { hardDelete } = req.query;
        const pool = await getPool();

        if (hardDelete === 'true' && req.user.role === 'Admin') {
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                const busesResult = await new sql.Request(transaction)
                    .input('companyId', sql.Int, id)
                    .query('SELECT bus_id FROM Buses WHERE company_id = @companyId');

                for (const bus of busesResult.recordset) {
                    await new sql.Request(transaction)
                        .input('busId', sql.Int, bus.bus_id)
                        .query('DELETE FROM Seats WHERE bus_id = @busId');
                }

                await new sql.Request(transaction)
                    .input('companyId', sql.Int, id)
                    .query('DELETE FROM Buses WHERE company_id = @companyId');

                await new sql.Request(transaction)
                    .input('companyId', sql.Int, id)
                    .query('DELETE FROM BusCompanies WHERE company_id = @companyId');

                await transaction.commit();
                res.json({ message: 'Company and all associated buses/seats deleted successfully' });
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } else {
            await pool.request()
                .input('companyId', sql.Int, id)
                .query("UPDATE BusCompanies SET status = 'Suspended' WHERE company_id = @companyId");
            res.json({ message: 'Company suspended successfully' });
        }
    } catch (error) {
        console.error('Delete company error:', error);
        // 547 = fk error, company still has linked rows
        if (error.number === 547) {
            return res.status(409).json({ error: 'This company still has trips or users. Suspend it instead of deleting it.' });
        }
        res.status(500).json({ error: 'Failed to delete company' });
    }
};

module.exports = {
    getAllCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany
};

