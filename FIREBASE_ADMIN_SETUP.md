## Firebase Admin Setup (Vercel)

Server-side API routes ab Firebase Admin SDK use karte hain. Vercel me ye env variables zaroor set karein:

| Variable | Description |
| -------- | ----------- |
| `FIREBASE_ADMIN_PROJECT_ID` | Usually same as `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service account private key (replace newlines with `\n`) |

### Steps
1. Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key**
3. Copy `project_id`, `client_email`, `private_key`
4. In Vercel → Settings → Environment Variables, add above vars (Production + Preview + Development)
5. For `FIREBASE_ADMIN_PRIVATE_KEY`, paste value and replace actual newlines with `\n`
6. Redeploy project

Without these vars Firebase Admin default credentials use honge jo Vercel me kaam nahi karte.

