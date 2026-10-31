import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDUpimW8WGTuyRbbVu6gSNyRM39kSCjfR8",
  authDomain: "my-first-web-ea0e2.firebaseapp.com",
  projectId: "my-first-web-ea0e2",
  storageBucket: "my-first-web-ea0e2.firebasestorage.app",
  messagingSenderId: "120012660239",
  appId: "1:120012660239:web:53f62fff8f33a0804f8d7a",
  measurementId: "G-0GBDPQ2P3C",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
setPersistence(auth, browserLocalPersistence).catch(() => {});
