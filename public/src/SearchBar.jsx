import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./search.css";

// Every working page/function of the site. Add new items here and they appear in search automatically.
const ITEMS = [
  { label: "Home", desc: "হোম পেজ", to: "/", k: "home হোম main" },
  { label: "Courses", desc: "সব কোর্স দেখুন", to: "/courses", k: "course কোর্স class" },
  { label: "HTML & CSS Course", desc: "কোর্সের বিস্তারিত, সিলেবাস, এনরোল", to: "/course/html-css", k: "html css syllabus সিলেবাস enroll এনরোল buy price দাম" },
  { label: "About Me", desc: "আমার সম্পর্কে", to: "/about", k: "about napas instructor পরিচিতি" },
  { label: "YouTube", desc: "ইউটিউব চ্যানেল", to: "/youtube", k: "youtube video ভিডিও" },
  { label: "Login", desc: "Google / Email দিয়ে লগইন", to: "/login", k: "login sign in google email লগইন" },
  { label: "Register", desc: "নতুন অ্যাকাউন্ট", to: "/register", k: "register signup account রেজিস্টার" },
  { label: "Forgot Password", desc: "পাসওয়ার্ড রিসেট", to: "/login?mode=forgot", k: "forgot reset password পাসওয়ার্ড ভুলে" },
  { label: "My Orders", desc: "অর্ডার, ক্যান্সেল, রিফান্ড রিকোয়েস্ট", to: "/my-orders", k: "order অর্ডার refund রিফান্ড cancel track" },
  { label: "My Money", desc: "পেমেন্ট ও রিফান্ড হিস্ট্রি", to: "/my-money", k: "money payment bkash nagad পেমেন্ট টাকা transaction" },
  { label: "Contact", desc: "WhatsApp, Telegram, সাপোর্ট", to: "/contact", k: "contact whatsapp telegram support যোগাযোগ" },
  { label: "Admin Dashboard", desc: "শুধু অ্যাডমিনের জন্য", to: "/admin", k: "admin dashboard অ্যাডমিন", adminOnly: true },
];

export default function SearchBar({ isAdmin = false }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ITEMS.filter((i) => (isAdmin || !i.adminOnly) &&
      (!s || `${i.label} ${i.desc} ${i.k}`.toLowerCase().includes(s))).slice(0, 8);
  }, [q, isAdmin]);

  useEffect(() => {
    const off = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, []);

  const go = (item) => { if (!item) return; nav(item.to); setQ(""); setOpen(false); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((hi + 1) % Math.max(results.length, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((hi - 1 + results.length) % Math.max(results.length, 1)); }
    else if (e.key === "Enter") go(results[hi]);
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="sb" ref={box}>
      <div className="sb-field">
        <button className="sb-btn" aria-label="Search" onClick={() => go(results[hi])}>🔍</button>
        <input value={q} placeholder="Search anything…" onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setHi(0); setOpen(true); }} onKeyDown={onKey} />
      </div>
      {open && (
        <ul className="sb-list" role="listbox">
          {results.length === 0 && <li className="sb-empty">কিছু পাওয়া যায়নি</li>}
          {results.map((r, i) => (
            <li key={r.to} role="option" aria-selected={i === hi} className={i === hi ? "on" : ""}
              onMouseEnter={() => setHi(i)} onClick={() => go(r)}>
              <b>{r.label}</b><span>{r.desc}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
