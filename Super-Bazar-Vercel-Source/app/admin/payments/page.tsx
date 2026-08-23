"use client";
import { useEffect, useState } from "react";
import { authFetch } from "../../lib/auth-fetch";
type Session = {
  id: string;
  amount: number;
  phone: string;
  status: string;
  createdAt: string;
};
export default function PaymentApprovals() {
  const [sessions, setSessions] = useState<Session[]>([]),
    [note, setNote] = useState("");
  const load = () =>
    authFetch("/api/payment/admin")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []));
  useEffect(() => {
    void load();
  }, []);
  const confirm = async (id: string) => {
    const r = await authFetch("/api/payment/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    });
    const d = await r.json();
    setNote(
      r.ok ? "Payment approved — customer order will be placed" : d.error,
    );
    void load();
  };
  return (
    <main className="approval-page">
      <header>
        <a className="brand" href="/">
          <span>super</span>bazar<i>.</i>
        </a>
        <a href="/admin">← Admin dashboard</a>
      </header>
      <section>
        <p className="eyebrow">MERCHANT CONTROL</p>
        <h1>Payment approvals</h1>
        <p>
          Check your UPI account before approving. After approval, the customer
          sees payment successful and the order is placed automatically.
        </p>
        {!sessions.length ? (
          <div className="empty">
            <span>₹</span>
            <h3>No payment requests</h3>
            <p>New online payments will appear here.</p>
          </div>
        ) : (
          <div className="approval-list">
            {sessions.map((s) => (
              <article key={s.id}>
                <span>₹</span>
                <div>
                  <small>PAYMENT REQUEST</small>
                  <h3>₹{s.amount}</h3>
                  <p>
                    Customer: +91 {s.phone} • {s.status.replaceAll("_", " ")}
                  </p>
                </div>
                <button
                  disabled={s.status !== "awaiting_merchant"}
                  onClick={() => confirm(s.id)}
                >
                  {s.status === "awaiting_merchant"
                    ? "Approve payment"
                    : "Approved"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      {note && <div className="toast">{note}</div>}
    </main>
  );
}
