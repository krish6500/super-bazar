import { getServerSupabase, requireAdmin } from "../../lib/supabase-server";

export async function GET() {
  const { data, error } = await getServerSupabase()
    .from("banners")
    .select("*")
    .eq("active", true)
    .order("id", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    banners: (data || []).map((b) => ({
      ...b,
      desktopUrl: `/api/banners/${b.id}?size=desktop`,
      mobileUrl: `/api/banners/${b.id}?size=mobile`,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const form = await request.formData();
  const title = String(form.get("title") || "").trim();
  const desktop = form.get("desktop");
  const mobile = form.get("mobile");
  if (!title || !(desktop instanceof File) || !(mobile instanceof File))
    return Response.json(
      { error: "Title and both images are required" },
      { status: 400 },
    );
  if (
    !desktop.type.startsWith("image/") ||
    !mobile.type.startsWith("image/") ||
    desktop.size > 5_000_000 ||
    mobile.size > 5_000_000
  )
    return Response.json(
      { error: "Use image files under 5 MB" },
      { status: 400 },
    );
  const db = getServerSupabase();
  const key = crypto.randomUUID();
  const desktopKey = `${key}-desktop`;
  const mobileKey = `${key}-mobile`;
  const [a, b] = await Promise.all([
    db.storage
      .from("banners")
      .upload(desktopKey, desktop, { contentType: desktop.type }),
    db.storage
      .from("banners")
      .upload(mobileKey, mobile, { contentType: mobile.type }),
  ]);
  if (a.error || b.error)
    return Response.json(
      { error: a.error?.message || b.error?.message },
      { status: 500 },
    );
  const { data, error } = await db
    .from("banners")
    .insert({ title, desktop_key: desktopKey, mobile_key: mobileKey })
    .select()
    .single();
  return error
    ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ banner: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id)
    return Response.json({ error: "Banner id required" }, { status: 400 });
  const { error } = await getServerSupabase()
    .from("banners")
    .update({ active: false })
    .eq("id", id);
  return error
    ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ removed: true });
}
