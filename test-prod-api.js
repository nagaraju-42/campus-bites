const https = require('https');

const data = JSON.stringify({
  shopId: '230c6c53-bca5-4d24-8f1b-e54c819df462',
  orderNumber: '#CBTEST1',
  totalAmount: 'Rs.50.00'
});

const options = {
  hostname: 'campus-bites-teal.vercel.app',
  path: '/api/orders/notify',
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
