import https from 'https';
const token = process.env.RTOKEN;
const serviceId = '08fc8075-1201-412a-a2b7-508160e46653';
const envId = 'bfe73023-d1d2-401f-bd67-51fa7b138f68';

const body = JSON.stringify({
  query: `{
    deployments(input: { serviceId: "${serviceId}", environmentId: "${envId}" }, first: 5) {
      edges {
        node {
          id
          status
          createdAt
        }
      }
    }
  }`
});

const opts = {
  hostname: 'backboard.railway.com',
  path: '/graphql/v2',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(opts, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.errors) {
        console.error('Errors:', JSON.stringify(parsed.errors, null, 2));
      } else {
        console.log(JSON.stringify(parsed.data, null, 2));
      }
    } catch (e) {
      console.log(data.slice(0, 3000));
    }
  });
});

req.on('error', e => console.error('Request error:', e.message));
req.write(body);
req.end();
