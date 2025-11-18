# Firestore Security Rules Setup

## ⚠️ IMPORTANT: Vercel Deployment Issue

The error you're seeing (`Missing or insufficient permissions`) is because Firestore security rules need to be configured properly.

## 🔧 Fix Steps

### 1. Go to Firebase Console
1. Open https://console.firebase.google.com/
2. Select your project: **investment-794cc**
3. Go to **Firestore Database** → **Rules** tab

### 2. Update Security Rules

Copy and paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write all documents
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Click "Publish"** to save the rules.

### 3. For Development/Testing (Optional - Less Secure)

If you want to allow unauthenticated access temporarily for testing (NOT recommended for production):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all read/write (development only)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **WARNING**: Only use the second rule for testing. Change back to authenticated-only for production.

### 4. Verify Authentication Setup

1. Go to **Authentication** → **Sign-in method**
2. Make sure **Email/Password** is enabled
3. Go to **Settings** → **Authorized domains**
4. Add your Vercel domain:
   - `investment-fund-three.vercel.app`
   - `investment-fund-three.vercel.app` (with www if needed)

### 5. Test After Deployment

1. Deploy on Vercel
2. Open your Vercel URL
3. Try to create an account and login
4. After login, try adding a member

## 🔍 Why This Error Happens

- Firestore security rules require authentication by default
- Client-side code tries to access Firestore before user logs in
- API routes on Vercel need proper auth context
- The security rules above fix this by allowing authenticated users

## ✅ Expected Behavior After Fix

1. User must login first (email verification required)
2. After login, Firestore operations work
3. No permission errors in console
4. Members can be added/edited
5. Data displays correctly

## 📝 Notes

- **Production**: Use authenticated-only rules (`request.auth != null`)
- **Development**: You can temporarily allow all access
- **Always**: Test with real authentication before going live

