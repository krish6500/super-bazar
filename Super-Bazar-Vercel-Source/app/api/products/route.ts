import { getServerSupabase, requireAdmin } from "../../lib/supabase-server";

export async function GET() {
  const { data, error } = await getServerSupabase()
    .from("products")
    .select("*")
    .order("id");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ products: data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const body = await request.json();
  if (!body.name || !body.category || !body.unit || !body.price || !body.mrp)
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  const { data, error } = await getServerSupabase()
    .from("products")
    .insert({
      name: body.name,
      category: body.category,
      unit: body.unit,
      price: body.price,
      mrp: body.mrp,
      emoji: body.emoji || "🛍️",
      stock: body.stock || 0,
    })
    .select()
    .single();
  return error
    ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ product: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const body = await request.json();
  if (!body.id)
    return Response.json({ error: "Product id required" }, { status: 400 });
  const changes: Record<string, unknown> = {};
  for (const key of [
    "stock",
    "active",
    "price",
    "mrp",
    "name",
    "category",
    "unit",
    "emoji",
  ])
    if (body[key] !== undefined) changes[key] = body[key];
  const { data, error } = await getServerSupabase()
    .from("products")
    .update(changes)
    .eq("id", body.id)
    .select()
    .single();
  return error
    ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ product: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id)
    return Response.json({ error: "Product id required" }, { status: 400 });
  const { error } = await getServerSupabase()
    .from("products")
    .update({ active: false, stock: 0 })
    .eq("id", id);
  return error
    ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ removed: true });
}
