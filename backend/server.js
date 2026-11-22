const express = require('express');
const cors = require('cors');
require('dotenv').config();

// The server cannot make safe login tokens without a secret
const secret = process.env.JWT_SECRET || '';
if (secret.length < 32 || secret === 'replace_with_a_long_random_secret') {
    console.error('JWT_SECRET is missing or too short in backend/.env (use at least 32 random characters).');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Only the frontend address(es) in CORS_ORIGIN may call the API from a browser.
// Leave it empty while developing to allow any origin.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors(allowedOrigins.length > 0 ? { origin: allowedOrigins } : {}));
app.use(express.json({ limit: '100kb' }));

// Request log: prints one line in the terminal for every API call, so you
// can watch the backend work. Request bodies are never printed (they can
// hold passwords). Set LOG_REQUESTS=false in backend/.env to turn it off.
if (process.env.LOG_REQUESTS !== 'false') {
    app.use((req, res, next) => {
        const start = Date.now();
        // "finish" runs after the response has been sent
        res.on('finish', () => {
            const time = new Date().toLocaleTimeString();
            const ms = Date.now() - start;
            const who = req.user ? `${req.user.role} #${req.user.userId}` : 'guest';
            console.log(`${time}  ${req.method.padEnd(6)} ${req.originalUrl}  ->  ${res.statusCode}  (${ms} ms, ${who})`);
        });
        next();
    });
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/cities', require('./routes/cities'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/buses', require('./routes/buses'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/promocodes', require('./routes/promocodes'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/favourites', require('./routes/favourites'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/company', require('./routes/company'));
app.use('/api/chatbot', require('./routes/chatbot'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Musafir API is running' });
});

// Unknown API address
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Any other error (details go to the server log, not to the browser)
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid request data' });
    }
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    const { closePool } = require('./config/db');
    await closePool();
    process.exit(0);
});
