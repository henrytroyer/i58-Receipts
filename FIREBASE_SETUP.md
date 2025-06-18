# Firebase Setup Guide

## To complete the Firebase Google Auth setup:

### 1. Get Firebase Configuration
You need to get your Firebase configuration from the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `i58-receipts-1a44d`
3. Go to Project Settings (gear icon)
4. Scroll down to "Your apps" section
5. Click on the web app or create one if it doesn't exist
6. Copy the configuration object

### 2. Update Firebase Config
Replace the placeholder values in `src/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "i58-receipts-1a44d.firebaseapp.com",
  projectId: "i58-receipts-1a44d",
  storageBucket: "i58-receipts-1a44d.appspot.com",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

### 3. Enable Google Auth in Firebase
1. In Firebase Console, go to Authentication
2. Click "Get started" or "Sign-in method"
3. Enable Google as a sign-in provider
4. Configure the OAuth consent screen if needed

### 4. Backend API Updates Needed
The following API endpoints need to be implemented in your Apps Script backend:

1. **getUserReceipts** - Get all receipts for a specific user
2. **updateReceipt** - Update a receipt (with user permission check)
3. **deleteReceipt** - Delete a receipt (with user permission check)
4. **submitReceipt** - Update to include user information

### 5. Database Schema Updates
Your spreadsheet needs additional columns:
- `userEmail` - Email of the user who submitted the receipt
- `userName` - Display name of the user
- `receiptId` - Unique identifier for each receipt (for editing)

## Current Implementation Status:
✅ Frontend authentication components
✅ Sign-in/Sign-out functionality  
✅ Mobile hamburger menu
✅ Desktop sidebar integration
✅ Edit receipts UI
✅ User context management
✅ Route protection

🔄 Backend API endpoints (need to be implemented)
🔄 Firebase configuration (needs actual values)
🔄 Database schema updates (need to be implemented) 