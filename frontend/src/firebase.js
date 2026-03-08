import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "vectr-de136.firebaseapp.com",
  projectId: "vectr-de136",
  storageBucket: "vectr-de136.firebasestorage.app",
  messagingSenderId: "466866384755",
  appId: "1:466866384755:web:03ab6493d9b59d3f5adf06",
  measurementId: "G-QZQVS03FHM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogleFirebase = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    const user = result.user;
    return { user, idToken };
  } catch (error) {
    console.error("Firebase Auth Error", error);
    throw error;
  }
};
