import 'dotenv/config';
import pg from 'pg';
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});
pool.query('DO $$ BEGIN CREATE TYPE "public"."role" AS ENUM(\'user\', \'model\', \'system\', \'tool\'); EXCEPTION WHEN duplicate_object THEN null; END $$;').then(()=>console.log('OK')).catch(console.error).finally(()=>pool.end());
