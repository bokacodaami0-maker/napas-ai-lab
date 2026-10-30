import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./auth.css";

const ERR = {
  "auth/invalid-credential": "ইমেইল বা পাসওয়ার্ড ভুল।",
  "auth/user-not-found": "এই ইমেইলে কোনো অ্যাকাউন্ট নেই।",
  "auth/wrong-password": "পাসওয়ার্ড ভুল।",
  "auth/email-already-in-use": "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে।",
  "auth/weak-password": "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।",
  "auth/invalid-email": "ইমেইল ঠিকভাবে লিখুন।",
  "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে, একটু পরে আবার চেষ্টা করুন।",
  "auth/popup-closed-by-user": "Google উইন্ডো বন্ধ করা হয়েছে।",
  "auth/network-request-failed": "ইন্টারনেট সংযোগ চেক করুন।",
  "auth/unauthorized-domain": "এই ডোমেইন Firebase → Authorized domains-এ যোগ করুন।",
};

// mode: "login" | "register" | "forgot"
export default function AuthPage({ initialMode = "login" }) {
  const { loginGoogle, loginEmail, register, resetPassword } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [mode, setMode] = useState(sp.get("mode") || initialMode);
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {type:"ok"|"err", text}

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const run = async (fn, okText, goHome = true) => {
    setBusy(true); setMsg(null);
    try {
      await fn();
      if (okText) setMsg({ type: "ok", text: okText });
      if (goHome) nav(sp.get("next") || "/");
    } catch (e) {
      setMsg({ type: "err", text: ERR[e.code] || "সমস্যা হয়েছে, আবার চেষ্টা করুন।" });
    } finally { setBusy(false); }
  };

  const submit = (e) => {
    e.preventDefault();
    if (mode === "login") run(() => loginEmail(f));
    else if (mode === "register") {
      if (f.name.trim().length < 2) return setMsg({ type: "err", text: "আপনার নাম লিখুন।" });
      run(() => register(f));
    } else run(() => resetPassword(f.email), "পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে (Spam ফোল্ডারও দেখুন)।", false);
  };

  const title = { login: "স্বাগতম", register: "নতুন অ্যাকাউন্ট", forgot: "পাসওয়ার্ড রিসেট" }[mode];

  return (
    <main className="auth-wrap">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>{title}</h1>

        {mode === "register" && (
          <input placeholder="পুরো নাম" autoComplete="name" value={f.name} onChange={set("name")} />
        )}
        <input type="email" placeholder="Email Address" autoComplete="email" value={f.email} onChange={set("email")} required />
        {mode !== "forgot" && (
          <div className="pw">
            <input type={show ? "text" : "password"} placeholder="Password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={f.password} onChange={set("password")} required />
            <button type="button" onClick={() => setShow(!show)} aria-label="Show password">{show ? "🙈" : "👁"}</button>
          </div>
        )}

        {mode === "login" && (
          <button type="button" className="link right" onClick={() => { setMode("forgot"); setMsg(null); }}>
            পাসওয়ার্ড ভুলে গেছেন?
          </button>
        )}

        {msg && <p className={`note ${msg.type}`} role="alert">{msg.text}</p>}

        <button className="primary" disabled={busy}>
          {busy ? "অপেক্ষা করুন…" : { login: "Sign In", register: "Create Account", forgot: "Send Reset Link" }[mode]}
        </button>

        {mode !== "forgot" && (
          <>
            <div className="or"><span>OR CONTINUE WITH</span></div>
            <button type="button" className="google" disabled={busy} onClick={() => run(loginGoogle)}>
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
              Continue with Google
            </button>
          </>
        )}

        <p className="switch">
          {mode === "login" && <>অ্যাকাউন্ট নেই? <button type="button" className="link" onClick={() => { setMode("register"); setMsg(null); }}>Register</button></>}
          {mode !== "login" && <>আগে থেকেই অ্যাকাউন্ট আছে? <button type="button" className="link" onClick={() => { setMode("login"); setMsg(null); }}>Sign In</button></>}
        </p>
      </form>
    </main>
  );
}
