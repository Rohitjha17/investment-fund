import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionId = req.cookies?.admin_session;

    if (!sessionId) {
      return res.status(401).json({ authenticated: false });
    }

    const admin = db.getAdminById(parseInt(sessionId));

    if (!admin) {
      return res.status(401).json({ authenticated: false });
    }

    return res.status(200).json({ authenticated: true, user: { id: admin.id, username: admin.username, role: admin.role } });
  } catch (error) {
    return res.status(401).json({ authenticated: false });
  }
}
