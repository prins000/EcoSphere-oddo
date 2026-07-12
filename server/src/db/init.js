// ============================================================
// EcoSphere ESG - Database Initialization
// Creates tables from schema.sql
// ============================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function initDatabase() {
  console.log('🗄️  Initializing EcoSphere ESG database...\n');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ecosphere_esg',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    // Read schema SQL file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📋 Running schema.sql...');
    await pool.query(schemaSql);

    console.log('✅ Database schema created successfully!\n');
    console.log('Tables created:');
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    tables.rows.forEach(t => console.log(`  ✓ ${t.tablename}`));

    console.log(`\n  Total: ${tables.rows.length} tables`);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('\nMake sure:');
    console.error(`  1. PostgreSQL is running on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
    console.error(`  2. Database "${process.env.DB_NAME || 'ecosphere_esg'}" exists`);
    console.error(`  3. User "${process.env.DB_USER || 'postgres'}" has proper permissions`);
    console.error(`\n  To create the database manually, run:`);
    console.error(`  CREATE DATABASE ecosphere_esg;`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
