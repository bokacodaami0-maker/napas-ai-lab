import { useMemo, useState } from "react";
import { collection, doc, writeBatch, setDoc, addDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../AuthContext";
import { useQ, useToast, useSettings, Spinner, Badge, bdt, dt } from "../utils";
import { DEFAULT_COURSE, DEFAULT_COURSE_ID } from "../defaults";

const TABS = ["Dashboard", "Orders", "Refunds", "Courses", "Users", "Notices", "Support", "Settings", "Audit Log"];
const col = (n) => query(collection(db, n));
const syllabusToText = (s = []) => s.map((m) => `${m.title}\n${m.items.map((i) => "- " + i).join("\n")}`).join("\n\n");
const textToSyllabus = (t) => t.split(/\n\s*\n/).map((blk) => { const L = blk.split("\n").map((x) => x.trim()).filter(Boolean); return { title: L[0], items: L.slice(1).map((x) => x.replace(/^-\s*/, "")) }; }).filter((m) => m.title);

export default function Admin() {
  const [tab, setTab] = useState("Dashboard");
  const { user } = useAuth(); const toast = useToast();
  const orders = useQ(() => col("orders"), []);
  const refunds = useQ(() => col("refunds"), []);
  const courses = useQ(() => col("courses"), []);
  const users = useQ(() => col("users"), []);

  // every admin write goes through here -> batch + audit log (atomic)
  const run = async (fn, action, target, okMsg = "সম্পন্ন ✅") => {
    try {
      const b = writeBatch(db); await fn(b);
      b.set(doc(collection(db, "auditLogs")), { adminUid: user.uid, adminEmail: user.email, action, target, createdAt: serverTimestamp() });
      await b.commit(); toast(okMsg);
    } catch (e) { console.error(e); toast("ব্যর্থ: " + (e.code || e.message), "err"); }
  };
  const P = { run, toast, orders: orders.data, refunds: refunds.data, courses: courses.data, users: users.data, user };
  if (orders.loading || courses.loading) return <Spinner />;
  return (
    <main className="page"><h2>Admin Dashboard</h2>
      <div className="admin">
        <div className="side">{TABS.map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}</div>
        <div style={{ minWidth: 0 }}>
          {tab === "Dashboard" && <Dash {...P} />}{tab === "Orders" && <Orders {...P} />}{tab === "Refunds" && <Refunds {...P} />}
          {tab === "Courses" && <Courses {...P} />}{tab === "Users" && <Users {...P} />}{tab === "Notices" && <Notices {...P} />}
          {tab === "Support" && <Support {...P} />}{tab === "Settings" && <Settings {...P} />}{tab === "Audit Log" && <Audit />}
        </div>
      </div>
    </main>
  );
}

function Dash({ orders, refunds, courses, users }) {
  const verified = orders.filter((o) => o.paymentStatus === "verified");
  const refunded = refunds.filter((r) => r.status === "completed").reduce((t, r) => t + r.amount, 0);
  const st = [["Total Users", users.length], ["Courses", courses.length], ["Total Orders", orders.length],
    ["Revenue (verified − refunded)", bdt(verified.reduce((t, o) => t + o.amount, 0) - refunded)],
    ["Pending Payments", orders.filter((o) => o.paymentStatus === "pending").length],
    ["Completed Orders", orders.filter((o) => o.enrollmentStatus === "completed").length],
    ["Cancelled Orders", orders.filter((o) => o.enrollmentStatus === "cancelled").length],
    ["Refund Requests", refunds.filter((r) => r.status === "requested").length]];
  return <div className="grid">{st.map(([a, b]) => <div className="card stat" key={a}>{b}<small>{a}</small></div>)}</div>;
}

function Orders({ orders, run }) {
  const [q, setQ] = useState("");
  const dup = useMemo(() => { const m = {}; orders.forEach((o) => { const k = `${o.method}:${o.trxId}`; m[k] = (m[k] || 0) + 1; }); return m; }, [orders]);
  const list = orders.filter((o) => !q || [o.orderNo, o.trxId, o.email, o.studentName].some((x) => (x || "").toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const set = (o, op, pp, label) => {
    if (!confirm(`${label}\n${o.orderNo} · ${o.trxId}`)) return;
    run((b) => { b.update(doc(db, "orders", o.id), { ...op, updatedAt: serverTimestamp() }); if (pp) b.update(doc(db, "payments", o.id), { ...pp, updatedAt: serverTimestamp() }); }, label, o.orderNo);
  };
  const openRefund = (o) => confirm(`REFUND: ${o.orderNo} এর Refund প্রক্রিয়া শুরু করবেন? (টাকা ফেরত না দেওয়া পর্যন্ত Completed হবে না)`) && run((b) => {
    b.update(doc(db, "orders", o.id), { refundStatus: "requested", updatedAt: serverTimestamp() });
    b.set(doc(db, "refunds", o.id), { uid: o.uid, orderId: o.id, orderNo: o.orderNo, courseTitle: o.courseTitle, amount: o.amount, reason: "Admin initiated", status: "requested", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }, "refund-open", o.orderNo);
  return (
    <div className="card"><input placeholder="Search Order ID / TrxID / email / name" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.map((o) => (
        <div key={o.id} style={{ borderTop: "1px solid #fff2", padding: "12px 0" }}>
          <b>{o.orderNo}</b> · {o.courseTitle} · <b>{bdt(o.amount)}</b> <span className="mini">{dt(o.createdAt)}</span>
          <div className="mini">{o.studentName} · {o.email} · {o.whatsapp}</div>
          <div>{o.method?.toUpperCase()} TrxID: <b>{o.trxId}</b> {dup[`${o.method}:${o.trxId}`] > 1 && <span className="note err">⚠ Duplicate TrxID</span>}</div>
          <div className="row">Payment <Badge v={o.paymentStatus} /> Enrollment <Badge v={o.enrollmentStatus} /> Refund <Badge v={o.refundStatus} />{o.cancelRequested && <Badge v="requested" />}</div>
          <p className="mini">⚠ Verify করার আগে bKash/Nagad অ্যাপে TrxID ও Amount মিলিয়ে দেখুন।</p>
          <div className="row">
            {o.paymentStatus !== "verified" && <button className="btn sm green" onClick={() => set(o, { paymentStatus: "verified", enrollmentStatus: "active" }, { status: "verified" }, "DONE: Payment Verify করে Enrollment চালু করবেন?")}>DONE (Verify)</button>}
            {o.paymentStatus === "pending" && <button className="btn sm red" onClick={() => set(o, { paymentStatus: "rejected", enrollmentStatus: "inactive" }, { status: "rejected" }, "Payment Reject করবেন?")}>Reject</button>}
            {o.enrollmentStatus === "active" && <button className="btn sm" onClick={() => set(o, { enrollmentStatus: "completed" }, null, "Order Completed করবেন?")}>Mark Completed</button>}
            {o.enrollmentStatus !== "cancelled" && <button className="btn sm amber" onClick={() => set(o, { enrollmentStatus: "cancelled", cancelRequested: false }, null, "CANCEL: Order বাতিল করবেন?")}>CANCEL</button>}
            {o.paymentStatus === "verified" && o.refundStatus === "none" && <button className="btn sm ghost" onClick={() => openRefund(o)}>REFUND</button>}
          </div>
        </div>))}
      {!list.length && <p>কোনো Order নেই</p>}
    </div>
  );
}

function Refunds({ refunds, run }) {
  const upd = (r, rs, os, label, extra = {}) => run((b) => {
    b.update(doc(db, "refunds", r.id), { status: rs, ...extra, updatedAt: serverTimestamp() });
    b.update(doc(db, "orders", r.orderId), { refundStatus: os, ...(os === "refunded" ? { enrollmentStatus: "cancelled" } : {}), updatedAt: serverTimestamp() });
  }, label, r.orderNo);
  const done = (r) => {
    const trx = prompt(`${bdt(r.amount)} সত্যিই student-কে ফেরত পাঠিয়েছেন?\nপাঠানোর Transaction ID লিখুন:`);
    if (!trx || trx.trim().length < 6) return alert("Refund TrxID ছাড়া Completed করা যাবে না।");
    upd(r, "completed", "refunded", "refund-completed", { refundTrxId: trx.trim().toUpperCase() });
  };
  return (
    <div className="card"><h3>Refund Requests</h3>
      {refunds.map((r) => (
        <div key={r.id} style={{ borderTop: "1px solid #fff2", padding: "10px 0" }}>
          <b>{r.orderNo}</b> · {r.courseTitle} · {bdt(r.amount)} <Badge v={r.status} />
          <p className="mini">কারণ: {r.reason}{r.refundTrxId && ` · Refund TrxID: ${r.refundTrxId}`}</p>
          <div className="row">
            {r.status === "requested" && <><button className="btn sm green" onClick={() => upd(r, "approved", "approved", "refund-approved")}>Approve</button>
              <button className="btn sm red" onClick={() => upd(r, "rejected", "rejected", "refund-rejected")}>Reject</button></>}
            {r.status === "approved" && <button className="btn sm" onClick={() => done(r)}>Mark Refund Completed (টাকা ফেরত দেওয়ার পর)</button>}
          </div>
        </div>))}
      {!refunds.length && <p>কোনো Refund Request নেই</p>}
    </div>
  );
}

function Courses({ courses, run, toast }) {
  const empty = { id: "", title: "", institution: "Napass AI Lab", price: 0, posterUrl: "", videoUrl: "", description: "", syllabusText: "", published: true };
  const [f, setF] = useState(null); const [busy, setBusy] = useState(false);
  const edit = (c) => setF({ ...empty, ...c, syllabusText: syllabusToText(c.syllabus) });
  const upload = async (file) => {
    if (!file) return; setBusy(true);
    try { const r = ref(storage, `public/posters/${Date.now()}_${file.name.replace(/[^\w.]/g, "_")}`); await uploadBytes(r, file); setF((p) => ({ ...p, posterUrl: "" })); const url = await getDownloadURL(r); setF((p) => ({ ...p, posterUrl: url })); toast("ছবি আপলোড হয়েছে"); }
    catch { toast("আপলোড হয়নি (Storage চালু ও Rules ডিপ্লয় আছে? না থাকলে ছবির URL পেস্ট করুন)", "err"); } finally { setBusy(false); }
  };
  const save = async (e) => {
    e.preventDefault();
    const id = f.id || f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "course-" + Date.now();
    const { syllabusText, id: _i, ...rest } = f;
    const data = { ...rest, price: Number(f.price), syllabus: textToSyllabus(syllabusText), benefits: f.benefits || DEFAULT_COURSE.benefits, audience: f.audience || DEFAULT_COURSE.audience, updatedAt: serverTimestamp() };
    if (!(data.price > 0)) return toast("সঠিক মূল্য দিন", "err");
    await run((b) => b.set(doc(db, "courses", id), data, { merge: true }), "course-save", id); setF(null);
  };
  return (
    <div className="card"><div className="row"><button className="btn sm" onClick={() => setF(empty)}>+ Add Course</button>
      {!courses.some((c) => c.id === DEFAULT_COURSE_ID) && <button className="btn sm ghost" onClick={() => run((b) => b.set(doc(db, "courses", DEFAULT_COURSE_ID), { ...DEFAULT_COURSE, createdAt: serverTimestamp() }), "course-seed", DEFAULT_COURSE_ID)}>Default কোর্স তৈরি করুন</button>}</div>
      {courses.map((c) => (
        <div key={c.id} style={{ borderTop: "1px solid #fff2", padding: "10px 0" }}><b>{c.title}</b> · {bdt(c.price)} <Badge v={c.published ? "active" : "inactive"} /> <span className="mini">/{c.id}</span>
          <div className="row"><button className="btn sm" onClick={() => edit(c)}>Edit</button>
            <button className="btn sm amber" onClick={() => run((b) => b.update(doc(db, "courses", c.id), { published: !c.published }), "course-toggle", c.id)}>{c.published ? "Unpublish" : "Publish"}</button>
            <button className="btn sm red" onClick={() => confirm(`"${c.title}" মুছে ফেলবেন?`) && run((b) => b.delete(doc(db, "courses", c.id)), "course-delete", c.id)}>Delete</button></div></div>))}
      {f && <form onSubmit={save} style={{ marginTop: 14 }}><h3>{f.id ? "Edit" : "New"} Course</h3>
        <label>Title</label><input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <label>Price (BDT)</label><input type="number" min="1" required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <label>Poster URL (অথবা নিচে ছবি আপলোড করুন)</label><input value={f.posterUrl} onChange={(e) => setF({ ...f, posterUrl: e.target.value })} />
        <input type="file" accept="image/*" onChange={(e) => upload(e.target.files[0])} />
        <label>Video URL</label><input value={f.videoUrl} onChange={(e) => setF({ ...f, videoUrl: e.target.value })} />
        <label>Description</label><textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <label>Syllabus (Module এর নাম এক লাইনে, নিচে “- টপিক”; Module-এর মাঝে ফাঁকা লাইন)</label><textarea rows={8} value={f.syllabusText} onChange={(e) => setF({ ...f, syllabusText: e.target.value })} />
        <label><input type="checkbox" style={{ width: "auto" }} checked={!!f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Published</label>
        <div className="row"><button className="btn" disabled={busy}>{busy ? "অপেক্ষা…" : "Save"}</button><button type="button" className="btn ghost" onClick={() => setF(null)}>Cancel</button></div></form>}
    </div>
  );
}

function Users({ users, orders, run }) {
  const [q, setQ] = useState(""); const [sel, setSel] = useState(null);
  const list = users.filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="card"><input placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.map((u) => (
        <div key={u.id} style={{ borderTop: "1px solid #fff2", padding: "10px 0" }}><b>{u.name || "—"}</b> · {u.email} {u.blocked && <Badge v="rejected" />}
          <div className="row"><button className="btn sm ghost" onClick={() => setSel(sel === u.id ? null : u.id)}>Details / Enrollments</button>
            <button className={`btn sm ${u.blocked ? "green" : "red"}`} onClick={() => confirm(u.blocked ? "Unblock?" : "Block?") && run((b) => b.update(doc(db, "users", u.id), { blocked: !u.blocked }), u.blocked ? "unblock" : "block", u.email)}>{u.blocked ? "Unblock" : "Block"}</button></div>
          {sel === u.id && <div className="note ok">UID: {u.uid}<br />Joined: {dt(u.createdAt)} · Last login: {dt(u.lastLoginAt)}<br />
            {orders.filter((o) => o.uid === u.id).map((o) => <div key={o.id}>{o.orderNo} — {o.courseTitle} — {o.paymentStatus}/{o.enrollmentStatus}</div>)}
            {!orders.some((o) => o.uid === u.id) && "কোনো Enrollment নেই"}</div>}
        </div>))}
    </div>
  );
}

function Notices({ run }) {
  const n = useQ(() => query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(50)), []);
  const [f, setF] = useState({ title: "", body: "" });
  return (
    <div className="card"><h3>নতুন Notice</h3>
      <input placeholder="শিরোনাম" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <textarea rows={3} placeholder="বিস্তারিত" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
      <p><button className="btn" onClick={() => f.title.trim() && run((b) => b.set(doc(collection(db, "notices")), { ...f, createdAt: serverTimestamp() }), "notice-add", f.title).then(() => setF({ title: "", body: "" }))}>Publish</button></p>
      {n.data.map((x) => <div key={x.id} style={{ borderTop: "1px solid #fff2", padding: "8px 0" }}><b>{x.title}</b> <span className="mini">{dt(x.createdAt)}</span><p>{x.body}</p>
        <button className="btn sm red" onClick={() => run((b) => b.delete(doc(db, "notices", x.id)), "notice-delete", x.title)}>Delete</button></div>)}
    </div>
  );
}

function Support({ run }) {
  const t = useQ(() => col("supportTickets"), []); const [r, setR] = useState({});
  return (
    <div className="card"><h3>Support Messages</h3>
      {[...t.data].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((x) => (
        <div key={x.id} style={{ borderTop: "1px solid #fff2", padding: "10px 0" }}><b>{x.subject}</b> · {x.name} ({x.email}) <Badge v={x.reply ? "replied" : "open"} /><p>{x.message}</p>
          {x.reply && <p className="note ok">উত্তর: {x.reply}</p>}
          <textarea rows={2} placeholder="উত্তর লিখুন" value={r[x.id] || ""} onChange={(e) => setR({ ...r, [x.id]: e.target.value })} />
          <button className="btn sm" onClick={() => (r[x.id] || "").trim() && run((b) => b.update(doc(db, "supportTickets", x.id), { reply: r[x.id].trim(), status: "replied", repliedAt: serverTimestamp() }), "ticket-reply", x.id)}>Reply</button></div>))}
      {!t.data.length && <p>কোনো মেসেজ নেই</p>}
    </div>
  );
}

function Settings({ toast, user }) {
  const s = useSettings(); const [f, setF] = useState({ ...s }); const [busy, setBusy] = useState(false);
  const k = (key, label) => <><label>{label}</label><input value={f[key] || ""} onChange={(e) => setF({ ...f, [key]: e.target.value })} /></>;
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await setDoc(doc(db, "settings", "site"), f, { merge: true }); await addDoc(collection(db, "auditLogs"), { adminUid: user.uid, adminEmail: user.email, action: "settings-save", target: "site", createdAt: serverTimestamp() }); toast("Settings সেভ হয়েছে ✅"); }
    catch { toast("সেভ হয়নি", "err"); } finally { setBusy(false); }
  };
  const logo = async (file) => { if (!file) return; try { const r = ref(storage, `public/logo_${Date.now()}`); await uploadBytes(r, file); setF({ ...f, logoUrl: await getDownloadURL(r) }); } catch { toast("Logo আপলোড হয়নি — URL পেস্ট করুন", "err"); } };
  return (
    <form className="card" onSubmit={save}><h3>Website Settings</h3>
      {k("siteName", "Website Name")}{k("tagline", "Tagline")}{k("logoUrl", "Logo URL")}<input type="file" accept="image/*" onChange={(e) => logo(e.target.files[0])} />
      {k("bkash", "bKash নম্বর")}{k("nagad", "Nagad নম্বর")}
      <label>Payment Instructions</label><textarea rows={3} value={f.paymentNote || ""} onChange={(e) => setF({ ...f, paymentNote: e.target.value })} />
      {k("whatsapp", "WhatsApp নম্বর")}{k("whatsappLink", "WhatsApp Link")}{k("telegram", "Telegram Link")}{k("youtube", "YouTube Link")}{k("email", "Contact Email")}
      <p><button className="btn" disabled={busy}>Save Settings</button></p></form>
  );
}

function Audit() {
  const a = useQ(() => query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(100)), []);
  return <div className="card tbl"><h3>Audit Log</h3><table><thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th></tr></thead><tbody>
    {a.data.map((x) => <tr key={x.id}><td>{x.createdAt?.toDate?.().toLocaleString("en-GB")}</td><td>{x.adminEmail}</td><td>{x.action}</td><td>{x.target}</td></tr>)}</tbody></table></div>;
}
