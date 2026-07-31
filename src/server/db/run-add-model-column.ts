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
    console.log('Adding "model" column to custom_skills table if not exists...');
    await pool.query(`ALTER TABLE custom_skills ADD COLUMN IF NOT EXISTS model varchar(255);`);
    console.log('Success: "model" column added successfully!');
  } catch (err: any) {
    console.error('Failed to add model column:', err.message || err);
  } finally {
    await pool.end();
  }
}

main();
