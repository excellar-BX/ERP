import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, Field, PageHeader, Table, dangerButton, inputClass, whatsappButton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, formatINR, formatQty, purchaseNo } from "@/lib/format";
import { cancelPurchase, receivePurchase } from "@/lib/purchase-actions";
import { getPurchase, getSettings } from "@/lib/queries";
import { purchaseOrderMessage, waLink } from "@/lib/whatsapp";

export default async function PurchasePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const purchase = await getPurchase(Number(id));
  if (!purchase) notFound();
  const settings = await getSettings();
  const ordered = purchase.status === "ordered";
  const due = purchase.total - purchase.paid;

  return (
    <>
      <PageHeader
        title={`Purchase ${purchaseNo(purchase.id)}`}
        subtitle={
          ordered
            ? `Ordered ${formatDate(purchase.created_at)}`
            : `Received ${formatDate(purchase.received_at ?? purchase.created_at)}`
        }
        actions={
          <>
            <Link href="/purchases" className="self-center text-sm font-medium text-emerald-700 hover:underline">
              ← All purchases
            </Link>
            {ordered && purchase.supplier_phone && (
              <a
                href={waLink(purchase.supplier_phone, purchaseOrderMessage(settings, purchase))}
                target="_blank"
                rel="noreferrer"
                className={whatsappButton}
              >
                Send order on WhatsApp
              </a>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card
          title={purchase.supplier_name}
          action={
            ordered ? (
              <Badge tone="warn">Waiting for delivery</Badge>
            ) : due > 0 ? (
              <Badge tone="bad">{formatINR(due)} unpaid</Badge>
            ) : (
              <Badge tone="good">Paid</Badge>
            )
          }
        >
          <Table>
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/products/${item.product_id}`} className="hover:underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="text-right tabular-nums">
                    {formatQty(item.qty)} {item.unit}
                  </td>
                  <td className="text-right tabular-nums">{formatINR(item.cost)}</td>
                  <td className="text-right tabular-nums">{formatINR(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <dl className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between text-lg font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatINR(purchase.total)}</dd>
            </div>
            {!ordered && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Paid{purchase.payment_method ? ` (${purchase.payment_method.toUpperCase()})` : ""}</dt>
                <dd className="tabular-nums">{formatINR(purchase.paid)}</dd>
              </div>
            )}
          </dl>
          {purchase.note && <p className="mt-3 text-sm text-slate-600">Note: {purchase.note}</p>}
          <p className="mt-3 text-sm">
            <Link href={`/suppliers/${purchase.supplier_id}`} className="font-medium text-emerald-700 hover:underline">
              Supplier ledger →
            </Link>
          </p>
        </Card>

        {ordered && (
          <div className="grid h-fit gap-6">
            <Card title="Goods arrived?">
              <ActionForm action={receivePurchase} className="grid gap-3">
                <input type="hidden" name="id" value={purchase.id} />
                <p className="text-sm text-slate-600">Adds every item to stock and updates cost prices.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Paid now (₹)" hint="Empty = on credit.">
                    <input name="paid" type="number" step="0.01" min="0" className={inputClass} />
                  </Field>
                  <Field label="Method">
                    <select name="method" className={inputClass}>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank">Bank transfer</option>
                    </select>
                  </Field>
                </div>
                <div>
                  <SubmitButton>Mark as received</SubmitButton>
                </div>
              </ActionForm>
            </Card>
            <form action={cancelPurchase}>
              <input type="hidden" name="id" value={purchase.id} />
              <button type="submit" className={dangerButton}>
                Cancel this order
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
