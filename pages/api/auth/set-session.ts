import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Set HTTP-only session cookie (expires when browser closes)
    res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; SameSite=Strict`);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error setting session:', error);
    return res.status(500).json({ error: 'Failed to set session' });
  }
}

