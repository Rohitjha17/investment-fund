import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
import { sendEmail } from '@/lib/email';

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const admin = await db.getAdminByUsername(email);
    if (!admin) {
      return res.status(200).json({ success: true }); // Prevent user enumeration
    }

    const otp = generateOtp();
    await db.saveOtpRecord({
      email,
      otp,
      purpose: 'reset',
      expires_at: Date.now() + 10 * 60 * 1000
    });

    await sendEmail({
      to: email,
      subject: 'Reset your LakhDatar admin password',
      html: `
        <p>Hi ${admin.username},</p>
        <p>Use the OTP below to reset your password:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
        <p>This OTP expires in 10 minutes.</p>
      `
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

