import { NextApiRequest, NextApiResponse } from 'next';
import { initializeFirestore } from '@/lib/firestore-init';

/**
 * API endpoint to initialize Firestore database
 * Call this once after setting up Firebase to initialize collections
 * This only initializes the system/config document - no local file operations
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Firestore (creates system/config document if not exists)
    const initialized = await initializeFirestore();

    if (!initialized) {
      return res.status(500).json({ error: 'Failed to initialize Firestore' });
    }

    return res.status(200).json({
      success: true,
      message: 'Firestore initialized successfully!',
      initialized: true
    });
  } catch (error: any) {
    console.error('Error initializing Firestore:', error);
    return res.status(500).json({
      error: 'Failed to initialize Firestore',
      details: error.message
    });
  }
}

