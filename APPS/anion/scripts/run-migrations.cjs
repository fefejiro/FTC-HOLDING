/**
 * Applies Supabase migrations via REST API (exec_sql RPC).
 * Usage: node scripts/run-migrations.cjs <SERVICE_ROLE_KEY>
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const SB_HOST = 'aaaextkrfoqomzmjjkxe.supabase.co';
const SB_KEY = process.argv[2];

if (!SB_KEY) {
  console.error('Usage: node scripts/run-migrations.cjs <SERVICE_ROLE_KEY>');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).sort();

function runSql(sql, label) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: SB_HOST,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        console.log(`[${ok ? 'OK' : 'FAIL'}] ${label} — HTTP ${res.statusCode}`);
        if (!ok) console.log('  Body:', data.substring(0, 400));
        resolve({ ok, status: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await runSql(sql, file);
  }
  console.log('All migrations attempted.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
