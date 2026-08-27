import { getRequestUser, getServerSupabase } from "../../../../lib/supabase-server";
import { createInvoicePdf } from "../../../../lib/invoice-pdf";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await context.params;
  const { data: order, error } = await getServerSupabase().from("orders")
    .select("*, order_items(*)").eq("id", id).single();
  if (error || !order) return Response.json({ error: "Invoice not found" }, { status: 404 });
  const admin = user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
  if (!admin && order.customer_email.toLowerCase() !== user.email?.toLowerCase())
    return Response.json({ error: "Access denied" }, { status: 403 });
  const pdf = createInvoicePdf(order);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="Super-Bazar-SB${String(order.id).padStart(4, "0")}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
