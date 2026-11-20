const sql = require('mssql');
require('dotenv').config();

// Parse DB_OPTIONS if provided
let dbOptions = {
    encrypt: true,
    trustServerCertificate: true
};

if (process.env.DB_OPTIONS) {
    try {
        dbOptions = JSON.parse(process.env.DB_OPTIONS);
    } catch (e) {
        console.warn('Invalid DB_OPTIONS format, using defaults');
    }
}

// Build config - handle named instances properly
let serverName = process.env.DB_SERVER || 'localhost\\SQLEXPRESS';

// Convert .\INSTANCE to localhost\INSTANCE (mssql doesn't understand .)
if (serverName.startsWith('.\\')) {
    serverName = 'localhost' + serverName.substring(1);
}

// Remove port from server name if present (for named instances)
serverName = serverName.split(',')[0];

// Extract instance name if present (format: server\instance)
let instanceName = null;
let serverOnly = serverName;
if (serverName.includes('\\')) {
    const parts = serverName.split('\\');
    serverOnly = parts[0];
    instanceName = parts[1];
}

const config = {
    server: serverOnly,
    database: process.env.DB_DATABASE || 'TravelBookingDB',
    options: {
        encrypt: dbOptions.encrypt !== undefined ? dbOptions.encrypt : true,
        trustServerCertificate: dbOptions.trustServerCertificate !== undefined ? dbOptions.trustServerCertificate : true,
        enableArithAbort: true,
        // Times in the database are Pakistan local time, not UTC
        useUTC: false,
        connectionTimeout: 60000,
        requestTimeout: 60000
    }
};

// Add instance name if present (for named instances)
if (instanceName) {
    config.options.instanceName = instanceName;
}

// For named instances, don't specify port - let Browser service resolve it
// Only add port if explicitly provided AND it's not a named instance
if (process.env.DB_PORT && process.env.DB_PORT !== '' && !instanceName) {
    config.port = parseInt(process.env.DB_PORT);
}

// SQL Server login (a SQL user, e.g. "sa" or one you created)
config.user = process.env.DB_USER;
config.password = process.env.DB_PASSWORD;

let pool = null;

const getPool = async () => {
    if (pool) {
        return pool;
    }
    
    try {
        console.log('Attempting to connect to:', config.server);
        pool = await sql.connect(config);
        console.log('Connected to SQL Server');
        return pool;
    } catch (err) {
        console.error('Database connection error:', err);
        throw err;
    }
};

const closePool = async () => {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('Database connection closed');
    }
};

module.exports = {
    getPool,
    closePool,
    sql
};
