import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDic2h-JdfyLv9haLhIrJnNhEpye9LIw40",
  authDomain: "gen-lang-client-0151796653.firebaseapp.com",
  projectId: "gen-lang-client-0151796653",
  storageBucket: "gen-lang-client-0151796653.firebasestorage.app",
  messagingSenderId: "680660335709",
  appId: "1:680660335709:web:d451741371293e15a921b4"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom databaseId provided in config
const db = getFirestore(app, "ai-studio-130d67a8-6603-4b11-ac81-7165d2e4ea2f");

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };
