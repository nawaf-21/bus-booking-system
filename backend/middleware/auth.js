const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

// Check the login token and load the user from the database
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"
    if (!token) {
        return res.status(401).json({ error: 'Please log in first' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.Int, decoded.userId)
            .query('SELECT user_id, role, company_id FROM Users WHERE user_id = @userId AND is_active = 1');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
        }

        // Use the role from the database, so a changed role takes effect straight away
        const user = result.recordset[0];
        req.user = {
            userId: user.user_id,
            role: user.role,
            companyId: user.company_id
        };
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};

// Only allow users with one of the given roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Please log in first' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to do this' });
        }
        next();
    };
};

// For pages guests can also see: check the token if there is one,
// otherwise carry on as a guest (req.user stays empty)
const optionalAuthenticate = (req, res, next) => {
    if (!req.headers.authorization) {
        return next();
    }
    return authenticate(req, res, next);
};

module.exports = {
    authenticate,
    optionalAuthenticate,
    authorize
};
