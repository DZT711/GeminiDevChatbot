import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Fixing policies on knowledge_nodes...');
    await pool.query(`DROP POLICY IF EXISTS "users can manage their own knowledge" ON knowledge_nodes;`);
    await pool.query(`DROP POLICY IF EXISTS "users can select all knowledge" ON knowledge_nodes;`);
    await pool.query(`DROP POLICY IF EXISTS "admins can manage knowledge" ON knowledge_nodes;`);
    
    await pool.query(`
      CREATE POLICY "users can select all knowledge" ON knowledge_nodes
      FOR SELECT USING (true);
    `);
    
    await pool.query(`
      CREATE POLICY "admins can manage knowledge" ON knowledge_nodes
      FOR ALL USING (
        exists (select 1 from users u where u.id = current_setting('app.current_user_id', true)::uuid and u.role = 'ADMIN')
      );
    `);
    
    console.log('Policies updated successfully!');
  } catch (e) {
    console.error('Failed to update policies:', e);
  } finally {
    pool.end();
  }
}

run();
