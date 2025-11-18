# OTP Login System

## Overview
A simple Email OTP login system added to the existing authentication flow without modifying any existing login/signup functionality.

## Features
- ✅ **Separate OTP Login**: Independent from password-based login
- ✅ **6-Digit OTP**: Secure random code generation
- ✅ **2-Minute Expiry**: OTP expires after 2 minutes
- ✅ **Firestore Storage**: OTP stored in `otp_codes` collection
- ✅ **Session Token**: Simple session-based authentication
- ✅ **No Breaking Changes**: Existing auth flows remain untouched

## How It Works

### 1. Send OTP
- User enters email
- API generates 6-digit OTP
- OTP stored in Firestore with 2-minute expiry
- In development: OTP logged to console
- In production: Email sent via Resend

### 2. Verify OTP
- User enters 6-digit OTP
- API verifies OTP and expiry
- If valid: Creates session token and redirects to dashboard
- If invalid/expired: Shows error

## API Endpoints

### POST `/api/auth/otp-send`
**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "otp": "123456" // Only in development
}
```

### POST `/api/auth/otp-verify`
**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "authenticated": true,
  "email": "user@example.com"
}
```

## Firestore Structure

### Collection: `otp_codes`
Document ID: `{email}`
```javascript
{
  email: "user@example.com",
  otp: "123456",
  expiresAt: Timestamp, // 2 minutes from creation
  createdAt: Timestamp,
  verified: false
}
```

## UI Flow

1. **Login Page**: User sees "🔐 Login with OTP" button below password login
2. **Send OTP**: User enters email → OTP sent
3. **Verify OTP**: User enters 6-digit code → Verified → Dashboard
4. **Resend**: User can resend OTP if needed
5. **Back**: User can switch back to password login anytime

## Development Mode

In development, OTP is:
- Logged to console
- Returned in API response
- Visible in browser console

## Production Setup

### Using Resend

1. **Install Resend** (already installed):
```bash
npm install resend
```

2. **Get API Key**:
- Go to https://resend.com
- Create account
- Get API key

3. **Add Environment Variable**:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

4. **Uncomment in `/api/auth/otp-send.ts`**:
```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: email,
  subject: 'Your Login OTP',
  html: `<p>Your OTP is: <strong>${otp}</strong></p><p>Valid for 2 minutes.</p>`
});
```

## Security Notes

1. **OTP Expiry**: 2 minutes (configurable)
2. **One-Time Use**: OTP marked as verified after use
3. **Session Token**: Stored in HTTP-only cookie
4. **Token Validation**: Checked in auth middleware

## Testing

### Development Testing
1. Start dev server: `npm run dev`
2. Go to login page
3. Click "🔐 Login with OTP"
4. Enter email
5. Check console for OTP
6. Enter OTP
7. Should redirect to dashboard

### Production Testing
1. Configure Resend API key
2. Uncomment email sending code
3. Test with real email
4. Verify OTP delivery

## No Breaking Changes

- ✅ Password login works as before
- ✅ Email/password registration works as before
- ✅ Forgot password works as before
- ✅ Email verification works as before
- ✅ All existing routes unchanged
- ✅ All existing components unchanged

## Files Modified

1. `pages/index.tsx` - Added OTP login UI
2. `pages/api/auth/check.ts` - Added OTP token validation
3. `pages/api/auth/otp-send.ts` - New API route
4. `pages/api/auth/otp-verify.ts` - New API route
5. `package.json` - Added Resend dependency

## Firestore Rules

Make sure your Firestore rules allow reading/writing OTP codes:

```javascript
match /otp_codes/{email} {
  allow read, write: if true; // Adjust based on your security needs
}
```

## Future Enhancements

- [ ] Rate limiting on OTP sending
- [ ] IP-based throttling
- [ ] SMS OTP option
- [ ] Email templates
- [ ] Admin panel for OTP logs
- [ ] Analytics dashboard

