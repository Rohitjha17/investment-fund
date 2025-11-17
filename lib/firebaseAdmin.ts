import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

export function initFirebaseAdmin() {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase admin credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  if (!getApps().length) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
  } else {
    adminApp = getApps()[0];
  }

  return adminApp!;
}

export function getDb() {
  const app = initFirebaseAdmin();
  return getFirestore(app);
}

