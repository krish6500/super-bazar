import { getServerSupabase, requireAdmin } from "../../../lib/supabase-server";

type ImportProduct = { barcode?: unknown; name?: unknown; category?: unknown; unit?: unknown; price?: unknown; mrp?: unknown; stock?: unknown; brand?: unknown };
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const money = (value: unknown) => Number(value);

export async function POST(request: Request) {
  const auth = await requireAdmin(request); if (auth.response) return auth.response;
  const body = await request.json().catch(() => null); const incoming: ImportProduct[] = Array.isArray(body?.products) ? body.products : [];
  if (!incoming.length || incoming.length > 5000) return Response.json({ error: "Upload between 1 and 5,000 products at a time." }, { status: 400 });
  const seen = new Set<string>(); const rows = [];
  for (const raw of incoming) {
    const barcode = text(raw.barcode).replace(/\.0$/, ""), name = text(raw.name), price = money(raw.price), mrp = money(raw.mrp), stock = Math.max(0, Math.floor(Number(raw.stock)) || 0);
    if (!barcode || !name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(mrp) || mrp <= 0) return Response.json({ error: `Invalid product row near ${name || barcode || "unknown item"}.` }, { status: 400 });
    if (seen.has(barcode)) return Response.json({ error: `Barcode ${barcode} appears more than once in the file.` }, { status: 400 });
    seen.add(barcode); rows.push({ barcode, name: name.slice(0, 200), category: text(raw.category).slice(0, 100) || "Pantry", unit: text(raw.unit).slice(0, 60) || "1 pc", price, mrp, stock, brand: text(raw.brand).slice(0, 120) || null, emoji: "🛍️", active: true });
  }
  const supabase = getServerSupabase(); const codes = rows.map((r) => r.barcode);
  const { data: existing, error: readError } = await supabase.from("products").select("barcode").in("barcode", codes);
  if (readError) return Response.json({ error: readError.message.includes("barcode") ? "Run the barcode database migration in Supabase before importing." : readError.message }, { status: 500 });
  const existingCodes = new Set((existing || []).map((p) => p.barcode));
  for (let i = 0; i < rows.length; i += 500) { const { error } = await supabase.from("products").upsert(rows.slice(i, i + 500), { onConflict: "barcode" }); if (error) return Response.json({ error: error.message }, { status: 500 }); }
  const updated = rows.filter((r) => existingCodes.has(r.barcode)).length;
  return Response.json({ imported: rows.length, created: rows.length - updated, updated });
}

