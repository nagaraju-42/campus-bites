const https = require('https');

const data = JSON.stringify({
  userId: '4542c4a9-1dea-41ac-97c2-8b29094fee7f',
  title: 'Direct API Test',
  message: 'Testing /api/fcm/trigger on production'
});

const options = {
  hostname: 'campus-bites-teal.vercel.app',
  path: '/api/fcm/trigger',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, res => {
  console.log(`Status: ${res.statusCode}`);
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => { console.log('Response:', body); });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(data);
req.end();
