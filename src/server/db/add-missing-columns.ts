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
    console.log('Adding "pinned" column to sessions table...');
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;`);
    console.log('Success: "pinned" column added successfully!');
    
    console.log('Adding "summary" column to sessions table...');
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS summary text;`);
    console.log('Success: "summary" column added successfully!');
  } catch (err: any) {
    console.error('Failed to add columns:', err.message || err);
  } finally {
    await pool.end();
  }
}

main();
