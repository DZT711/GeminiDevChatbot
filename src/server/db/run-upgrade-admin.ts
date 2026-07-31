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
    console.log('Upgrading nguyensihuynsh711@gmail.com to ADMIN...');
    
    const result = await pool.query(
      `UPDATE users SET role = 'ADMIN' WHERE email = $1 RETURNING id, email, role;`,
      ['nguyensihuynsh711@gmail.com']
    );
    
    if (result.rows.length > 0) {
      console.log('Success! Your user account has been upgraded:', result.rows[0]);
    } else {
      console.log('No user found with email nguyensihuynsh711@gmail.com. Checking if any other emails qualify...');
      const allUsers = await pool.query(`SELECT email, role FROM users LIMIT 10;`);
      console.log('Existing users in database:', allUsers.rows);
    }
  } catch (err: any) {
    console.error('Upgrade failed:', err.message || err);
  } finally {
    await pool.end();
  }
}

main();
