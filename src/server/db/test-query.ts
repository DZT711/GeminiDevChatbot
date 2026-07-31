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
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sessions' AND table_schema = 'public';`);
    console.log(res.rows);
  } catch (err: any) {
    console.error('Failed to query:', err.message || err);
  } finally {
    await pool.end();
  }
}

main();
