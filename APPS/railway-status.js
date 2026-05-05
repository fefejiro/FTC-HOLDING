const fs = require('fs');
const https = require('https');
const cfg = JSON.parse(fs.readFileSync(process.env.USERPROFILE + '/.railway/config.json', 'utf8'));
const token = cfg.user?.token || cfg.user?.accessToken;
const gql = 'query { me { projects { edges { node { id name services { edges { node { id name } } } } } } } }';
const body = JSON.stringify({ query: gql });
const req = https.request({
  hostname: 'backboard.railway.com',
  path: '/graphql/v2',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'Content-Length': Buffer.byteLength(body) }
}, res => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => {
    try {
      const j = JSON.parse(d);
      if (j.errors) { console.log('ERRORS:', JSON.stringify(j.errors)); return; }
      (j.data?.me?.projects?.edges || []).forEach(pe => {
        const p = pe.node;
        console.log('PROJECT:', p.name, '|', p.id);
        (p.services?.edges || []).forEach(se => { console.log('  SVC:', se.node.name, se.node.id); });
      });
    } catch (e) { console.log('RAW:', d.slice(0, 800)); }
  });
});
req.on('error', e => console.log('ERR:', e.message));
req.write(body); req.end();
