import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, Empty, Field, PageHeader, Table, inputClass, whatsappButton } from "@/components/ui";
import { recordPayment, updateCustomer } from "@/lib/actions";
import { formatDate, formatINR, invoiceNo } from "@/lib/format";
import { customerLedger, getCustomer, getSettings } from "@/lib/queries";
import { reminderMessage, waLink } from "@/lib/whatsapp";
import { requireUser } from "@/lib/auth";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const customer = await getCustomer(Number(id));
  if (!customer) notFound();
  const [settings, ledger] = await Promise.all([getSettings(), customerLedger(customer.id)]);

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={customer.phone ?? "No phone number"}
        actions={
          <>
            <Link href="/customers" className="self-center text-sm font-medium text-emerald-700 hover:underline">
              ← All customers
            </Link>
            {customer.balance > 0 && customer.phone && (
              <a
                href={waLink(customer.phone, reminderMessage(settings, customer))}
                target="_blank"
                rel="noreferrer"
                className={whatsappButton}
              >
                Send WhatsApp reminder
              </a>
            )}
          </>
        }
      />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Balance</p>
        <p
          className={`mt-1 text-3xl font-semibold tabular-nums ${
            customer.balance > 0 ? "text-red-600" : customer.balance < 0 ? "text-emerald-700" : "text-slate-900"
          }`}
        >
          {formatINR(Math.abs(customer.balance))}
        </p>
        <p className="text-sm text-slate-500">
          {customer.balance > 0 ? "owed to you" : customer.balance < 0 ? "paid in advance" : "all settled"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Record a payment">
          <ActionForm action={recordPayment} className="grid gap-3">
            <input type="hidden" name="customerId" value={customer.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)">
                <input name="amount" type="number" step="0.01" min="0.01" required className={inputClass} />
              </Field>
              <Field label="Method">
                <select name="method" className={inputClass} defaultValue="upi">
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
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
          <ActionForm action={updateCustomer} className="grid gap-3">
            <input type="hidden" name="id" value={customer.id} />
            <Field label="Name">
              <input name="name" required defaultValue={customer.name} className={inputClass} />
            </Field>
            <Field label="WhatsApp / phone">
              <input name="phone" type="tel" defaultValue={customer.phone ?? ""} className={inputClass} />
            </Field>
            <div>
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <Card title="Ledger (khata)" className="lg:col-span-2">
          {ledger.length === 0 ? (
            <Empty>No bills or payments yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Entry</th>
                  <th className="text-right">Bill amount</th>
                  <th className="text-right">Paid</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e) => (
                  <tr key={`${e.kind}-${e.id}`}>
                    <td className="text-slate-500">{formatDate(e.created_at)}</td>
                    <td>
                      {e.kind === "invoice" ? (
                        <Link href={`/invoices/${e.id}`} className="font-medium hover:underline">
                          Bill {invoiceNo(e.id)}
                        </Link>
                      ) : (
                        <span>
                          <Badge tone="good">Payment</Badge> <span className="text-slate-600">{e.method?.toUpperCase()}</span>
                          {e.note && <span className="text-slate-500"> · {e.note}</span>}
                        </span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">{e.debit ? formatINR(e.debit) : ""}</td>
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
