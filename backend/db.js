
require("dotenv").config();

const mysql = require("mysql2/promise");

// Create a MySQL connection pool that can be reused across requests.
const pool = mysql.createPool({
    // Read database credentials from environment variables.
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,

    // Wait for a connection when all available connections are busy.
    waitForConnections: true,

    // Allow up to 10 simultaneous database connections.
    connectionLimit: 10,

    // Allow queued requests to wait without a fixed queue limit.
    queueLimit: 0
});

// Export the pool so server.js can execute database queries.
module.exports = pool;
