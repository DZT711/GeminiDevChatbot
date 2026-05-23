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
    console.log('Adding "pinned" column to sessions table if not exists...');
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;`);
    console.log('Success: "pinned" column added successfully!');
  } catch (err: any) {
    console.error('Failed to add pinned column:', err.message || err);
  } finally {
    await pool.end();
  }
}

main();
