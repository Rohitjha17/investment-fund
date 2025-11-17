# LakhDatar Fast Grow Pvt Ltd

Investment firm management system built with Next.js and Node.js.

## Features

- Firebase-backed member, deposit, withdrawal, return, and referral data
- Email + password login protected with per-login email OTP
- Forgot password flow with OTP verification
- 30-day interest cycle with automatic monthly calculations
- Referral income tracking per month
- Master sheet with month switching and Excel export
- Testing panel removed (automatic monthly job handles calculations)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a Firebase project and generate service-account credentials.

3. Configure environment variables (create `.env.local`):

```
# Firebase Admin (server)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@example.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"

# Firebase Client (used on login page if needed later)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# SMTP for OTP + reset emails
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=465
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=super-secret
SMTP_FROM_EMAIL="LakhDatar Admin <no-reply@yourdomain.com>"
```

4. Run development server:
```bash
npm run dev
```

All application data is stored in Firebase Firestore; nothing is persisted locally.

## Default Login

- Email: `admin@example.com`
- Password: `admin123`
- OTP: delivered to the email above on every login

