# LakhDatar Fast Grow Pvt Ltd

Investment firm management system built with Next.js, TypeScript, and Firebase.

## 🌟 Features

- **Member Management** - Add, edit, delete members with unique codes
- **Deposit & Withdrawal Tracking** - Track all transactions
- **Interest Calculation** - Automatic 30-day cycle interest calculation
- **Referral Income** - Calculate referral commissions
- **Master Sheet** - View all returns with Excel export
- **Email Authentication** - Secure login with email verification
- **Cloud Storage** - All data stored in Firebase Firestore
- **Real-time Sync** - Changes sync across all devices

## 🚀 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore (Cloud)
- **Authentication**: Firebase Authentication (Email/Password)
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ installed
- Firebase project created
- Firebase Firestore enabled
- Firebase Authentication enabled

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Firestore Database** (Start in production mode)
3. Enable **Authentication** (Email/Password provider)
4. Get your Firebase configuration

### 3. Environment Variables

Create `.env.local` file in project root:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Initialize Firestore

Run the development server:

```bash
npm run dev
```

The database will auto-initialize on first use. Or manually initialize:

```bash
POST http://localhost:3000/api/init-firestore
Body: { "migrate": false }
```

### 5. Firestore Security Rules

Go to Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📚 Usage

### First Time Login

1. Open `http://localhost:3000`
2. Click **"Create Account"**
3. Enter email and password (min 6 characters)
4. Check your email for verification link
5. Click verification link to verify email
6. Login with email and password

### Features

- **Dashboard**: View all members, search, filter
- **Add Member**: Create new member with deposit details
- **Member Profile**: View member details, add deposits/withdrawals
- **Master Sheet**: View all returns, export to Excel by month
- **Transactions**: View all transactions (deposits, withdrawals, returns)
- **Automatic Returns**: Returns calculated automatically on 2nd of each month

### Excel Export

1. Go to **Master Sheet**
2. Select month from dropdown
3. Click **"Download Excel Sheet"**
4. File downloads: `Returns_MonthName_Year.xlsx`

## 📊 Database Structure

See [FIRESTORE_STRUCTURE.md](./FIRESTORE_STRUCTURE.md) for detailed database schema.

**Collections**:
- `members` - All member information
- `deposits` - Deposit transactions
- `withdrawals` - Withdrawal transactions
- `returns` - Return/interest payments
- `calculated_months` - Track calculated months
- `system` - System configuration

## 🔐 Authentication

- **Login**: Email + Password (email must be verified)
- **Register**: Email + Password → Verification email sent
- **Forgot Password**: Send password reset link
- **Email Verification**: Required before login

## 📝 Data Storage

- **All data** stored in Firebase Firestore (cloud)
- **No local files** needed
- **Automatic backups** handled by Firebase
- **Real-time sync** across all devices

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables (Production)

Add all `NEXT_PUBLIC_*` variables in Vercel Dashboard → Settings → Environment Variables

## 📖 Documentation

- [Firebase Setup Guide](./FIREBASE_SETUP.md)
- [Firestore Structure](./FIRESTORE_STRUCTURE.md)

## 🐛 Troubleshooting

### "Permission denied" error
- Check Firestore Security Rules
- Ensure user is authenticated
- Verify rules allow read/write for authenticated users

### Email verification not working
- Check Firebase Authentication settings
- Verify email provider is enabled
- Check spam folder for verification email

### Data not syncing
- Check internet connection
- Verify Firebase configuration
- Check browser console for errors

## 📄 License

Private - LakhDatar Fast Grow Pvt Ltd

## 👥 Support

For issues or questions, contact the development team.

---

**Version**: 2.0.0  
**Last Updated**: November 2025
