import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendSignInLinkToEmail, signOut } from 'firebase/auth';

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
      // Sign in user to verify credentials
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified (existing check remains)
      if (!user.emailVerified) {
        await user.reload();
        if (!user.emailVerified) {
          return res.status(403).json({
            error: 'Please verify your email address first.',
            emailVerified: false,
            message: 'Please verify your email before logging in.',
            resendEmail: true
          });
        }
      }

      // ✅ NEW: Send sign-in link to email
      const actionCodeSettings = {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-production-domain.vercel.app'}/verify-login`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      // ✅ NEW: Sign out immediately after sending link
      await signOut(auth);

      // ✅ NEW: Return response indicating email link was sent
      return res.status(200).json({
        success: true,
        authenticated: false,
        emailLinkSent: true,
        message: 'Login link sent to your email. Please check your inbox and click the link to complete login.',
        email: email
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
