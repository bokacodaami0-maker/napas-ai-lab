import { useState } from "react";
import { collection, query, where, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { useQ, useToast, Spinner, Badge, bdt, dt } from "../utils";

const mine = (name, uid) => query(collection(db, name), where("uid", "==", uid));
const byDate = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);

export function MyOrders() {
  const { user } = useAuth(); const toast = useToast();
  const { data, loading, error } = useQ(() => mine("orders", user.uid), [user.uid]);
  const [open, setOpen] = useState(null);
  const cancel = async (o) => {
    if (!confirm("Cancellation Request পাঠাবেন?")) return;
    try { const b = writeBatch(db); b.update(doc(db, "orders", o.id), { cancelRequested: true, updatedAt: serverTimestamp() }); await b.commit(); toast("Cancellation Request পাঠানো হয়েছে"); }
    catch { toast("পাঠানো যায়নি", "err"); }
  };
  const refund = async (o) => {
    const reason = prompt("Refund-এর কারণ লিখুন:"); if (!reason || reason.trim().length < 5) return;
    try {
      const b = writeBatch(db);
      b.update(doc(db, "orders", o.id), { refundStatus: "requested", updatedAt: serverTimestamp() });
      b.set(doc(db, "refunds", o.id), { uid: user.uid, orderId: o.id, orderNo: o.orderNo, courseTitle: o.courseTitle, amount: o.amount, reason: reason.trim(), status: "requested", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await b.commit(); toast("Refund Request পাঠানো হয়েছে");
    } catch { toast("Refund Request হয়নি (শুধু Verified পেমেন্টে, একবার)", "err"); }
  };
  if (loading) return <Spinner />;
  return (
    <main className="page"><h2>My Orders</h2>
      {error && <p className="note err">Orders লোড করা যায়নি।</p>}
      {!error && data.length === 0 && <div className="card"><p>কোনো Order নেই।</p></div>}
      {[...data].sort(byDate).map((o) => (
        <div className="card" key={o.id}>
          <div className="row" style={{ justifyContent: "space-between" }}><b>{o.orderNo}</b><span className="mini">{dt(o.createdAt)}</span></div>
          <p>{o.courseTitle} — <b>{bdt(o.amount)}</b></p>
          <div className="row">Payment <Badge v={o.paymentStatus} /> Enrollment <Badge v={o.enrollmentStatus} /> Refund <Badge v={o.refundStatus} />{o.cancelRequested && <Badge v="requested" />}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn sm ghost" onClick={() => setOpen(open === o.id ? null : o.id)}>View Details / Track</button>
            {o.enrollmentStatus !== "cancelled" && !o.cancelRequested && <button className="btn sm amber" onClick={() => cancel(o)}>Request Cancellation</button>}
            {o.paymentStatus === "verified" && o.refundStatus === "none" && <button className="btn sm red" onClick={() => refund(o)}>Request Refund</button>}
          </div>
          {open === o.id && <div className="note ok" style={{ marginTop: 10 }}>
            Method: {o.method} · TrxID: {o.trxId} · WhatsApp: {o.whatsapp}<br />
            Track: Order জমা ✔ → Payment: {o.paymentStatus} → Enrollment: {o.enrollmentStatus}
            {o.cancelRequested && " → Cancellation: requested"}{o.refundStatus !== "none" && ` → Refund: ${o.refundStatus}`}
          </div>}
        </div>))}
    </main>
  );
}

export function MyMoney() {
  const { user } = useAuth();
  const pay = useQ(() => mine("payments", user.uid), [user.uid]);
  const ref = useQ(() => mine("refunds", user.uid), [user.uid]);
  if (pay.loading || ref.loading) return <Spinner />;
  const sum = (a, f) => a.filter(f).reduce((t, x) => t + Number(x.amount || 0), 0);
  const stats = [["Total Payments", sum(pay.data, () => true)], ["Pending", sum(pay.data, (p) => p.status === "pending")], ["Completed", sum(pay.data, (p) => p.status === "verified")], ["Total Refunds", sum(ref.data, (r) => r.status === "completed")]];
  return (
    <main className="page"><h2>My Money</h2>
      <div className="grid">{stats.map(([a, b]) => <div className="card stat" key={a}>{bdt(b)}<small>{a}</small></div>)}</div>
      <div className="card tbl"><h3>Transaction History</h3><table><thead><tr><th>Date</th><th>Order</th><th>Method</th><th>TrxID</th><th>Amount</th><th>Status</th></tr></thead><tbody>
        {[...pay.data].sort(byDate).map((p) => <tr key={p.id}><td>{dt(p.createdAt)}</td><td>{p.orderNo}</td><td>{p.method}</td><td>{p.trxId}</td><td>{bdt(p.amount)}</td><td><Badge v={p.status} /></td></tr>)}
        {!pay.data.length && <tr><td colSpan={6}>কোনো লেনদেন নেই</td></tr>}</tbody></table></div>
      <div className="card tbl"><h3>Refund History</h3><table><thead><tr><th>Date</th><th>Order</th><th>Amount</th><th>Status</th><th>Refund TrxID</th></tr></thead><tbody>
        {[...ref.data].sort(byDate).map((r) => <tr key={r.id}><td>{dt(r.createdAt)}</td><td>{r.orderNo}</td><td>{bdt(r.amount)}</td><td><Badge v={r.status} /></td><td>{r.refundTrxId || "—"}</td></tr>)}
        {!ref.data.length && <tr><td colSpan={5}>কোনো Refund নেই</td></tr>}</tbody></table></div>
    </main>
  );
}
