import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export function getFCM(): any {
  if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_PROJECT_ID is missing in process.env');
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
    } catch (error: any) {
      throw new Error(`Firebase Admin Initialization Error: ${error.message}`);
    }
  }

  try {
    return getMessaging();
  } catch (error: any) {
    throw new Error(`getMessaging Error: ${error.message}`);
  }
}
