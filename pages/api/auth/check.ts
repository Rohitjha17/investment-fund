import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/firebase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(200).json({ authenticated: false });
    }

    // Basic token validation - in production use Firebase Admin SDK for server-side verification
    // For now, we'll verify token format
    if (token && token.length > 20) {
      // Token exists and has valid format
      // In production, verify with Firebase Admin SDK
      return res.status(200).json({ authenticated: true });
    }

    return res.status(200).json({ authenticated: false });
  } catch (error) {
    return res.status(200).json({ authenticated: false });
  }
}
