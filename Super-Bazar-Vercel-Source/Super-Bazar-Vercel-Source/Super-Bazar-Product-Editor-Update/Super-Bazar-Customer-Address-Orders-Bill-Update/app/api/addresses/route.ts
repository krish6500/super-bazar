import { getRequestUser, getServerSupabase } from "../../lib/supabase-server";

function mapAddress(row: Record<string, unknown>) {
  return {
    id: row.id,
    label: row.label,
    recipientName: row.recipient_name,
    phone: row.phone,
    line1: row.address_line1,
    line2: row.address_line2 || "",
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    isDefault: row.is_default,
  };
}

function clean(body: Record<string, unknown>) {
  return {
    label: String(body.label || "Home").trim().slice(0, 30),
    recipient_name: String(body.recipientName || "").trim().slice(0, 100),
    phone: String(body.phone || "").replace(/[^0-9+]/g, "").slice(0, 15),
    address_line1: String(body.line1 || "").trim().slice(0, 180),
    address_line2: String(body.line2 || "").trim().slice(0, 180) || null,
    city: String(body.city || "").trim().slice(0, 80),
    state: String(body.state || "").trim().slice(0, 80),
    postal_code: String(body.postalCode || "").replace(/\D/g, "").slice(0, 6),
    is_default: Boolean(body.isDefault),
  };
}

function valid(row: ReturnType<typeof clean>) {
  return row.recipient_name && row.phone.length >= 10 && row.address_line1 &&
    row.city && row.state && row.postal_code.length === 6;
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await getServerSupabase().from("addresses").select("*")
    .eq("user_id", user.id).order("is_default", { ascending: false })
    .order("id", { ascending: false });
  return error ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ addresses: (data || []).map(mapAddress) });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const values = clean(await request.json());
  if (!valid(values)) return Response.json({ error: "Enter a complete address and valid phone/PIN code" }, { status: 400 });
  const db = getServerSupabase();
  const { count } = await db.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if (values.is_default || !count) await db.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  const { data, error } = await db.from("addresses").insert({
    ...values, user_id: user.id, customer_email: user.email || null,
    is_default: values.is_default || !count,
  }).select().single();
  return error ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ address: mapAddress(data) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json();
  const values = clean(body);
  if (!body.id || !valid(values)) return Response.json({ error: "Enter a complete address" }, { status: 400 });
  const db = getServerSupabase();
  if (values.is_default) await db.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  const { data, error } = await db.from("addresses").update(values).eq("id", body.id)
    .eq("user_id", user.id).select().single();
  return error ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ address: mapAddress(data) });
}

export async function DELETE(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Address id required" }, { status: 400 });
  const { error } = await getServerSupabase().from("addresses").delete().eq("id", id).eq("user_id", user.id);
  return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ success: true });
}
