import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_SETTINGS } from "./defaults";

const T = createContext(() => {});
export const useToast = () => useContext(T);
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const toast = useCallback((text, type = "ok") => { setT({ text, type }); setTimeout(() => setT(null), 3800); }, []);
  return <T.Provider value={toast}>{children}{t && <div className={`toast ${t.type}`} role="status">{t.text}</div>}</T.Provider>;
}

// Live Firestore query. factory() returns a query (or null); deps decide when to re-subscribe.
export function useQ(factory, deps) {
  const [s, setS] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    const q = factory();
    if (!q) { setS({ data: [], loading: false, error: null }); return; }
    setS((p) => ({ ...p, loading: true }));
    return onSnapshot(q,
      (sn) => setS({ data: sn.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      (error) => { console.error(error); setS({ data: [], loading: false, error }); });
    // eslint-disable-next-line
  }, deps);
  return s;
}

const SC = createContext(DEFAULT_SETTINGS);
export const useSettings = () => useContext(SC);
export function SettingsProvider({ children }) {
  const [s, setS] = useState(DEFAULT_SETTINGS);
  useEffect(() => onSnapshot(doc(db, "settings", "site"),
    (d) => d.exists() && setS({ ...DEFAULT_SETTINGS, ...d.data() }), () => {}), []);
  return <SC.Provider value={s}>{children}</SC.Provider>;
}

export const bdt = (n) => "৳" + Number(n || 0).toLocaleString("en-US");
export const dt = (ts) => (ts?.toDate ? ts.toDate().toLocaleDateString("en-GB") : "—");
export const Spinner = () => <div className="spin" aria-label="Loading" />;
export const Badge = ({ v }) => <span className={`badge b-${v}`}>{v}</span>;
