import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export function getFCM() {
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.warn('FIREBASE_PROJECT_ID is missing. FCM Push will be disabled.');
    return null;
  }
  
  if (!getApps().length) {
    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin SDK Initialized Successfully');
    } catch (error) {
      console.error('Firebase Admin Initialization Error:', error);
      return null;
    }
  }

  try {
    return getMessaging();
  } catch (error) {
    return null;
  }
}
