import { NextApiRequest, NextApiResponse } from 'next';
import { initializeFirestore, migrateFromLocal } from '@/lib/firestore-init';
import fs from 'fs';
import path from 'path';

/**
 * API endpoint to initialize Firestore database
 * Call this once after setting up Firebase to initialize collections
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { migrate } = req.body;

    // Initialize Firestore
    const initialized = await initializeFirestore();

    if (!initialized) {
      return res.status(500).json({ error: 'Failed to initialize Firestore' });
    }

    let migrationResult = null;

    // If migrate flag is true, try to migrate from investment.json
    if (migrate) {
      const jsonPath = path.join(process.cwd(), 'investment.json');
      
      if (fs.existsSync(jsonPath)) {
        try {
          const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          migrationResult = await migrateFromLocal(jsonData);
        } catch (error: any) {
          console.error('Error migrating data:', error);
          return res.status(500).json({
            error: 'Failed to migrate data',
            details: error.message,
            initialized: true
          });
        }
      } else {
        return res.status(200).json({
          success: true,
          message: 'Firestore initialized. No investment.json found to migrate.',
          initialized: true,
          migrated: false
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: migrationResult 
        ? 'Firestore initialized and data migrated successfully!' 
        : 'Firestore initialized successfully!',
      initialized: true,
      migrated: migrationResult || false
    });
  } catch (error: any) {
    console.error('Error initializing Firestore:', error);
    return res.status(500).json({
      error: 'Failed to initialize Firestore',
      details: error.message
    });
  }
}

