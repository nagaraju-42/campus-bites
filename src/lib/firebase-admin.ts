import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export function getFCM(
  projectId = process.env.FIREBASE_PROJECT_ID,
  clientEmail = process.env.FIREBASE_CLIENT_EMAIL,
  privateKey = process.env.FIREBASE_PRIVATE_KEY
): any {
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is missing');
  }
  
  if (!getApps().length) {
    try {
      initializeApp({
        credential: cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey?.replace(/\\n/g, '\n'),
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
