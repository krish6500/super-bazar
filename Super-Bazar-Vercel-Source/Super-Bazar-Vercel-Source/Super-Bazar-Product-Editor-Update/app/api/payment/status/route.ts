import { getServerSupabase } from "../../../lib/supabase-server";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Session required" }, { status: 400 });
  const { data } = await getServerSupabase()
    .from("payment_sessions")
    .select("status,expires_at")
    .eq("id", id)
    .single();
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({
    status:
      Date.now() > data.expires_at && data.status === "awaiting_merchant"
        ? "expired"
        : data.status,
  });
}
