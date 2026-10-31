import { useState } from "react";
import { Link } from "react-router-dom";
import { addDoc, collection, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { useSettings, useToast, useQ, Badge, dt } from "../utils";

export function About() {
  return (
    <main className="page"><div className="card" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", alignItems: "center" }}>
      <img src="/napas.png" alt="NAPAS" style={{ width: "100%", maxWidth: 300, margin: "0 auto" }} />
      <div><h2>NAPAS</h2><p>Web Developer &amp; Instructor — NAPAS AI LAB।</p>
        <p>আমার লক্ষ্য: একদম নতুনদেরও হাতে-কলমে প্রজেক্টের মাধ্যমে ওয়েব ডেভেলপমেন্ট শেখানো, যাতে তারা নিজে প্রফেশনাল ওয়েবসাইট বানাতে পারে।</p>
        <Link className="btn" to="/courses">কোর্স দেখুন</Link></div>
    </div></main>
  );
}

export function YouTube() {
  const s = useSettings();
  return (
    <main className="page"><div className="card"><h2>YouTube — NAPAS AI LAB</h2>
      <p>ফ্রি টিউটোরিয়াল ও আপডেটের জন্য চ্যানেলে সাবস্ক্রাইব করুন।</p>
      <div className="row"><a className="btn" href={s.youtube} target="_blank" rel="noreferrer">Open YouTube</a>
        <a className="btn ghost" href={s.telegram} target="_blank" rel="noreferrer">Telegram</a></div></div></main>
  );
}

export function Contact() {
  const s = useSettings(); const { user } = useAuth(); const toast = useToast();
  const [f, setF] = useState({ subject: "", message: "" }); const [busy, setBusy] = useState(false);
  const tickets = useQ(() => user && query(collection(db, "supportTickets"), where("uid", "==", user.uid)), [user?.uid]);
  const send = async (e) => {
    e.preventDefault();
    if (f.message.trim().length < 5) return toast("মেসেজ লিখুন", "err");
    setBusy(true);
    try {
      await addDoc(collection(db, "supportTickets"), { uid: user.uid, name: user.displayName || "", email: user.email, subject: f.subject.trim() || "Support", message: f.message.trim(), status: "open", createdAt: serverTimestamp() });
      setF({ subject: "", message: "" }); toast("মেসেজ পাঠানো হয়েছে ✅");
    } catch { toast("পাঠানো যায়নি, আবার চেষ্টা করুন", "err"); } finally { setBusy(false); }
  };
  return (
    <main className="page">
      <div className="card"><h2>Contact</h2><div className="row">
        <a className="btn" href={s.whatsappLink} target="_blank" rel="noreferrer">WhatsApp {s.whatsapp}</a>
        <a className="btn ghost" href={s.telegram} target="_blank" rel="noreferrer">Telegram</a>
        <a className="btn ghost" href={s.youtube} target="_blank" rel="noreferrer">YouTube</a></div></div>
      <div className="card"><h3>Support Message</h3>
        {!user ? <p>মেসেজ পাঠাতে <Link to="/login?next=/contact">লগইন করুন</Link>।</p> : (
          <form onSubmit={send}><label>বিষয়</label><input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
            <label>মেসেজ</label><textarea rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
            <p><button className="btn" disabled={busy}>{busy ? "পাঠানো হচ্ছে…" : "Send"}</button></p></form>)}
      </div>
      {user && tickets.data.length > 0 && <div className="card"><h3>আপনার মেসেজ</h3>
        {tickets.data.map((t) => <div key={t.id} style={{ borderTop: "1px solid #fff2", padding: "8px 0" }}>
          <b>{t.subject}</b> <Badge v={t.reply ? "replied" : "open"} /> <span className="mini">{dt(t.createdAt)}</span>
          <p>{t.message}</p>{t.reply && <p className="note ok">অ্যাডমিন: {t.reply}</p>}</div>)}</div>}
    </main>
  );
}
