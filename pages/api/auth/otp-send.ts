import { NextApiRequest, NextApiResponse } from 'next';
import { db, Timestamp } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 1000)); // 2 minutes

    // Store OTP in Firestore
    const otpDocRef = doc(collection(db, 'otp_codes'), email);
    await setDoc(otpDocRef, {
      email,
      otp,
      expiresAt,
      createdAt: Timestamp.now(),
      verified: false
    });

    // Send OTP via email using Resend
    // For development, just log it
    console.log(`OTP for ${email}: ${otp}`);

    // In production, you would use Resend like this:
    // const { Resend } = require('resend');
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'noreply@yourdomain.com',
    //   to: email,
    //   subject: 'Your Login OTP',
    //   html: `<p>Your OTP is: <strong>${otp}</strong></p><p>Valid for 2 minutes.</p>`
    // });

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      // In development, return OTP for testing
      ...(process.env.NODE_ENV === 'development' && { otp })
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
}

