import { NextApiRequest, NextApiResponse } from 'next';
import { db, Timestamp } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Get OTP from Firestore
    const otpDocRef = doc(db, 'otp_codes', email);
    const otpDoc = await getDoc(otpDocRef);

    if (!otpDoc.exists()) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    const otpData = otpDoc.data();

    // Check if OTP is already verified
    if (otpData.verified) {
      return res.status(400).json({ error: 'OTP already used' });
    }

    // Check if OTP is expired
    const now = Timestamp.now();
    if (otpData.expiresAt.toMillis() < now.toMillis()) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark OTP as verified
    await updateDoc(otpDocRef, {
      verified: true,
      verifiedAt: Timestamp.now()
    });

    // Create simple session token (just use email as token for simplicity)
    const sessionToken = Buffer.from(JSON.stringify({ email, timestamp: Date.now() })).toString('base64');

    // Set HTTP-only session cookie
    res.setHeader('Set-Cookie', `otp_auth_token=${sessionToken}; HttpOnly; Path=/; SameSite=Strict`);

    return res.status(200).json({
      success: true,
      authenticated: true,
      email
    });
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
}

