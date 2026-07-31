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
    
    // 3. Recreate policy for inserting knowledge nodes directly
    await pool.query(`ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`DROP POLICY IF EXISTS "users can insert knowledge" ON knowledge_nodes;`);
    await pool.query(`CREATE POLICY "users can insert knowledge" ON knowledge_nodes FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL);`);
    console.log('Success: Recreated "users can insert knowledge" RLS rule.');
    
    console.log('Database schema successfully migrated!');
  } catch (err: any) {
    console.error('Migration failed:', err.message || err);
  } finally {
    await pool.end();
  }
}

main();
