
import { initializeApp, getApp, getApps } from 'firebase/app';
// import { getAuth } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZbkWw_6lNxvzpYtVO1fjz8gfFh-ZOyhA", // Example, ensure this is from your .env or secure source if used
  authDomain: "poss-b0c1a.firebaseapp.com",
  projectId: "poss-b0c1a",
  storageBucket: "poss-b0c1a.appspot.com",
  messagingSenderId: "960224107625",
  appId: "1:960224107625:web:2962928ccdddf46c75d6f8",
  measurementId: "G-FW6EZS3BY4"
};

// Initialize Firebase (conditionally)
let app;
// if (typeof window !== 'undefined') { // Ensure Firebase only initializes on client-side for now
//   if (getApps().length === 0) {
//     app = initializeApp(firebaseConfig);
//   } else {
//     app = getApp();
//   }
// }

// const auth = app ? getAuth(app) : null;
// const db = app ? getFirestore(app) : null;

// Mock auth and db if not initialized or for testing without Firebase
const mockAuth = {
  currentUser: null,
  // Add other mock methods if needed by components
};

const mockDb = {
  // Add mock db methods if needed
};

const auth = mockAuth; // Use mockAuth
const db = mockDb; // Use mockDb

export { app, auth, db };
