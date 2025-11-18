import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user, {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
        handleCodeInApp: false,
      });

      // Get ID token for session
      const token = await user.getIdToken();

      // Set HTTP-only session cookie (expires when browser closes)
      res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; SameSite=Strict`);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          email: user.email,
          uid: user.uid,
          emailVerified: user.emailVerified
        },
        emailVerificationSent: true
      });
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        return res.status(400).json({ error: 'This email is already registered. Please login instead.' });
      } else if (error.code === 'auth/weak-password') {
        return res.status(400).json({ error: 'Password is too weak. Please use a stronger password.' });
      } else if (error.code === 'auth/invalid-email') {
        return res.status(400).json({ error: 'Invalid email address.' });
      } else {
        console.error('Error creating account:', error);
        return res.status(500).json({ error: 'Failed to create account: ' + error.message });
      }
    }
  } catch (error: any) {
    console.error('Error in register:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

