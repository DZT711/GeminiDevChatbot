import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not configured.');
    return;
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false }
  });
  
  try {
    console.log('Running custom database migration...');
    
    // 1. Add role to users table if it does not exist
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(50) NOT NULL DEFAULT 'USER';`);
    console.log('Success: Added "role" column to users table.');
    
    // 2. Drop user_id foreign key constraint and column if exists from knowledge_nodes
    // In PostgreSQL, to drop a column with a foreign key constraint, we can use CASCADE
    await pool.query(`ALTER TABLE knowledge_nodes DROP COLUMN IF EXISTS user_id CASCADE;`);
    console.log('Success: Dropped "user_id" column from "knowledge_nodes" table.');
    
    console.log('Database schema successfully migrated!');
  } catch (err: any) {
    console.error('Migration failed:', err.message || err);
  } finally {
    await pool.end();
  }
}

main();
