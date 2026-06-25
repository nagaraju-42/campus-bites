const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
require('dotenv').config({ path: '.env.local' });

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

async function testPush() {
  console.log("Waiting 15 seconds before sending push...");
  await new Promise(r => setTimeout(r, 15000));
  
  try {
    const payload = {
      token: 'eIqkh1OxSyCsgaMnTQ8GYL:APA91bGPQ5DJp4vnfTf4B0o2MkkgYR_BEs2ij-nSNwhfzrhUmZoOzMZRnA1Cz9Rpcd1-iqH3zAUTnxCcxDQXoVhKjRGTKeNIreHsX68vIZdOnL1nMBTk820',
      notification: {
        title: 'Antigravity Test 🚀',
        body: 'This push was triggered directly by the AI!'
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default'
        }
      }
    };
    console.log("Sending now...");
    const response = await getMessaging().send(payload);
    console.log("SUCCESS:", response);
  } catch(e) {
    console.log("ERROR:", e);
  }
}
testPush();
