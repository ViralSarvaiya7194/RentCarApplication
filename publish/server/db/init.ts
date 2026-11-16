import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env configuration
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbHost = process.env['DB_HOST'] || '127.0.0.1';
const dbPort = parseInt(process.env['DB_PORT'] || '5432', 10);
const dbUser = process.env['DB_USER'] || 'postgres';
const dbPassword = process.env['DB_PASSWORD'] || 'postgres';
const targetDbName = process.env['DB_NAME'] || 'rental_car_db';
const targetSchema = process.env['DB_SCHEMA'] || 'public';

export async function initDatabase() {
  console.log('====================================================');
  console.log('🚀 Starting PostgreSQL Database Setup & Initialization');
  console.log('====================================================');
  console.log(`Connecting to PostgreSQL host: ${dbHost}:${dbPort} as user: ${dbUser}...`);

  // Step 1: Connect to default maintenance database to verify/create target database
  const maintenanceClient = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres',
  });

  try {
    await maintenanceClient.connect();
    console.log('✅ Connected to PostgreSQL server.');

    // Check if target database exists
    const checkDbRes = await maintenanceClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDbName]
    );

    if (checkDbRes.rowCount === 0) {
      console.log(`⏳ Database "${targetDbName}" does not exist. Creating database...`);
      await maintenanceClient.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`✅ Database "${targetDbName}" created successfully.`);
    } else {
      console.log(`ℹ️  Database "${targetDbName}" already exists.`);
    }
  } catch (err: any) {
    console.error('❌ Error connecting to PostgreSQL / creating database:', err.message);
    if (err.code === '28P01') {
      console.error('\n⚠️  AUTHENTICATION FAILED: Please check your DB_PASSWORD in .env file.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error(`\n⚠️  CONNECTION REFUSED: Please ensure PostgreSQL service is running on ${dbHost}:${dbPort}.`);
    }
    process.exit(1);
  } finally {
    await maintenanceClient.end();
  }

  // Step 2: Connect directly to the target database and execute schema DDL & seed
  const targetClient = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: targetDbName,
  });

  try {
    await targetClient.connect();
    console.log(`✅ Connected to target database: "${targetDbName}".`);

    // Ensure schema exists
    if (targetSchema !== 'public') {
      await targetClient.query(`CREATE SCHEMA IF NOT EXISTS "${targetSchema}"`);
      await targetClient.query(`SET search_path TO "${targetSchema}", public`);
      console.log(`✅ Schema "${targetSchema}" ready.`);
    }

    // Read and run schema.sql
    const sqlPath = path.resolve(__dirname, 'schema.sql');
    console.log(`⏳ Executing schema script from: ${sqlPath}...`);
    const sqlScript = fs.readFileSync(sqlPath, 'utf-8');

    await targetClient.query(sqlScript);
    console.log('✅ Database tables, constraints, indices, and seeds initialized successfully.');

    // Query and display table row counts
    const tables = [
      'companies',
      'branches',
      'locations',
      'car_models',
      'cars',
      'rates',
      'grace_periods',
      'users',
      'shifts',
      'rentals',
      'day_closes',
      'translations',
    ];

    console.log('\n📊 Database Status & Record Counts:');
    console.log('----------------------------------------------------');
    for (const table of tables) {
      try {
        const countRes = await targetClient.query(`SELECT COUNT(*) FROM "${table}"`);
        console.log(` - Table "${table}": ${countRes.rows[0].count} records`);
      } catch (tableErr: any) {
        console.log(` - Table "${table}": Error checking count (${tableErr.message})`);
      }
    }
    console.log('----------------------------------------------------');
    console.log('🎉 PostgreSQL Database setup completed successfully!\n');
  } catch (err: any) {
    console.error('❌ Error executing database schema/seeds:', err.message);
    process.exit(1);
  } finally {
    await targetClient.end();
  }
}

// Run setup if executed directly
initDatabase().catch((err) => {
  console.error('Initialization error:', err);
  process.exit(1);
});
