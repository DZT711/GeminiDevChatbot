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
    console.log('Creating "knowledge_proposals" table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_proposals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        action_type varchar(50) NOT NULL,
        target_node_id uuid REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
        proposed_content text,
        reason text,
        status varchar(50) DEFAULT 'PENDING' NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    console.log('Success: "knowledge_proposals" table created successfully!');
  } catch (err: any) {
    console.error('Error creating table:', err.stack || err.message || err);
  } finally {
    await pool.end();
  }
}

main();
