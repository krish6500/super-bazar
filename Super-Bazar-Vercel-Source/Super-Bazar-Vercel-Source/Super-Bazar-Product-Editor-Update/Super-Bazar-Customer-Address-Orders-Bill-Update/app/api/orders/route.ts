import {
  getRequestUser,
  getServerSupabase,
  requireAdmin,
} from "../../lib/supabase-server";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ orders: [] });
  let query = getServerSupabase()
    .from("orders")
    .select("*, order_items(*)")
    .order("id", { ascending: false })
    .limit(50);
  if (user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase())
    query = query.eq("customer_email", user.email || "");
  const { data, error } = await query;
  return error
    ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ orders: (data || []).map((row) => ({
        id: row.id, customerEmail: row.customer_email, customerName: row.customer_name,
        customerPhone: row.customer_phone || "", address: row.address,
        deliveryInstructions: row.delivery_instructions || "",
        paymentMethod: row.payment_method, amount: row.amount,
        status: row.status, createdAt: row.created_at,
        items: (row.order_items || []).map((item: { id: number; product_id: number; product_name: string; quantity: number; unit_price: number }) => ({
          id: item.id, productId: item.product_id, name: item.product_name,
          quantity: item.quantity, price: Number(item.unit_price),
        })),
      })) });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user)
    return Response.json(
      { error: "Please sign in before placing an order" },
      { status: 401 },
    );
  const body = await request.json();
  if (
    !body.address || !body.phone ||
    !body.paymentMethod ||
    !body.amount ||
    !body.items?.length
  )
    return Response.json({ error: "Incomplete order" }, { status: 400 });
  const db = getServerSupabase();
  const { data: order, error } = await db
    .from("orders")
    .insert({
      customer_email: user.email || user.phone || "customer",
      customer_name:
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Customer",
      address: body.address,
      customer_phone: String(body.phone).slice(0, 20),
      delivery_instructions: String(body.deliveryInstructions || "").slice(0, 300),
      payment_method: body.paymentMethod,
      amount: body.amount,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const { error: itemError } = await db
    .from("order_items")
    .insert(
      body.items.map(
        (item: {
          id: number;
          name: string;
          quantity: number;
          price: number;
        }) => ({
          order_id: order.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
        }),
      ),
    );
  return itemError
    ? Response.json({ error: itemError.message }, { status: 500 })
    : Response.json({ order }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const body = await request.json();
  if (!body.id || !body.status)
    return Response.json(
      { error: "Order id and status required" },
      { status: 400 },
    );
  const { data, error } = await getServerSupabase()
    .from("orders")
    .update({ status: body.status })
    .eq("id", body.id)
    .select()
    .single();
  return error
    ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ order: data });
}
