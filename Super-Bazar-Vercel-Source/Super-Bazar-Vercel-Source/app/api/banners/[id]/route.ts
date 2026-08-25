import { getServerSupabase } from "../../../lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getServerSupabase();
  const { data: banner } = await db
    .from("banners")
    .select("*")
    .eq("id", Number(id))
    .eq("active", true)
    .single();
  if (!banner) return new Response("Not found", { status: 404 });
  const size =
    new URL(request.url).searchParams.get("size") === "mobile"
      ? "mobile"
      : "desktop";
  const { data, error } = await db.storage
    .from("banners")
    .download(size === "mobile" ? banner.mobile_key : banner.desktop_key);
  if (error || !data) return new Response("Not found", { status: 404 });
  return new Response(data, {
    headers: {
      "content-type": data.type || "image/jpeg",
      "cache-control": "public, max-age=300",
    },
  });
}
