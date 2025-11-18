import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    try {
      // Send password reset email using Firebase Auth
      const actionCodeSettings = {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);

      return res.status(200).json({
        success: true,
        message: 'Password reset email sent. Please check your inbox.'
      });
    } catch (error: any) {
      // Don't reveal if user exists or not for security
      if (error.code === 'auth/user-not-found') {
        return res.status(200).json({
          success: true,
          message: 'If an account exists, a password reset email has been sent.'
        });
      }
      
      console.error('Error sending password reset:', error);
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }
  } catch (error: any) {
    console.error('Error in forgot password:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

