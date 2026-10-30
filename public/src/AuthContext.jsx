import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged, signOut, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// Creates/updates the profile. Never writes "role"/"blocked" — rules would reject it anyway.
async function saveProfile(user, extra = {}) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid, name: user.displayName || extra.name || "", email: user.email,
    photoURL: user.photoURL || "", lastLoginAt: serverTimestamp(), ...extra,
  }, { merge: true });
}
const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRedirectResult(auth).then((r) => r?.user && saveProfile(r.user)).catch(() => {});
    let offProfile = () => {};
    const off = onAuthStateChanged(auth, async (u) => {
      offProfile(); setUser(u); setProfile(null); setIsAdmin(false);
      if (u) {
        try { setIsAdmin((await getDoc(doc(db, "admins", u.uid))).exists()); } catch { setIsAdmin(false); }
        offProfile = onSnapshot(doc(db, "users", u.uid), (d) => setProfile(d.exists() ? d.data() : null), () => {});
      }
      setLoading(false);
    });
    return () => { off(); offProfile(); };
  }, []);

  const loginGoogle = async () => {
    if (isMobile()) return signInWithRedirect(auth, googleProvider);
    const { user } = await signInWithPopup(auth, googleProvider); await saveProfile(user);
  };
  const register = async ({ name, email, password }) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    await saveProfile(user, { name, createdAt: serverTimestamp() });
  };
  const loginEmail = async ({ email, password }) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password); await saveProfile(user);
  };
  return (
    <Ctx.Provider value={{ user, profile, isAdmin, loading, loginGoogle, register, loginEmail,
      resetPassword: (e) => sendPasswordResetEmail(auth, e), logout: () => signOut(auth) }}>
      {children}
    </Ctx.Provider>
  );
}
