const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'", (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  pool.end();
});
