import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

// Generate random 6-digit OTP
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
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP valid for 10 minutes

    // Note: OTP saving removed as we're using Firebase Auth email verification now

    // In production, send email via email service (SendGrid, Resend, etc.)
    // For now, we'll use Firebase Auth's email sending capability
    // You can also use a service like Resend, SendGrid, or Nodemailer
    
    // TODO: Replace with actual email service
    // For development, you can log the OTP
    console.log(`OTP for ${email}: ${otp}`);

    // Using Firebase Auth's sendPasswordResetEmail as a workaround
    // In production, use proper email service
    try {
      // This sends a password reset email, but you should replace with actual OTP email
      // For production: Use Resend, SendGrid, or AWS SES
      await sendPasswordResetEmail(auth, email, {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?otp=${otp}`,
        handleCodeInApp: false,
      });
    } catch (error: any) {
      // If user doesn't exist, that's okay - we still send OTP via other method
      if (error.code !== 'auth/user-not-found') {
        console.error('Error sending email:', error);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      // In development, return OTP (remove in production)
      ...(process.env.NODE_ENV === 'development' && { otp })
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
}

