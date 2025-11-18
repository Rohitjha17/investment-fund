import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, otp, password } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Verify OTP
    const isValid = await db.verifyOTP(email, otp);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // OTP verified - now create or sign in user
    try {
      // Try to sign in first (user exists)
      const userCredential = await signInWithEmailAndPassword(auth, email, password || 'tempPassword123');
      
      // Set session cookie or token
      const token = await userCredential.user.getIdToken();
      
      // Set HTTP-only session cookie (expires when browser closes)
      res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; SameSite=Strict`);
      
      return res.status(200).json({
        success: true,
        authenticated: true,
        user: {
          email: userCredential.user.email,
          uid: userCredential.user.uid
        }
      });
    } catch (error: any) {
      // If user doesn't exist and password provided, create new user
      if (error.code === 'auth/user-not-found' && password) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const token = await userCredential.user.getIdToken();
          
          res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`);
          
          return res.status(200).json({
            success: true,
            authenticated: true,
            user: {
              email: userCredential.user.email,
              uid: userCredential.user.uid
            }
          });
        } catch (createError: any) {
          return res.status(400).json({ error: 'Failed to create account: ' + createError.message });
        }
      } else if (error.code === 'auth/wrong-password') {
        return res.status(400).json({ error: 'Invalid password' });
      } else {
        return res.status(400).json({ error: 'Authentication failed: ' + error.message });
      }
    }
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
}

