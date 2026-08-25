"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "../../lib/auth-fetch";

type Product = {
  id: number; barcode: string | null; brand: string | null; name: string; category: string; unit: string;
  price: number; mrp: number; emoji: string; image_url: string | null; stock: number; active: boolean;
};
type ImportRow = {
  barcode: string; name: string; category: string; unit: string;
  price: number; mrp: number; stock: number; brand?: string;
};

const blank = { barcode: "", brand: "", name: "", category: "Fresh", unit: "1 pc", price: "", mrp: "", emoji: "🛍️", stock: "10" };
const aliases: Record<keyof ImportRow, string[]> = {
  barcode: ["barcode", "bar code", "ean", "ean code", "upc", "item barcode", "sku", "item code", "product code"],
  name: ["name", "product name", "item name", "description", "product", "item"],
  category: ["category", "department", "group", "segment", "product group"],
  unit: ["unit", "uom", "pack", "pack size", "size", "measurement"],
  price: ["price", "selling price", "sale price", "retail price", "sp", "rate"],
  mrp: ["mrp", "maximum retail price", "list price"],
  stock: ["stock", "quantity", "qty", "available quantity", "closing stock", "inventory"],
  brand: ["brand", "manufacturer"],
};

function normalise(value: string) { return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " "); }
function numberValue(value: string) { return Number(value.replace(/[₹,\s]/g, "")) || 0; }
function parseCsv(text: string) {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows;
}
function mapCsv(text: string): { rows: ImportRow[]; errors: string[] } {
  const table = parseCsv(text); if (table.length < 2) return { rows: [], errors: ["The CSV does not contain product rows."] };
  const headers = table[0].map(normalise); const index = {} as Record<keyof ImportRow, number>;
  (Object.keys(aliases) as (keyof ImportRow)[]).forEach((field) => { index[field] = headers.findIndex((h) => aliases[field].includes(h)); });
  const missing = (["barcode", "name", "price", "mrp", "stock"] as (keyof ImportRow)[]).filter((f) => index[f] < 0);
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}. Rename the Prana columns or use the sample template.`] };
  const errors: string[] = []; const rows: ImportRow[] = [];
  table.slice(1).forEach((r, offset) => {
    const get = (field: keyof ImportRow) => index[field] >= 0 ? (r[index[field]] || "").trim() : "";
    const item = { barcode: get("barcode").replace(/\.0$/, ""), name: get("name"), category: get("category") || "Pantry", unit: get("unit") || "1 pc", price: numberValue(get("price")), mrp: numberValue(get("mrp")), stock: Math.max(0, Math.floor(numberValue(get("stock")))), brand: get("brand") };
    if (!item.barcode || !item.name || item.price <= 0 || item.mrp <= 0) errors.push(`Row ${offset + 2}: barcode, name, price or MRP is invalid.`); else rows.push(item);
  });
  return { rows, errors };
}

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]), [form, setForm] = useState(blank), [note, setNote] = useState("");
  const [scan, setScan] = useState(""), [fileName, setFileName] = useState(""), [preview, setPreview] = useState<ImportRow[]>([]), [errors, setErrors] = useState<string[]>([]), [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null), [imageFile, setImageFile] = useState<File | null>(null), [saving, setSaving] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const editingProduct = products.find((p) => p.id === editingId);
  const load = () => authFetch("/api/products").then((r) => r.json()).then((d) => setProducts(d.products || []));
  useEffect(() => { void load(); scanRef.current?.focus(); }, []);
  const existingCodes = useMemo(() => new Set(products.map((p) => p.barcode).filter(Boolean)), [products]);

  const resetForm = () => { setForm(blank); setEditingId(null); setImageFile(null); };
  const editProduct = (p: Product) => {
    setEditingId(p.id); setImageFile(null);
    setForm({ barcode: p.barcode || "", brand: p.brand || "", name: p.name, category: p.category, unit: p.unit, price: String(p.price), mrp: String(p.mrp), emoji: p.emoji || "🛍️", stock: String(p.stock) });
    setNote(`Editing ${p.name}`); document.getElementById("product-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setNote("");
    const payload = { ...form, price: Number(form.price), mrp: Number(form.mrp), stock: Number(form.stock), ...(editingId ? { id: editingId } : {}) };
    const r = await authFetch("/api/products", { method: editingId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) { setSaving(false); return setNote(d.error || "Could not save product"); }
    const productId = editingId || d.product?.id;
    if (imageFile && productId) {
      const upload = new FormData(); upload.append("id", String(productId)); upload.append("image", imageFile);
      const imageResponse = await authFetch("/api/products/image", { method: "POST", body: upload });
      const imageData = await imageResponse.json();
      if (!imageResponse.ok) { setSaving(false); return setNote(`Product saved, but photo failed: ${imageData.error}`); }
    }
    const wasEditing = Boolean(editingId); resetForm(); setSaving(false); setNote(wasEditing ? "Changes saved successfully" : "Product added successfully"); await load();
  };
  const findBarcode = (e: FormEvent) => {
    e.preventDefault(); const code = scan.trim(); if (!code) return;
    const found = products.find((p) => p.barcode === code);
    if (found) editProduct(found); else { resetForm(); setForm({ ...blank, barcode: code }); setNote("New barcode. Complete the product details below."); document.getElementById("product-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
    setScan(""); scanRef.current?.focus();
  };
  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setFileName(file.name); const parsed = mapCsv(await file.text()); setPreview(parsed.rows); setErrors(parsed.errors);
  };
  const importRows = async () => {
    if (!preview.length) return; setImporting(true); setNote("");
    const r = await authFetch("/api/products/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ products: preview }) });
    const d = await r.json(); setImporting(false); if (!r.ok) return setNote(d.error || "Import failed");
    setNote(`Import complete: ${d.created} added, ${d.updated} updated.`); setPreview([]); setFileName(""); setErrors([]); void load();
  };
  const downloadTemplate = () => {
    const csv = "Barcode,Product Name,Category,Unit,Selling Price,MRP,Stock,Brand\n8901234567890,Example Product,Pantry,1 pc,90,100,25,Example Brand\n";
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "prana-product-import-template.csv"; a.click(); URL.revokeObjectURL(a.href);
  };
  const remove = async (id: number) => { if (!confirm("Remove this product from the storefront?")) return; await authFetch(`/api/products?id=${id}`, { method: "DELETE" }); setNote("Product removed from storefront"); if (editingId === id) resetForm(); void load(); };
  const removeImage = async () => {
    if (!editingId) return; const r = await authFetch(`/api/products/image?id=${editingId}`, { method: "DELETE" }); const d = await r.json();
    if (!r.ok) return setNote(d.error || "Could not remove photo"); setImageFile(null); setNote("Product photo removed"); await load();
  };

  return <main className="manager-page">
    <header><a className="brand" href="/"><span>super</span>bazar<i>.</i></a><nav><a href="/admin">Dashboard</a><a href="/admin/banners">Festival banners</a></nav></header>
    <section>
      <div className="manager-title"><div><p className="eyebrow">CATALOGUE</p><h1>Products & Prana import</h1><p>Scan one product or upload your full Prana CSV. Barcode matches update existing items automatically.</p></div></div>
      <div className="import-tools">
        <form className="scan-card" onSubmit={findBarcode}><div><b>Scan barcode</b><small>Keep this box selected, then scan with your barcode machine.</small></div><input ref={scanRef} inputMode="numeric" value={scan} onChange={(e) => setScan(e.target.value)} placeholder="Scan or type barcode" aria-label="Barcode"/><button>Find product</button></form>
        <div className="bulk-card"><div><b>Bulk import from Prana</b><small>Export products as CSV. Required: barcode, name, selling price, MRP and stock.</small></div><div className="bulk-actions"><label className="file-button">Choose CSV<input type="file" accept=".csv,text/csv" onChange={readFile}/></label><button className="template-button" onClick={downloadTemplate}>Download template</button></div>{fileName && <p className="file-name">{fileName} • {preview.length} valid rows</p>}</div>
      </div>
      {(preview.length > 0 || errors.length > 0) && <div className="import-preview"><div className="preview-head"><div><h2>Check before importing</h2><p>{preview.filter((p) => existingCodes.has(p.barcode)).length} will update • {preview.filter((p) => !existingCodes.has(p.barcode)).length} will be added</p></div><button disabled={importing || !preview.length} onClick={importRows}>{importing ? "Importing…" : `Import ${preview.length} products`}</button></div>{errors.slice(0, 5).map((x) => <p className="row-error" key={x}>{x}</p>)}<div className="preview-table"><div className="preview-row headings"><span>Barcode</span><span>Product</span><span>Price</span><span>Stock</span><span>Action</span></div>{preview.slice(0, 20).map((p) => <div className="preview-row" key={p.barcode}><span>{p.barcode}</span><b>{p.name}<small>{p.category} • {p.unit}</small></b><span>₹{p.price} / ₹{p.mrp}</span><span>{p.stock}</span><strong className={existingCodes.has(p.barcode) ? "update" : "new"}>{existingCodes.has(p.barcode) ? "Update" : "New"}</strong></div>)}</div>{preview.length > 20 && <p className="more-rows">And {preview.length - 20} more rows…</p>}</div>}
      <div className="manager-grid">
        <form id="product-editor" className="manager-form" onSubmit={submit}>
          <div className="edit-form-title"><h2>{editingId ? "Edit product" : "Add one product"}</h2>{editingId && <button type="button" className="cancel-edit" onClick={resetForm}>Cancel</button>}</div>
          <label>Barcode<input required inputMode="numeric" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value.trim() })} placeholder="Scan barcode here"/></label>
          <label>Product name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Example: Fresh Apples"/></label>
          <div className="form-row"><label>Category<input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}/></label><label>Brand<input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Optional"/></label></div>
          <div className="form-row"><label>Unit<input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}/></label><label>Stock<input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}/></label></div>
          <div className="form-row"><label>Selling price ₹<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}/></label><label>MRP ₹<input required type="number" min="0.01" step="0.01" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })}/></label></div>
          <div className="form-row"><label>Fallback emoji<input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}/></label><label className="image-picker">Product photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImageFile(e.target.files?.[0] || null)}/></label></div>
          {(imageFile || editingProduct?.image_url) && <div className="image-preview"><Image src={imageFile ? URL.createObjectURL(imageFile) : editingProduct!.image_url!} alt="Product preview" width={96} height={96} unoptimized={Boolean(imageFile)}/><div><b>{imageFile ? imageFile.name : "Current photo"}</b><small>JPG, PNG or WebP • maximum 5 MB</small>{editingProduct?.image_url && !imageFile && <button type="button" onClick={removeImage}>Remove photo</button>}</div></div>}
          <button disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add product →"}</button>
        </form>
        <div className="catalogue-list"><h2>Current products <span>{products.length}</span></h2>{products.map((p) => <article id={`product-${p.id}`} key={p.id}>{p.image_url ? <Image src={p.image_url} alt={p.name} width={48} height={48}/> : <i>{p.emoji}</i>}<div><b>{p.name}</b><small>{p.category} • {p.unit} • Stock {p.stock}{p.barcode ? ` • ${p.barcode}` : " • No barcode"}</small></div><strong>₹{p.price}</strong><div className="product-actions"><button className="edit-product" onClick={() => editProduct(p)}>Edit</button><button onClick={() => remove(p.id)}>Remove</button></div></article>)}</div>
      </div>
    </section>{note && <div className="toast">{note}</div>}
  </main>;
}
