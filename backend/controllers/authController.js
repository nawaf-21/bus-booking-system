const { getPool, sql } = require('../config/db');
const { hashPassword, comparePassword, generateToken, checkPassword } = require('../utils/helpers');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(\+92|0)3\d{2}-?\d{7}$/;

// only passengers sign up here, admin makes other accounts
const register = async (req, res) => {
    try {
        const { full_name, email, password, gender, phone_no, role } = req.body;

        if (!full_name || !email || !password || !phone_no) {
            return res.status(400).json({ error: 'Please fill in all required fields' });
        }

        if (!String(full_name).trim() || String(full_name).trim().length > 100) {
            return res.status(400).json({ error: 'Please enter your full name' });
        }

        // pakistani number e.g. 0300-1234567
        if (!PHONE_PATTERN.test(String(phone_no).trim())) {
            return res.status(400).json({ error: 'Please enter a valid mobile number, for example 0300-1234567' });
        }

        if (role && role !== 'Passenger') {
            return res.status(400).json({ error: 'Bus company accounts are created by the admin. Please contact us.' });
        }

        if (!['Male', 'Female'].includes(gender)) {
            return res.status(400).json({ error: 'Please select your gender' });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        if (!EMAIL_PATTERN.test(cleanEmail)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        const passwordProblem = checkPassword(password);
        if (passwordProblem) {
            return res.status(400).json({ error: passwordProblem });
        }

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
            .input('gender', sql.VarChar, gender)
            .input('phone_no', sql.VarChar, String(phone_no).trim())
            .query(`
                INSERT INTO Users (full_name, email, password_hash, gender, phone_no, role)
                OUTPUT INSERTED.user_id, INSERTED.full_name, INSERTED.email, INSERTED.role
                VALUES (@full_name, @email, @password_hash, @gender, @phone_no, 'Passenger')
            `);

        const user = result.recordset[0];
        const token = generateToken(user.user_id, user.role);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                userId: user.user_id,
                fullName: user.full_name,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('email', sql.VarChar, String(email).trim().toLowerCase())
            .query(`
                SELECT u.user_id, u.full_name, u.email, u.password_hash, u.role, u.company_id, u.is_active,
                       bc.company_name
                FROM Users u
                LEFT JOIN BusCompanies bc ON u.company_id = bc.company_id
                WHERE LOWER(LTRIM(RTRIM(u.email))) = @email
            `);

        const user = result.recordset[0];
        const isValidPassword = user ? await comparePassword(String(password), user.password_hash) : false;

        // same msg for wrong email and wrong password
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.is_active) {
            return res.status(401).json({ error: 'This account has been deactivated' });
        }

        const token = generateToken(user.user_id, user.role);

        res.json({
            message: 'Login successful',
            user: {
                userId: user.user_id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                companyId: user.company_id,
                companyName: user.company_name
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

const getMe = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .query(`
                SELECT u.user_id, u.full_name, u.email, u.gender, u.phone_no, u.role, u.company_id,
                       bc.company_name
                FROM Users u
                LEFT JOIN BusCompanies bc ON u.company_id = bc.company_id
                WHERE u.user_id = @userId AND u.is_active = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.recordset[0];
        res.json({
            user: {
                userId: user.user_id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                companyId: user.company_id,
                companyName: user.company_name
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
};

module.exports = {
    register,
    login,
    getMe
};
