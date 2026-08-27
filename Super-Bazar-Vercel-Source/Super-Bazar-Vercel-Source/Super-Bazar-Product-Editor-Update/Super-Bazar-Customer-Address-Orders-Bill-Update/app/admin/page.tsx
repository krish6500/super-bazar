"use client";
import { useEffect, useState } from "react";
import { authFetch } from "../lib/auth-fetch";

type Product = {
  id: number;
  name: string;
  category: string;
  unit: string;
  price: number;
  mrp: number;
  emoji: string;
  stock: number;
  active: boolean;
};
type Order = {
  id: number;
  customerName: string;
  address: string;
  paymentMethod: string;
  amount: number;
  status: string;
  createdAt: string;
  customerEmail: string;
  customerPhone: string;
  deliveryInstructions: string;
  items: { id: number; name: string; quantity: number; price: number }[];
};

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [tab, setTab] = useState<"products" | "orders">("products"),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState("");
  const load = async () => {
    setLoading(true);
    const [p, o] = await Promise.all([
      authFetch("/api/products").then((r) => r.json()),
      authFetch("/api/orders").then((r) => r.json()),
    ]);
    setProducts(p.products || []);
    setOrders(o.orders || []);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);
  const patchProduct = async (id: number, data: Record<string, unknown>) => {
    await authFetch("/api/products", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    setProducts((rows) =>
      rows.map((p) => (p.id === id ? { ...p, ...data } : p)),
    );
    setNotice("Inventory updated");
    setTimeout(() => setNotice(""), 1500);
  };
  const patchOrder = async (id: number, status: string) => {
    await authFetch("/api/orders", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setOrders((rows) => rows.map((o) => (o.id === id ? { ...o, status } : o)));
    setNotice("Order status updated");
    setTimeout(() => setNotice(""), 1500);
  };
  const low = products.filter((p) => p.stock < 10).length,
    revenue = orders.reduce((s, o) => s + o.amount, 0);
  return (
    <main className="admin-shell">
      <header className="admin-top">
        <a className="brand" href="/">
          <span>super</span>bazar<i>.</i>
        </a>
        <div>
          <b>Store Admin</b>
          <small>Inventory & order control</small>
        </div>
        <nav className="admin-nav">
          <a href="/admin/products">＋ Products</a>
          <a href="/admin/banners">🎉 Banners</a>
          <a href="/admin/payments">₹ Payments</a>
          <a href="/">Storefront</a>
        </nav>
      </header>
      <section className="admin-page">
        <div className="admin-title">
          <div>
            <p className="eyebrow">CONTROL CENTRE</p>
            <h1>Good afternoon, Krish</h1>
            <p>Here is what is happening at Super Bazar today.</p>
          </div>
          <button onClick={() => void load()}>↻ Refresh data</button>
        </div>
        <div className="stats">
          <article>
            <span>📦</span>
            <small>Total orders</small>
            <b>{orders.length}</b>
          </article>
          <article>
            <span>₹</span>
            <small>Total revenue</small>
            <b>₹{revenue}</b>
          </article>
          <article>
            <span>⚠</span>
            <small>Low stock items</small>
            <b>{low}</b>
          </article>
          <article>
            <span>🛍️</span>
            <small>Active products</small>
            <b>{products.filter((p) => p.active).length}</b>
          </article>
        </div>
        <div className="admin-tabs">
          <button
            className={tab === "products" ? "active" : ""}
            onClick={() => setTab("products")}
          >
            Products & stock
          </button>
          <button
            className={tab === "orders" ? "active" : ""}
            onClick={() => setTab("orders")}
          >
            Customer orders
          </button>
        </div>
        {loading ? (
          <div className="admin-loading">Loading live store data…</div>
        ) : tab === "products" ? (
          <div className="data-card">
            <div className="data-head">
              <h2>Inventory</h2>
              <span>{products.length} products</span>
            </div>
            <div className="admin-table">
              <div className="tr headings">
                <span>Product</span>
                <span>Category</span>
                <span>Price</span>
                <span>Stock</span>
                <span>Status</span>
              </div>
              {products.map((p) => (
                <div className="tr" key={p.id}>
                  <span className="product-cell">
                    <i>{p.emoji}</i>
                    <b>
                      {p.name}
                      <small>{p.unit}</small>
                    </b>
                  </span>
                  <span>{p.category}</span>
                  <span>₹{p.price}</span>
                  <span className="stock-edit">
                    <button
                      onClick={() =>
                        patchProduct(p.id, { stock: Math.max(0, p.stock - 1) })
                      }
                    >
                      −
                    </button>
                    <b className={p.stock < 10 ? "low" : ""}>{p.stock}</b>
                    <button
                      onClick={() => patchProduct(p.id, { stock: p.stock + 1 })}
                    >
                      +
                    </button>
                  </span>
                  <span>
                    <button
                      className={`status-toggle ${p.active ? "on" : ""}`}
                      onClick={() => patchProduct(p.id, { active: !p.active })}
                    >
                      {p.active ? "Active" : "Hidden"}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="data-card">
            <div className="data-head">
              <h2>Recent orders</h2>
              <span>{orders.length} orders</span>
            </div>
            {!orders.length ? (
              <div className="no-orders">
                No orders yet. Complete a checkout from the storefront.
              </div>
            ) : (
              <div className="order-grid">
                {orders.map((o) => (
                  <article key={o.id}>
                    <div>
                      <small>ORDER</small>
                      <b>#SB{o.id.toString().padStart(4, "0")}</b>
                    </div>
                    <p>
                      {o.customerName}
                      <small>{o.customerEmail} • {o.customerPhone}</small>
                      <small><b>Deliver to:</b> {o.address}</small>
                      {o.deliveryInstructions && <small><b>Instruction:</b> {o.deliveryInstructions}</small>}
                      <small>{o.items?.map((item) => `${item.name} × ${item.quantity}`).join(" • ")}</small>
                    </p>
                    <p>
                      <b>₹{o.amount}</b>
                      <small>{o.paymentMethod}</small>
                    </p>
                    <select
                      value={o.status}
                      onChange={(e) => patchOrder(o.id, e.target.value)}
                    >
                      <option>Confirmed</option>
                      <option>Packing</option>
                      <option>Out for delivery</option>
                      <option>Delivered</option>
                      <option>Cancelled</option>
                    </select>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
      {notice && <div className="toast">✓ {notice}</div>}
    </main>
  );
}
