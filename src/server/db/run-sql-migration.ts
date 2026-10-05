import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export async function runDatabaseMigrations(pool: pg.Pool): Promise<void> {
  try {
    console.log('[Migration] Verifying database schema columns...');

    // 1. Add role to users table if it does not exist
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(50) NOT NULL DEFAULT 'USER';`);

    // 2. Drop user_id foreign key constraint and column if exists from knowledge_nodes
    await pool.query(`ALTER TABLE knowledge_nodes DROP COLUMN IF EXISTS user_id CASCADE;`);

    // 3. Recreate policy for inserting knowledge nodes directly
    await pool.query(`ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`DROP POLICY IF EXISTS "users can insert knowledge" ON knowledge_nodes;`);
    await pool.query(`CREATE POLICY "users can insert knowledge" ON knowledge_nodes FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL);`);

    // 4. Add M06 shared agent session columns to sessions table
    await pool.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS workspace_id varchar(255);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS execution_id varchar(255);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS goal_id varchar(255);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS plan_id varchar(255);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_model varchar(255);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'IDLE';
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
    `);

    // 5. Add canonical message classification and correlation columns to messages table
    await pool.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS interaction_type varchar(50) NOT NULL DEFAULT 'UNKNOWN';
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_role varchar(50) NOT NULL DEFAULT 'UNKNOWN';
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_kind varchar(50) NOT NULL DEFAULT 'UNKNOWN';
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS response_code varchar(50) DEFAULT 'UNKNOWN';
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS surface varchar(50) DEFAULT 'UNKNOWN';
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS execution_id varchar(255);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS plan_id varchar(255);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS tool_call_id varchar(255);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_message_id varchar(255);
    `);

    // 6. Add constraint to reject incompatible combinations (e.g., CHAT + AGENT_FINAL)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_interaction_response_compatibility'
        ) THEN
          ALTER TABLE messages ADD CONSTRAINT chk_interaction_response_compatibility CHECK (
            NOT (interaction_type = 'CHAT' AND response_code IN ('AGENT_FINAL', 'AGENT_TOOL_RESULT', 'AGENT_PLAN_UPDATE', 'AGENT_ERROR'))
            AND
            NOT (interaction_type = 'AGENT' AND response_code IN ('CHAT_FINAL', 'CHAT_ERROR'))
          );
        END IF;
      END $$;
    `);

    console.log('[Migration] Database schema verified successfully.');
  } catch (err: any) {
    console.error('[Migration] Database migration check warning:', err.message || err);
  }
}

async function main(): Promise<void> {
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
    await runDatabaseMigrations(pool);
  } finally {
    await pool.end();
  }
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('run-sql-migration.ts')) {
  main();
}

