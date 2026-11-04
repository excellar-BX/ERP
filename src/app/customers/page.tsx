import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, Empty, Field, PageHeader, Table, inputClass } from "@/components/ui";
import { addCustomer } from "@/lib/actions";
import { formatDate, formatINR } from "@/lib/format";
import { getSettings, listCustomers } from "@/lib/queries";
import { reminderMessage, waLink } from "@/lib/whatsapp";

export default async function CustomersPage() {
  const [settings, customers] = await Promise.all([getSettings(), listCustomers()]);
  const withDues = customers.filter((c) => c.balance > 0);
  const totalDues = withDues.reduce((sum, c) => sum + c.balance, 0);

  return (
    <>
      <PageHeader
        title="Customers & dues"
        subtitle={`${customers.length} customers · ${withDues.length} owe ${formatINR(totalDues)}`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          {customers.length === 0 ? (
            <Empty>No customers yet. Add regular customers to track their credit (udhaar).</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Last bill</th>
                  <th className="text-right">Balance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      {c.phone && <span className="block text-xs text-slate-500">{c.phone}</span>}
                    </td>
                    <td className="text-slate-500">{c.last_invoice_at ? formatDate(c.last_invoice_at, false) : "—"}</td>
                    <td
                      className={`text-right font-semibold tabular-nums ${
                        c.balance > 0 ? "text-red-600" : c.balance < 0 ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {c.balance < 0 ? `${formatINR(-c.balance)} adv.` : formatINR(c.balance)}
                    </td>
                    <td className="text-right">
                      {c.balance > 0 && c.phone && (
                        <a
                          href={waLink(c.phone, reminderMessage(settings, c))}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-emerald-700 hover:underline"
                        >
                          Send reminder
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Add customer" className="h-fit">
          <ActionForm action={addCustomer} className="grid gap-3">
            <Field label="Name">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="WhatsApp / phone" hint="Used for bills and payment reminders.">
              <input name="phone" type="tel" className={inputClass} placeholder="98765 43210" />
            </Field>
            <div>
              <SubmitButton>Add customer</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
