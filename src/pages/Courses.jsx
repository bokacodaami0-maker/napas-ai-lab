import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, query, where, doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { useQ, useSettings, useToast, Spinner, Badge, bdt } from "../utils";

const Poster = ({ c }) => <div className="poster">{c.posterUrl ? <img src={c.posterUrl} alt={c.title} /> : <span>{c.title}</span>}</div>;

export function Courses() {
  const { data, loading, error } = useQ(() => query(collection(db, "courses"), where("published", "==", true)), []);
  if (loading) return <Spinner />;
  return (
    <main className="page"><h2>Courses</h2>
      {error && <p className="note err">কোর্স লোড করা যায়নি। Firestore Rules ডিপ্লয় করা হয়েছে কি না দেখুন।</p>}
      {!error && data.length === 0 && <div className="card"><p>এখনো কোনো কোর্স প্রকাশিত হয়নি। (অ্যাডমিন: Admin → Courses থেকে “Default কোর্স তৈরি করুন” চাপুন।)</p></div>}
      <div className="grid">{data.map((c) => (
        <div className="card" key={c.id}><Poster c={c} /><h3>{c.title}</h3><p className="price">{bdt(c.price)}</p>
          <Link className="btn" to={`/course/${c.id}`}>View Details</Link></div>))}</div>
    </main>
  );
}

function Enroll({ course }) {
  const { user, profile } = useAuth(); const s = useSettings(); const toast = useToast();
  const oid = user ? `${user.uid}_${course.id}` : null;
  const [order, setOrder] = useState(undefined);
  const [f, setF] = useState({ studentName: user?.displayName || "", whatsapp: "", method: "bkash", trxId: "" });
  const [busy, setBusy] = useState(false);
  const load = async () => { if (!oid) return; try { const d = await getDoc(doc(db, "orders", oid)); setOrder(d.exists() ? d.data() : null); } catch { setOrder(null); } };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [oid]);

  if (!user) return <p><Link className="btn" to={`/login?next=/course/${course.id}`}>Login করে Enroll করুন</Link></p>;
  if (profile?.blocked) return <p className="note err">অ্যাকাউন্ট ব্লক থাকায় Enroll করা যাবে না।</p>;
  if (order === undefined) return <Spinner />;
  if (order && order.paymentStatus !== "rejected") return (
    <div className="note ok">আপনি ইতিমধ্যে এই কোর্সে Enroll করেছেন — Order <b>{order.orderNo}</b> · Payment <Badge v={order.paymentStatus} /> · Enrollment <Badge v={order.enrollmentStatus} />. <Link to="/my-orders">My Orders</Link></div>);

  const submit = async (e) => {
    e.preventDefault();
    const trxId = f.trxId.trim().toUpperCase();
    if (f.studentName.trim().length < 2) return toast("নাম লিখুন", "err");
    if (!/^01\d{9}$/.test(f.whatsapp.trim())) return toast("সঠিক WhatsApp নম্বর দিন (01XXXXXXXXX)", "err");
    if (trxId.length < 6) return toast("সঠিক Transaction ID দিন", "err");
    setBusy(true);
    try {
      const b = writeBatch(db);
      if (order?.paymentStatus === "rejected") { // re-submit after rejection
        b.update(doc(db, "orders", oid), { paymentStatus: "pending", trxId, method: f.method, updatedAt: serverTimestamp() });
        b.update(doc(db, "payments", oid), { status: "pending", trxId, method: f.method, updatedAt: serverTimestamp() });
      } else {
        const orderNo = "NAP-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
        const base = { uid: user.uid, orderNo, amount: course.price, method: f.method, trxId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        b.set(doc(db, "orders", oid), { ...base, courseId: course.id, courseTitle: course.title, studentName: f.studentName.trim(), email: user.email, whatsapp: f.whatsapp.trim(), paymentStatus: "pending", enrollmentStatus: "inactive", refundStatus: "none", cancelRequested: false });
        b.set(doc(db, "payments", oid), { ...base, orderId: oid, courseTitle: course.title, status: "pending" });
      }
      await b.commit(); toast("Order জমা হয়েছে। অ্যাডমিন যাচাই করবেন ✅"); await load();
    } catch (err) { console.error(err); toast("Order জমা হয়নি। Price/Rules/ইন্টারনেট চেক করুন।", "err"); } finally { setBusy(false); }
  };
  const num = f.method === "bkash" ? s.bkash : s.nagad;
  return (
    <form onSubmit={submit}>
      {order?.paymentStatus === "rejected" && <p className="note err">আগের পেমেন্ট Reject হয়েছে। সঠিক Transaction ID দিয়ে আবার জমা দিন।</p>}
      <label>Student Name</label><input value={f.studentName} onChange={(e) => setF({ ...f, studentName: e.target.value })} />
      <label>Email</label><input value={user.email} disabled />
      <label>WhatsApp Number</label><input inputMode="numeric" placeholder="01XXXXXXXXX" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />
      <label>Course</label><input value={course.title} disabled />
      <label>Payment Method</label>
      <select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option value="bkash">bKash</option><option value="nagad">Nagad</option></select>
      <p className="note ok">{num ? <>এই নম্বরে <b>{bdt(course.price)}</b> Send Money করুন: <b>{num}</b></> : "পেমেন্ট নম্বর এখনো সেট করা হয়নি — WhatsApp-এ যোগাযোগ করুন।"}<br />{s.paymentNote}</p>
      <label>Transaction ID</label><input value={f.trxId} onChange={(e) => setF({ ...f, trxId: e.target.value })} />
      <p><button className="btn" disabled={busy || !num}>{busy ? "জমা হচ্ছে…" : `Enroll — ${bdt(course.price)}`}</button></p>
    </form>
  );
}

export function CourseDetail() {
  const { id } = useParams(); const [c, setC] = useState(undefined); const [open, setOpen] = useState(0);
  useEffect(() => { getDoc(doc(db, "courses", id)).then((d) => setC(d.exists() ? { id: d.id, ...d.data() } : null)).catch(() => setC(null)); }, [id]);
  if (c === undefined) return <Spinner />;
  if (!c) return <main className="page"><div className="card"><h2>কোর্স পাওয়া যায়নি</h2><Link className="btn" to="/courses">Courses</Link></div></main>;
  return (
    <main className="page">
      <div className="card"><Poster c={c} /><h2>{c.title}</h2><p className="mini">{c.institution}</p><p>{c.description}</p><p className="price">{bdt(c.price)}</p>
        {c.videoUrl && <p><a className="btn ghost" href={c.videoUrl} target="_blank" rel="noreferrer">▶ Course Preview</a></p>}</div>
      <div className="card"><h3>Syllabus</h3>{(c.syllabus || []).map((m, i) => (
        <div className="acc" key={i}><button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>{m.title}<span>{open === i ? "−" : "+"}</span></button>
          {open === i && <ul>{m.items.map((x, j) => <li key={j}>{x}</li>)}</ul>}</div>))}</div>
      <div className="grid">
        <div className="card"><h3>Course Benefits</h3><ul>{(c.benefits || []).map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div className="card"><h3>Who Can Join?</h3><ul>{(c.audience || []).map((x) => <li key={x}>{x}</li>)}</ul></div></div>
      <div className="card"><h3>Enroll</h3><Enroll course={c} /></div>
    </main>
  );
}
