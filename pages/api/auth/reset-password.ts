import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const admin = await db.getAdminByUsername(email);
    if (!admin) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const isValid = await db.verifyOtp(email, otp, 'reset');
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await db.updateAdminPassword(admin.id, hashedPassword);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

