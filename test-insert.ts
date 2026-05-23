import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('No DATABASE_URL found');
    return;
  }
  const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  
  try {
    const client = await pool.connect();
    try {
      // Find a non-admin user
      const userRes = await client.query("SELECT id, role from users WHERE role != 'ADMIN' LIMIT 1");
      if (userRes.rows.length === 0) {
         throw new Error('No user found');
      }
      const testUserId = userRes.rows[0].id;
      console.log(`Setting session to user ID: ${testUserId}`);

      await client.query('BEGIN');
      
      // Set session setting
      await client.query('SELECT set_config($1, $2, $3)', ['app.current_user_id', testUserId, true]);
      
      // 1. Insert into knowledge_nodes
      const insertNodeQuery = `
        insert into "knowledge_nodes" ("id", "node_type", "content", "embedding", "metadata", "created_at") 
        values (default, $1, $2, $3, $4, default) 
        returning "id"
      `;
      const vector = Array(768).fill(0);
      console.log('Inserting into knowledge_nodes...');
      const nodeRes = await client.query(insertNodeQuery, [
        'web_data',
        'Testing real full transaction insertion flow.',
        JSON.stringify(vector),
        JSON.stringify({ reason: 'diagnostic dual inserts' })
      ]);
      const insertedNodeId = nodeRes.rows[0].id;
      console.log(`Knowledge node inserted successfully with ID: ${insertedNodeId}`);

      // 2. Insert into knowledge_proposals
      const insertProposalQuery = `
        insert into "knowledge_proposals" ("id", "user_id", "action_type", "target_node_id", "proposed_content", "reason", "status", "created_at") 
        values (default, $1, $2, $3, $4, $5, $6, default) 
        returning "id"
      `;
      console.log('Inserting into knowledge_proposals...');
      const propRes = await client.query(insertProposalQuery, [
        testUserId,
        'INSERT',
        insertedNodeId,
        'Testing real full transaction insertion flow.',
        'diagnostic testing dual inserts RLS policies',
        'APPROVED'
      ]);
      console.log('Proposal inserted successfully with ID:', propRes.rows[0].id);

      await client.query('COMMIT');
      console.log('--- TRANSACTION SUCCESSFULLY COMMITTED ---');
    } catch (e: any) {
      console.error('--- TRANSACTION FAILED ---');
      console.error(e);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Pool connection error:', err);
  } finally {
    await pool.end();
  }
}

run();
