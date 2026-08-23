"use client";
import { FormEvent, useEffect, useState } from "react";
import { authFetch } from "../../lib/auth-fetch";
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
const blank = {
  name: "",
  category: "Fresh",
  unit: "1 kg",
  price: "",
  mrp: "",
  emoji: "🛍️",
  stock: "10",
};
export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]),
    [form, setForm] = useState(blank),
    [note, setNote] = useState("");
  const load = () =>
    authFetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));
  useEffect(() => {
    void load();
  }, []);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await authFetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        mrp: Number(form.mrp),
        stock: Number(form.stock),
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setNote(d.error);
      return;
    }
    setForm(blank);
    setNote("Product added successfully");
    void load();
  };
  const remove = async (id: number) => {
    await authFetch(`/api/products?id=${id}`, { method: "DELETE" });
    setNote("Product removed from storefront");
    void load();
  };
  return (
    <main className="manager-page">
      <header>
        <a className="brand" href="/">
          <span>super</span>bazar<i>.</i>
        </a>
        <nav>
          <a href="/admin">Dashboard</a>
          <a href="/admin/banners">Festival banners</a>
        </nav>
      </header>
      <section>
        <div className="manager-title">
          <div>
            <p className="eyebrow">CATALOGUE</p>
            <h1>Manage products</h1>
            <p>Add new products or remove items from the storefront.</p>
          </div>
        </div>
        <div className="manager-grid">
          <form className="manager-form" onSubmit={submit}>
            <h2>Add a product</h2>
            <label>
              Product name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Example: Fresh Apples"
              />
            </label>
            <div className="form-row">
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {[
                    "Fresh",
                    "Dairy",
                    "Snacks",
                    "Drinks",
                    "Pantry",
                    "Care",
                    "Pet",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Emoji
                <input
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Unit
                <input
                  required
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </label>
              <label>
                Stock
                <input
                  required
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Selling price ₹
                <input
                  required
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </label>
              <label>
                MRP ₹
                <input
                  required
                  type="number"
                  min="1"
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                />
              </label>
            </div>
            <button>Add product →</button>
          </form>
          <div className="catalogue-list">
            <h2>
              Current products <span>{products.length}</span>
            </h2>
            {products.map((p) => (
              <article key={p.id}>
                <i>{p.emoji}</i>
                <div>
                  <b>{p.name}</b>
                  <small>
                    {p.category} • {p.unit} • Stock {p.stock}
                  </small>
                </div>
                <strong>₹{p.price}</strong>
                <button onClick={() => remove(p.id)}>Remove</button>
              </article>
            ))}
          </div>
        </div>
      </section>
      {note && <div className="toast">{note}</div>}
    </main>
  );
}
