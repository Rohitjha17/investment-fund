import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, doc, getDoc, setDoc, deleteDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { getAuth, Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, User } from 'firebase/auth';

// Firebase configuration with fallback values
// Vercel me environment variables set karne ke liye:
// Settings → Environment Variables → Add each NEXT_PUBLIC_* variable
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDNRdGk2fxLZrkZRHDRHGoUaHmhdrlOX3E",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "investment-794cc.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "investment-794cc",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "investment-794cc.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1068865934588",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1068865934588:web:4eca8321e608bf2d3f3379",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-63PWRQ2JT1"
};

// Debug: Log config in server-side (Vercel logs me dikhega)
if (typeof window === 'undefined') {
  console.log('🔧 Firebase Config Check (Server-side):');
  console.log('Project ID:', firebaseConfig.projectId);
  console.log('API Key exists:', !!firebaseConfig.apiKey);
  console.log('Using env vars:', {
    apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  });
}

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let authInstance: Auth;

if (typeof window !== 'undefined') {
  // Client-side initialization
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
  authInstance = getAuth(app);
} else {
  // Server-side initialization
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
  authInstance = getAuth(app);
}

const auth = authInstance;

export { db, auth, Timestamp };
export default app;

