import { formatINR, formatQty, invoiceNo, toRupees } from "./format";
import type { Customer, DailySummary, Settings, getInvoice } from "./queries";

// Messages are sent through WhatsApp "click to chat" links: one tap opens WhatsApp with
// the message already written. Fully automatic sending needs the WhatsApp Business API (roadmap).

export function normalizePhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`; // default to India
  return digits;
}

export function waLink(phone: string | null | undefined, message: string) {
  const number = normalizePhone(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function upiLink(settings: Settings, amountPaise: number, note: string) {
  if (!settings.upiId) return null;
  const params = new URLSearchParams({
    pa: settings.upiId,
    pn: settings.businessName,
    am: toRupees(amountPaise).toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

export function reminderMessage(settings: Settings, customer: Pick<Customer, "name" | "balance">) {
  const lines = [
    `Namaste ${customer.name} 🙏`,
    ``,
    `This is a friendly reminder from *${settings.businessName}*.`,
    `Your pending balance is *${formatINR(customer.balance)}*.`,
  ];
  if (settings.upiId) {
    lines.push(``, `Pay by UPI: ${settings.upiId}`);
    const link = upiLink(settings, customer.balance, `Dues - ${settings.businessName}`);
    if (link) lines.push(link);
  }
  lines.push(``, `Thank you!`);
  return lines.join("\n");
}

export function invoiceMessage(settings: Settings, invoice: NonNullable<Awaited<ReturnType<typeof getInvoice>>>) {
  const lines = [
    `*${settings.businessName}*`,
    `Bill ${invoiceNo(invoice.id)}`,
    ``,
    ...invoice.items.map((item) => `${item.name} × ${formatQty(item.qty)} = ${formatINR(item.amount)}`),
    ``,
  ];
  if (invoice.discount > 0) lines.push(`Discount: -${formatINR(invoice.discount)}`);
  lines.push(`*Total: ${formatINR(invoice.total)}*`, `Paid: ${formatINR(invoice.paid)}`);
  const due = invoice.total - invoice.paid;
  if (due > 0) lines.push(`Balance due: ${formatINR(due)}`);
  lines.push(``, `Thank you for shopping with us!`);
  return lines.join("\n");
}

export function summaryMessage(settings: Settings, summary: DailySummary) {
  const lines = [
    `📊 *${settings.businessName}: daily summary (${summary.date})*`,
    ``,
    `Sales: ${formatINR(summary.sales)} (${summary.bills} bills)`,
    `Cash collected: ${formatINR(summary.collected)}`,
    `Given on credit: ${formatINR(summary.creditGiven)}`,
    `Gross profit: ${formatINR(summary.grossProfit)}`,
    `Total dues outstanding: ${formatINR(summary.outstanding)}`,
    `Low-stock items: ${summary.lowStockCount}`,
  ];
  if (summary.topProducts.length > 0) {
    lines.push(``, `Top sellers:`);
    for (const p of summary.topProducts) lines.push(`• ${p.name}: ${formatQty(p.qty)} (${formatINR(p.amount)})`);
  }
  return lines.join("\n");
}
