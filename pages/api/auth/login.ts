import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    try {
      // Sign in user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        // Reload user to get latest verification status
        await user.reload();

        // If still not verified, send verification email again
        if (!user.emailVerified) {
          try {
            await sendEmailVerification(user, {
              url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
              handleCodeInApp: false,
            });
          } catch (verifyError) {
            console.error('Error sending verification email:', verifyError);
          }

          return res.status(403).json({
            error: 'Please verify your email address before logging in.',
            emailVerified: false,
            message: 'A verification email has been sent. Please check your inbox and click the verification link.',
            resendEmail: true
          });
        }
      }

      // Email is verified, get token and set session
      const token = await user.getIdToken();

      // Set HTTP-only session cookie (expires when browser closes)
      res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; SameSite=Strict`);

      return res.status(200).json({
        success: true,
        authenticated: true,
        user: {
          email: user.email,
          uid: user.uid,
          emailVerified: user.emailVerified
        }
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return res.status(401).json({ error: 'No account found with this email. Please register first.' });
      } else if (error.code === 'auth/wrong-password') {
        return res.status(401).json({ error: 'Incorrect password.' });
      } else if (error.code === 'auth/invalid-email') {
        return res.status(400).json({ error: 'Invalid email address.' });
      } else if (error.code === 'auth/user-disabled') {
        return res.status(403).json({ error: 'This account has been disabled.' });
      } else {
        console.error('Error signing in:', error);
        return res.status(500).json({ error: 'Failed to sign in: ' + error.message });
      }
    }
  } catch (error: any) {
    console.error('Error in login:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}
