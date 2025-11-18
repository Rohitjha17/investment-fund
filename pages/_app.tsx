import '@/styles/globals.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  // Removed client-side Firestore auto-initialization
  // Initialization should happen server-side via API routes or after user authentication
  // This prevents "Missing or insufficient permissions" errors on page load

  return <Component {...pageProps} />;
}

