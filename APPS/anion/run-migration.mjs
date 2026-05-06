const https = require('https');
const fs = require('fs');
const path = require('path');

const SB_URL = 'aaaextkrfoqomzmjjkxe.supabase.co';
const SB_KEY = process.argv[2];
const sql = fs.readFileSync(path.join(process.argv[3]), 'utf8');

function execSql(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: SB_URL,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

execSql(sql).then(r => {
  console.log('STATUS:', r.status);
  console.log('BODY:', r.body);
}).catch(e => console.error('ERROR:', e.message));
