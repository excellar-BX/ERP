import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { PageHeader, primaryButton, whatsappButton } from "@/components/ui";
import { formatDate, formatINR, formatQty, invoiceNo } from "@/lib/format";
import { getInvoice, getSettings } from "@/lib/queries";
import { invoiceMessage, waLink } from "@/lib/whatsapp";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(Number(id));
  if (!invoice) notFound();
  const settings = await getSettings();
  const due = invoice.total - invoice.paid;

  return (
    <>
      <PageHeader
        title={`Bill ${invoiceNo(invoice.id)}`}
        actions={
          <>
            <PrintButton />
            <a
              href={waLink(invoice.customer_phone, invoiceMessage(settings, invoice))}
              target="_blank"
              rel="noreferrer"
              className={whatsappButton}
            >
              Share on WhatsApp
            </a>
            <Link href="/billing" className={primaryButton}>
              + Next bill
            </Link>
          </>
        }
      />

      <article className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 print:max-w-none print:border-0 print:shadow-none">
        <header className="mb-6 flex flex-wrap justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-xl font-semibold">{settings.businessName}</h2>
            {settings.address && <p className="whitespace-pre-line text-sm text-slate-600">{settings.address}</p>}
            {settings.phone && <p className="text-sm text-slate-600">Ph: {settings.phone}</p>}
            {settings.gstin && <p className="text-sm text-slate-600">GSTIN: {settings.gstin}</p>}
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{invoiceNo(invoice.id)}</p>
            <p className="text-slate-600">{formatDate(invoice.created_at)}</p>
            <p className="mt-2 text-slate-500">Bill to</p>
            {invoice.customer_id ? (
              <Link href={`/customers/${invoice.customer_id}`} className="font-medium hover:underline">
                {invoice.customer_name}
              </Link>
            ) : (
              <p className="font-medium">Walk-in customer</p>
            )}
          </div>
        </header>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Rate</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-right tabular-nums">{formatQty(item.qty)}</td>
                <td className="py-2 text-right tabular-nums">{formatINR(item.price)}</td>
                <td className="py-2 text-right tabular-nums">{formatINR(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-6 max-w-xs space-y-1 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="tabular-nums">{formatINR(invoice.subtotal)}</dd>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Discount</dt>
              <dd className="tabular-nums">−{formatINR(invoice.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatINR(invoice.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Paid{invoice.payment_method ? ` (${invoice.payment_method.toUpperCase()})` : ""}</dt>
            <dd className="tabular-nums">{formatINR(invoice.paid)}</dd>
          </div>
          {due > 0 && (
            <div className="flex justify-between font-medium text-amber-600">
              <dt>Balance due</dt>
              <dd className="tabular-nums">{formatINR(due)}</dd>
            </div>
          )}
        </dl>

        <p className="mt-8 text-center text-sm text-slate-500">Thank you for your business!</p>
      </article>
    </>
  );
}
