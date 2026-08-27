import { getServerSupabase, requireAdmin } from "../../../lib/supabase-server";

export const runtime = "nodejs";

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const bucket = "product-images";

function storagePath(publicUrl: string | null) {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const position = publicUrl.indexOf(marker);
  return position >= 0 ? decodeURIComponent(publicUrl.slice(position + marker.length)) : null;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request); if (auth.response) return auth.response;
  const form = await request.formData(); const id = Number(form.get("id")); const image = form.get("image");
  if (!id || !(image instanceof File)) return Response.json({ error: "Product and image are required" }, { status: 400 });
  const extension = extensions[image.type];
  if (!extension) return Response.json({ error: "Use a JPG, PNG or WebP image" }, { status: 400 });
  if (image.size > 5 * 1024 * 1024) return Response.json({ error: "Image must be smaller than 5 MB" }, { status: 400 });

  const supabase = getServerSupabase();
  const { data: current, error: findError } = await supabase.from("products").select("image_url").eq("id", id).single();
  if (findError) return Response.json({ error: findError.message }, { status: 404 });
  const path = `products/${id}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, await image.arrayBuffer(), { contentType: image.type, upsert: false });
  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  const { error: updateError } = await supabase.from("products").update({ image_url: publicData.publicUrl }).eq("id", id);
  if (updateError) { await supabase.storage.from(bucket).remove([path]); return Response.json({ error: updateError.message }, { status: 500 }); }
  const oldPath = storagePath(current.image_url); if (oldPath) await supabase.storage.from(bucket).remove([oldPath]);
  return Response.json({ image_url: publicData.publicUrl });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request); if (auth.response) return auth.response;
  const id = Number(new URL(request.url).searchParams.get("id")); if (!id) return Response.json({ error: "Product id required" }, { status: 400 });
  const supabase = getServerSupabase(); const { data, error } = await supabase.from("products").select("image_url").eq("id", id).single();
  if (error) return Response.json({ error: error.message }, { status: 404 });
  const { error: updateError } = await supabase.from("products").update({ image_url: null }).eq("id", id);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  const oldPath = storagePath(data.image_url); if (oldPath) await supabase.storage.from(bucket).remove([oldPath]);
  return Response.json({ removed: true });
}
