import admin from 'firebase-admin';

// Avoid re-initializing in Next.js hot reload / lambda reuse
if (!admin.apps.length) {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'investment-794cc';

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ? process
        .env
        .FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('✅ Firebase Admin initialized with service account');
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
    console.warn(
      '⚠️ Firebase Admin initialized with default credentials. Set FIREBASE_ADMIN_* env vars on Vercel.'
    );
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

export default admin;

