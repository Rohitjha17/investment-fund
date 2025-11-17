import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const admin = await db.getAdminByUsername(email);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await db.verifyOtp(email, otp, 'login');
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    res.setHeader('Set-Cookie', `admin_session=${admin.id}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`);

    return res.status(200).json({
      success: true,
      user: { id: admin.id, username: admin.username, role: admin.role }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

