import {
  getRequestUser,
  getServerSupabase,
} from "../../../lib/supabase-server";
export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user)
    return Response.json({ error: "Please sign in first" }, { status: 401 });
  const body = await request.json();
  if (!body.amount || !body.phone)
    return Response.json(
      { error: "Amount and phone required" },
      { status: 400 },
    );
  const id = crypto.randomUUID();
  const { error } = await getServerSupabase()
    .from("payment_sessions")
    .insert({
      id,
      amount: body.amount,
      phone: body.phone,
      status: "awaiting_merchant",
      expires_at: Date.now() + 15 * 60 * 1000,
    });
  return error
    ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ sessionId: id, status: "awaiting_merchant" });
}
