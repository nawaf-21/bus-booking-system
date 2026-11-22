const sql = require('mssql');
require('dotenv').config();

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

let serverName = process.env.DB_SERVER || 'localhost\\SQLEXPRESS';

// mssql doesn't understand '.' so use localhost
if (serverName.startsWith('.\\')) {
    serverName = 'localhost' + serverName.substring(1);
}

serverName = serverName.split(',')[0];

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
        // db times are pakistan time, not utc
        useUTC: false,
        connectionTimeout: 60000,
        requestTimeout: 60000
    }
};

if (instanceName) {
    config.options.instanceName = instanceName;
}

// named instance: no port, sql browser finds it
if (process.env.DB_PORT && process.env.DB_PORT !== '' && !instanceName) {
    config.port = parseInt(process.env.DB_PORT);
}

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
