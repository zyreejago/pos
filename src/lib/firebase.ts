
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZbkWw_6lNxvzpYtVO1fjz8gfFh-ZOyhA",
  authDomain: "poss-b0c1a.firebaseapp.com",
  projectId: "poss-b0c1a",
  storageBucket: "poss-b0c1a.appspot.com", // Corrected a typo: .firebasestorage.app to .appspot.com which is more common for storageBucket
  messagingSenderId: "960224107625",
  appId: "1:960224107625:web:2962928ccdddf46c75d6f8",
  measurementId: "G-FW6EZS3BY4"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
