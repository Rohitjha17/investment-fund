import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token || typeof token !== 'string' || token.length < 20) {
    return res.status(400).json({ error: 'Valid token is required' });
  }

  res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; SameSite=Strict`);

  return res.status(200).json({ success: true });
}

