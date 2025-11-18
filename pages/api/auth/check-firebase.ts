import { NextApiRequest, NextApiResponse } from 'next';

// For server-side auth check
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(200).json({ authenticated: false });
    }

    try {
      // Verify token using Firebase Admin SDK (if available) or client SDK
      // For client SDK, we can verify on the client side
      // For server, we'd need Firebase Admin SDK
      
      // Simple check - in production, use Firebase Admin SDK
      if (token && token.length > 20) {
        // Basic token validation - in production verify with Admin SDK
        return res.status(200).json({ authenticated: true });
      }
      
      return res.status(200).json({ authenticated: false });
    } catch (error) {
      return res.status(200).json({ authenticated: false });
    }
  } catch (error) {
    return res.status(200).json({ authenticated: false });
  }
}

