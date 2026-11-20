const { getPool, sql } = require('../config/db');
const { hashPassword } = require('../utils/helpers');

const ROLES = ['Passenger', 'Admin', 'BusCompany'];
const GENDERS = ['Male', 'Female'];

const getAllUsers = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT u.user_id, u.full_name, u.email, u.gender, u.phone_no, u.role,
                   u.company_id, bc.company_name, u.created_at, u.is_active
            FROM Users u
            LEFT JOIN BusCompanies bc ON u.company_id = bc.company_id
            ORDER BY u.created_at DESC
        `);

        res.json({ users: result.recordset });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const getUserById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Users can only see their own profile; the admin can see everyone
        if (req.user.role !== 'Admin' && req.user.userId !== id) {
            return res.status(403).json({ error: 'You can only view your own profile' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.Int, id)
            .query(`
                SELECT u.user_id, u.full_name, u.email, u.gender, u.phone_no, u.role,
                       u.company_id, bc.company_name, u.created_at, u.is_active
                FROM Users u
                LEFT JOIN BusCompanies bc ON u.company_id = bc.company_id
                WHERE u.user_id = @userId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.recordset[0] });
    } catch (error) {
        console.error('Get user by id error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

// Admin creates any kind of account (this is how bus company logins are made)
const createUser = async (req, res) => {
    try {
        const { full_name, email, password, gender, phone_no, role, company_id } = req.body;

        if (!full_name || !email || !password || !phone_no || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!ROLES.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        if (role === 'Passenger' && !GENDERS.includes(gender)) {
            return res.status(400).json({ error: 'Gender is required for passengers' });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const companyId = role === 'BusCompany' ? Number(company_id) : null;
        if (role === 'BusCompany' && !Number.isInteger(companyId)) {
            return res.status(400).json({ error: 'Please choose a company for this bus company user' });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const pool = await getPool();

        const emailCheck = await pool.request()
            .input('email', sql.VarChar, cleanEmail)
            .query('SELECT user_id FROM Users WHERE LOWER(email) = @email');

        if (emailCheck.recordset.length > 0) {
            return res.status(400).json({ error: 'This email is already registered' });
        }

        const passwordHash = await hashPassword(String(password));

        const result = await pool.request()
            .input('full_name', sql.VarChar, String(full_name).trim())
            .input('email', sql.VarChar, cleanEmail)
            .input('password_hash', sql.VarChar, passwordHash)
            .input('gender', sql.VarChar, role === 'Passenger' ? gender : null)
            .input('phone_no', sql.VarChar, String(phone_no).trim())
            .input('role', sql.VarChar, role)
            .input('company_id', sql.Int, companyId)
            .query(`
                INSERT INTO Users (full_name, email, password_hash, gender, phone_no, role, company_id)
                OUTPUT INSERTED.user_id, INSERTED.full_name, INSERTED.email, INSERTED.role
                VALUES (@full_name, @email, @password_hash, @gender, @phone_no, @role, @company_id)
            `);

        res.status(201).json({
            message: 'User created successfully',
            user: result.recordset[0]
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

const updateUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { full_name, phone_no, gender, role, company_id, is_active } = req.body;
        const isAdmin = req.user.role === 'Admin';

        if (!isAdmin && req.user.userId !== id) {
            return res.status(403).json({ error: 'You can only update your own profile' });
        }

        const pool = await getPool();
        const updates = [];
        const request = pool.request().input('userId', sql.Int, id);

        if (full_name) {
            updates.push('full_name = @full_name');
            request.input('full_name', sql.VarChar, full_name);
        }
        if (phone_no) {
            updates.push('phone_no = @phone_no');
            request.input('phone_no', sql.VarChar, phone_no);
        }
        if (gender !== undefined) {
            if (gender !== null && gender !== '' && !GENDERS.includes(gender)) {
                return res.status(400).json({ error: 'Invalid gender' });
            }
            updates.push('gender = @gender');
            request.input('gender', sql.VarChar, gender || null);
        }
        if (isAdmin && role) {
            if (!ROLES.includes(role)) {
                return res.status(400).json({ error: 'Invalid role' });
            }
            if (id === req.user.userId && role !== 'Admin') {
                return res.status(400).json({ error: 'You cannot remove your own admin role' });
            }
            updates.push('role = @role');
            request.input('role', sql.VarChar, role);
        }
        if (isAdmin && (role || company_id !== undefined)) {
            // Work out the final role and company after this update
            const current = await pool.request()
                .input('userId', sql.Int, id)
                .query('SELECT role, company_id FROM Users WHERE user_id = @userId');

            if (current.recordset.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const finalRole = role || current.recordset[0].role;
            let finalCompanyId = company_id !== undefined
                ? (company_id ? Number(company_id) : null)
                : current.recordset[0].company_id;

            // Only bus company users belong to a company
            if (finalRole !== 'BusCompany') {
                finalCompanyId = null;
            } else if (!Number.isInteger(finalCompanyId)) {
                return res.status(400).json({ error: 'Please choose a company for this bus company user' });
            }

            updates.push('company_id = @company_id');
            request.input('company_id', sql.Int, finalCompanyId);
        }
        if (isAdmin && is_active !== undefined) {
            if (id === req.user.userId && !is_active) {
                return res.status(400).json({ error: 'You cannot deactivate your own account' });
            }
            updates.push('is_active = @is_active');
            request.input('is_active', sql.Bit, is_active ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // "updates" only ever holds the fixed column names above, never user text
        await request.query(`UPDATE Users SET ${updates.join(', ')} WHERE user_id = @userId`);

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

const deleteUser = async (req, res) => {
    const id = Number(req.params.id);

    if (id === req.user.userId) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    let transaction;
    try {
        const pool = await getPool();

        // Without ?hardDelete=true the account is only switched off
        if (req.query.hardDelete !== 'true') {
            await pool.request()
                .input('userId', sql.Int, id)
                .query('UPDATE Users SET is_active = 0 WHERE user_id = @userId');
            return res.json({ message: 'User deactivated successfully' });
        }

        // Permanently delete the user and everything that belongs to them, all or nothing
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const steps = [
            'DELETE FROM Payments WHERE booking_id IN (SELECT booking_id FROM Bookings WHERE user_id = @userId)',
            'DELETE FROM Invoices WHERE booking_id IN (SELECT booking_id FROM Bookings WHERE user_id = @userId)',
            'DELETE FROM Feedback WHERE user_id = @userId OR booking_id IN (SELECT booking_id FROM Bookings WHERE user_id = @userId)',
            'DELETE FROM BookingDetails WHERE booking_id IN (SELECT booking_id FROM Bookings WHERE user_id = @userId)',
            'DELETE FROM Bookings WHERE user_id = @userId',
            'DELETE FROM AdminActions WHERE admin_id = @userId',
            'DELETE FROM FavouriteRoutes WHERE user_id = @userId',
            'DELETE FROM Users WHERE user_id = @userId'
        ];

        for (const query of steps) {
            await transaction.request().input('userId', sql.Int, id).query(query);
        }

        await transaction.commit();
        res.json({ message: 'User permanently deleted successfully' });
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch { /* already rolled back */ }
        }
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
