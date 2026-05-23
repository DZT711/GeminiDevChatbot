import dotenv from 'dotenv';
import * as jose from 'jose';
import fetch from 'node-fetch';
import pg from 'pg';
dotenv.config();

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-123456');

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('No DATABASE_URL found');
    return;
  }
  const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  
  try {
    const userRes = await pool.query("SELECT id, email from users LIMIT 1");
    if (userRes.rows.length === 0) {
      throw new Error('No users in database');
    }
    const user = userRes.rows[0];
    console.log(`Using user: ${user.email} (${user.id})`);

    // Generate JWT token
    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    console.log('Sending request to /api/knowledge/proposals ...');
    const response = await fetch('http://localhost:3000/api/knowledge/proposals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        actionType: 'INSERT',
        proposedContent: 'The lead cloud architect of DevGenie is Nguyen and he loves building AI that automate building apps',
        reason: 'This key insight provides important context about the lead cloud architect'
      })
    });

    console.log('Response Status:', response.status);
    const body: any = await response.json();
    console.log('Response Body:', body);

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
