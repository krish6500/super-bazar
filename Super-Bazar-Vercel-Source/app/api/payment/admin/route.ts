import { getServerSupabase, requireAdmin } from "../../../lib/supabase-server";
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const { data, error } = await getServerSupabase()
    .from("payment_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return error
    ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ sessions: (data || []).map((row) => ({ id: row.id, amount: row.amount, phone: row.phone, status: row.status, createdAt: row.created_at })) });
}
