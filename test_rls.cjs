const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  SELECT relrowsecurity FROM pg_class WHERE relname = 'knowledge_proposals';
`, (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  pool.end();
});
