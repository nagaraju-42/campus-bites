const https = require('https');

const data = JSON.stringify({
  userId: '4542c4a9-1dea-41ac-97c2-8b29094fee7f',
  title: '🚨 New Order Received! 🚨',
  body: 'Order #1000 for ₹50.00',
  url: '/shop/kds'
});

const options = {
  hostname: 'campus-bites-nagaraju-42s-projects.vercel.app',
  path: '/api/push/trigger',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let responseData = '';
  res.on('data', d => {
    responseData += d;
  });
  res.on('end', () => {
    console.log(responseData);
  })
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
