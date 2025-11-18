import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { initializeFirestore } from '@/lib/firestore-init';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize Firestore on app load
    if (typeof window !== 'undefined') {
      initializeFirestore().catch(console.error);
    }
  }, []);

  return <Component {...pageProps} />;
}

