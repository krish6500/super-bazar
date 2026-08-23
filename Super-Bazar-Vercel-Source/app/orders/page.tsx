"use client";
import { useEffect, useState } from "react";
import { authFetch } from "../lib/auth-fetch";
type Order = {
  id: number;
  amount: number;
  status: string;
  paymentMethod: string;
  address: string;
  createdAt: string;
};
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    authFetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="orders-page">
      <header>
        <a className="brand" href="/">
          <span>super</span>bazar<i>.</i>
        </a>
        <a href="/">← Continue shopping</a>
      </header>
      <section>
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>My orders</h1>
        {loading ? (
          <p>Loading orders…</p>
        ) : !orders.length ? (
          <div className="empty">
            <span>📦</span>
            <h3>No orders yet</h3>
            <p>Your completed orders will appear here.</p>
            <a href="/">Start shopping</a>
          </div>
        ) : (
          <div className="customer-orders">
            {orders.map((o) => (
              <article key={o.id}>
                <div className="order-icon">📦</div>
                <div>
                  <small>ORDER #SB{o.id.toString().padStart(4, "0")}</small>
                  <h3>{o.status}</h3>
                  <p>{o.address}</p>
                  <span>{new Date(o.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <b>₹{o.amount}</b>
                  <small>{o.paymentMethod}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
