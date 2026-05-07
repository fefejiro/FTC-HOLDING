import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const c = await pool.connect();
console.log('search_path:', (await c.query('SHOW search_path')).rows[0]);
console.log('current_schema:', (await c.query('SELECT current_schema()')).rows[0]);
console.log('current_user:', (await c.query('SELECT current_user')).rows[0]);
try {
  const r = await c.query('SELECT count(*) FROM sessions');
  console.log('SELECT count(*) FROM sessions =>', r.rows[0]);
} catch (e) {
  console.error('UNQUALIFIED FAILED:', e.code, e.message);
}
try {
  const r = await c.query('SELECT count(*) FROM peacepad.sessions');
  console.log('peacepad.sessions =>', r.rows[0]);
} catch (e) { console.error('peacepad.sessions FAILED:', e.code, e.message); }
try {
  const r = await c.query('SELECT count(*) FROM public.sessions');
  console.log('public.sessions =>', r.rows[0]);
} catch (e) { console.error('public.sessions FAILED:', e.code, e.message); }
c.release();
await pool.end();
