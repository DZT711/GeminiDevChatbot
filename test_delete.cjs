const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  SELECT polname, pg_get_expr(polqual, polrelid) as qual, pg_get_expr(polwithcheck, polrelid) as with_check
  FROM pg_policy
  WHERE polrelid = 'knowledge_proposals'::regclass;
`, (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  pool.end();
});
