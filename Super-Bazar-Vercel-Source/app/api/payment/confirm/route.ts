import { getServerSupabase, requireAdmin } from "../../../lib/supabase-server";
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const { sessionId } = await request.json();
  if (!sessionId)
    return Response.json({ error: "Session required" }, { status: 400 });
  const { data, error } = await getServerSupabase()
    .from("payment_sessions")
    .update({ status: "approved" })
    .eq("id", sessionId)
    .eq("status", "awaiting_merchant")
    .select()
    .single();
  return error || !data
    ? Response.json(
        { error: "Payment request already processed or missing" },
        { status: 400 },
      )
    : Response.json({ status: "approved" });
}
