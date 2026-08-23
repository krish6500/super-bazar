import { createClient, type User } from "@supabase/supabase-js";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getServerSupabase() {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function getRequestUser(request: Request): Promise<User | null> {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await getServerSupabase().auth.getUser(token);
  return error ? null : data.user;
}

export async function requireAdmin(request: Request) {
  const user = await getRequestUser(request);
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!user?.email || !adminEmail || user.email.toLowerCase() !== adminEmail) {
    return {
      user: null,
      response: Response.json(
        { error: "Admin access required" },
        { status: 403 },
      ),
    };
  }
  return { user, response: null };
}
