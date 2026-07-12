// ============================================================
// EcoSphere ESG - Database Configuration
// Plain PostgreSQL connection pool using 'pg'
// ============================================================

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ecosphere_esg',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,               // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('  📦 Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('  ❌ PostgreSQL pool error:', err.message);
});

/**
 * Helper: run a query with params
 * @param {string} text - SQL query
 * @param {Array} params - query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Helper: get a client from the pool for transactions
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
