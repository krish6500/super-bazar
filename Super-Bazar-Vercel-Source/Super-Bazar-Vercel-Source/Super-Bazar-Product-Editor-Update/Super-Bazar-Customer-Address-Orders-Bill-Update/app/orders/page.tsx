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
  customerName: string;
  customerPhone: string;
  deliveryInstructions: string;
  items: { id: number; name: string; quantity: number; price: number }[];
};
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]),
    [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => {
    authFetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .finally(() => setLoading(false));
  }, []);
  const invoiceBlob = async (id: number) => {
    const response = await authFetch(`/api/orders/${id}/invoice`);
    if (!response.ok) throw new Error("Invoice unavailable");
    return response.blob();
  };
  const downloadInvoice = async (order: Order) => {
    setBusy(order.id);
    try {
      const blob = await invoiceBlob(order.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Super-Bazar-SB${String(order.id).padStart(4, "0")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally { setBusy(null); }
  };
  const shareInvoice = async (order: Order) => {
    setBusy(order.id);
    try {
      const blob = await invoiceBlob(order.id);
      const file = new File([blob], `Super-Bazar-SB${String(order.id).padStart(4, "0")}.pdf`, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Super Bazar order SB${order.id}`, text: "My Super Bazar invoice", files: [file] });
      } else {
        await downloadInvoice(order);
        window.open(`https://wa.me/?text=${encodeURIComponent(`Super Bazar order #SB${String(order.id).padStart(4, "0")} bill downloaded. Total: Rs. ${order.amount}`)}`, "_blank");
      }
    } catch { /* The customer may cancel the share sheet. */ }
    finally { setBusy(null); }
  };
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
                <div className="order-summary">
                  <div className="order-icon">📦</div>
                  <div>
                    <small>ORDER #SB{o.id.toString().padStart(4, "0")}</small>
                    <h3>{o.status}</h3>
                    <p>{new Date(o.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="order-total"><b>₹{o.amount}</b><small>{o.paymentMethod}</small></div>
                </div>
                <div className="order-details">
                  <div><b>Delivery address</b><p>{o.customerName} • {o.customerPhone}</p><p>{o.address}</p>{o.deliveryInstructions && <small>Instruction: {o.deliveryInstructions}</small>}</div>
                  <div className="order-items"><b>Items</b>{o.items.map((item) => <p key={item.id}><span>{item.name} × {item.quantity}</span><strong>₹{(item.price * item.quantity).toFixed(2)}</strong></p>)}</div>
                </div>
                <div className="invoice-actions"><button disabled={busy === o.id} onClick={() => downloadInvoice(o)}>⬇ {busy === o.id ? "Preparing…" : "Download PDF bill"}</button><button disabled={busy === o.id} onClick={() => shareInvoice(o)}>Share to WhatsApp / apps</button></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
