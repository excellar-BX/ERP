import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, Empty, Field, PageHeader, Table, inputClass, primaryButton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, formatINR, purchaseNo } from "@/lib/format";
import { recordSupplierPayment, updateSupplier } from "@/lib/purchase-actions";
import { getSupplier, supplierLedger } from "@/lib/queries";

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const supplier = await getSupplier(Number(id));
  if (!supplier) notFound();
  const ledger = await supplierLedger(supplier.id);

  return (
    <>
      <PageHeader
        title={supplier.name}
        subtitle={supplier.phone ?? "No phone number"}
        actions={
          <>
            <Link href="/suppliers" className="self-center text-sm font-medium text-emerald-700 hover:underline">
              ← All suppliers
            </Link>
            <Link href="/purchases/new" className={primaryButton}>
              + New purchase
            </Link>
          </>
        }
      />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Balance</p>
        <p
          className={`mt-1 text-3xl font-semibold tabular-nums ${
            supplier.balance > 0 ? "text-red-600" : supplier.balance < 0 ? "text-emerald-700" : "text-slate-900"
          }`}
        >
          {formatINR(Math.abs(supplier.balance))}
        </p>
        <p className="text-sm text-slate-500">
          {supplier.balance > 0 ? "you owe them" : supplier.balance < 0 ? "paid in advance" : "all settled"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Record a payment to them">
          <ActionForm action={recordSupplierPayment} className="grid gap-3">
            <input type="hidden" name="supplierId" value={supplier.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)">
                <input name="amount" type="number" step="0.01" min="0.01" required className={inputClass} />
              </Field>
              <Field label="Method">
                <select name="method" className={inputClass} defaultValue="upi">
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank transfer</option>
                </select>
              </Field>
            </div>
            <Field label="Note (optional)">
              <input name="note" className={inputClass} />
            </Field>
            <div>
              <SubmitButton>Record payment</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <Card title="Details">
          <ActionForm action={updateSupplier} className="grid gap-3">
            <input type="hidden" name="id" value={supplier.id} />
            <Field label="Name">
              <input name="name" required defaultValue={supplier.name} className={inputClass} />
            </Field>
            <Field label="WhatsApp / phone">
              <input name="phone" type="tel" defaultValue={supplier.phone ?? ""} className={inputClass} />
            </Field>
            <div>
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <Card title="Ledger" className="lg:col-span-2">
          {ledger.length === 0 ? (
            <Empty>No purchases or payments yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Entry</th>
                  <th className="text-right">Purchase amount</th>
                  <th className="text-right">Paid</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e) => (
                  <tr key={`${e.kind}-${e.id}`}>
                    <td className="text-slate-500">{formatDate(e.created_at)}</td>
                    <td>
                      {e.kind === "purchase" ? (
                        <span>
                          <Link href={`/purchases/${e.id}`} className="font-medium hover:underline">
                            Purchase {purchaseNo(e.id)}
                          </Link>
                          {e.status === "ordered" && (
                            <>
                              {" "}
                              <Badge tone="warn">Ordered</Badge>
                            </>
                          )}
                        </span>
                      ) : (
                        <span>
                          <Badge tone="good">Payment</Badge> <span className="text-slate-600">{e.method?.toUpperCase()}</span>
                          {e.note && <span className="text-slate-500"> · {e.note}</span>}
                        </span>
                      )}
                    </td>
                    <td className={`text-right tabular-nums ${e.status === "ordered" ? "text-slate-400" : ""}`}>
                      {e.debit ? formatINR(e.debit) : ""}
                    </td>
                    <td className="text-right tabular-nums text-emerald-700">{e.credit ? formatINR(e.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
