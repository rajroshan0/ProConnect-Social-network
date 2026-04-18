
//  db.js — MySQL Connection Pool
//  Uses mysql2 (promise-based) + dotenv for credentials


const mysql  = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               process.env.DB_PORT     || 3306,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_NAME     || 'proconnect',
    waitForConnections: true,
    connectionLimit:    10,      // max 10 simultaneous connections
    queueLimit:         0        // unlimited queue
});

// Quick connectivity check — runs once when the server starts
(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅  MySQL connected — database:', process.env.DB_NAME || 'proconnect');
        conn.release();
    } catch (err) {
        console.error('❌  MySQL connection failed:', err.message);
        process.exit(1);   // stop the server if DB is unreachable
    }
})();

module.exports = pool;
