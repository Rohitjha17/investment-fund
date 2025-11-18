import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendEmailVerification, sendSignInLinkToEmail, signOut } from 'firebase/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, linkToken } = req.body;

    if (linkToken) {
      if (typeof linkToken !== 'string' || linkToken.length < 20) {
        return res.status(400).json({ error: 'Invalid login token' });
      }

      res.setHeader('Set-Cookie', `auth_token=${linkToken}; HttpOnly; Path=/; SameSite=Strict`);
      return res.status(200).json({
        success: true,
        authenticated: true,
        linkLogin: true
      });
    }

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

      // Send email sign-in link and sign the user out immediately
      const protocol =
        (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() ||
        (req.headers.referer?.startsWith('https') ? 'https' : 'http');
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

      const actionCodeSettings = {
        url: `${baseUrl}/verify-login?email=${encodeURIComponent(email)}`,
        handleCodeInApp: true
      };

      try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      } catch (linkError: any) {
        if (linkError?.code === 'auth/operation-not-allowed') {
          console.error('Email link sign-in is not enabled in Firebase project.');
          return res.status(500).json({
            error: 'Email link sign-in is disabled in Firebase Auth. Please enable "Email link (passwordless sign-in)" for the Email/Password provider.'
          });
        }
        console.error('Error sending login link:', linkError);
        return res.status(500).json({ error: 'Failed to send secure login link. Please try again later.' });
      }

      await signOut(auth);

      return res.status(200).json({
        success: true,
        authenticated: false,
        linkSent: true,
        message: 'Secure login link sent to your email. Please open it to finish signing in.'
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
