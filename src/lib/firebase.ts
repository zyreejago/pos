
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore, serverTimestamp } from 'firebase/firestore'; // Added serverTimestamp

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZbkWw_6lNxvzpYtVO1fjz8gfFh-ZOyhA",
  authDomain: "poss-b0c1a.firebaseapp.com",
  projectId: "poss-b0c1a",
  storageBucket: "poss-b0c1a.firebasestorage.app",
  messagingSenderId: "960224107625",
  appId: "1:960224107625:web:2962928ccdddf46c75d6f8",
  measurementId: "G-FW6EZS3BY4"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

let analytics;
if (typeof window !== 'undefined') {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized");
    } else {
      console.log("Firebase Analytics not supported in this environment.");
    }
  }).catch(err => {
    console.error("Error checking Firebase Analytics support:", err);
  });
}

export { app, auth, db, analytics, serverTimestamp }; // Exported serverTimestamp
