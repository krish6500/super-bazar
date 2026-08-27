type InvoiceItem = { product_name: string; quantity: number; unit_price: number };
type InvoiceOrder = {
  id: number; customer_name: string; customer_email: string; customer_phone?: string;
  address: string; payment_method: string; amount: number; status: string;
  created_at: string; order_items: InvoiceItem[];
};

const safe = (value: unknown) => String(value ?? "").normalize("NFKD")
  .replace(/[^\x20-\x7E]/g, "").replace(/([\\()])/g, "\\$1");

export function createInvoicePdf(order: InvoiceOrder) {
  const lines: Array<{ text: string; size?: number; bold?: boolean }> = [
    { text: "SUPER BAZAR", size: 22, bold: true },
    { text: "Tax Invoice / Customer Bill", size: 12, bold: true },
    { text: "" },
    { text: `Invoice: SB${String(order.id).padStart(4, "0")}` },
    { text: `Date: ${new Date(order.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` },
    { text: `Status: ${order.status}` },
    { text: `Payment: ${order.payment_method}` },
    { text: "" },
    { text: "BILL TO", size: 11, bold: true },
    { text: order.customer_name },
    { text: order.customer_email },
    { text: order.customer_phone || "" },
    ...wrap(order.address, 78).map((text) => ({ text })),
    { text: "" },
    { text: "ITEMS", size: 11, bold: true },
    { text: "Product                                      Qty      Rate      Amount", bold: true },
    { text: "--------------------------------------------------------------------------" },
  ];
  for (const item of order.order_items || []) {
    const name = safe(item.product_name).slice(0, 40).padEnd(43);
    const qty = String(item.quantity).padStart(3);
    const rate = Number(item.unit_price).toFixed(2).padStart(9);
    const amount = (Number(item.unit_price) * item.quantity).toFixed(2).padStart(10);
    lines.push({ text: `${name}${qty}${rate}${amount}` });
  }
  lines.push(
    { text: "--------------------------------------------------------------------------" },
    { text: `TOTAL                                                  Rs. ${Number(order.amount).toFixed(2)}`, size: 13, bold: true },
    { text: "" },
    { text: "Thank you for shopping with Super Bazar." },
    { text: "This is a computer-generated invoice." },
  );

  let y = 800;
  const commands = ["BT"];
  for (const line of lines.slice(0, 48)) {
    const size = line.size || 10;
    commands.push(`/${line.bold ? "F2" : "F1"} ${size} Tf`, `1 0 0 1 48 ${y} Tm`, `(${safe(line.text)}) Tj`);
    y -= line.text ? Math.max(14, size + 4) : 9;
  }
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

function wrap(value: string, width: number) {
  const words = safe(value).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width) { if (line) lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
}
