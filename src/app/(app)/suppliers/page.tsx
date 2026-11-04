import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, Empty, Field, PageHeader, Table, inputClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { addSupplier } from "@/lib/purchase-actions";
import { listSuppliers } from "@/lib/queries";

export default async function SuppliersPage() {
  await requireUser();
  const suppliers = await listSuppliers();
  const totalOwed = suppliers.reduce((sum, s) => sum + Math.max(s.balance, 0), 0);

  return (
    <>
      <PageHeader title="Suppliers" subtitle={`${suppliers.length} suppliers · you owe ${formatINR(totalOwed)}`} />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          {suppliers.length === 0 ? (
            <Empty>No suppliers yet. Add the wholesalers and distributors you buy from.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th className="text-right">You owe</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/suppliers/${s.id}`} className="font-medium hover:underline">
                        {s.name}
                      </Link>
                      {s.phone && <span className="block text-xs text-slate-500">{s.phone}</span>}
                    </td>
                    <td
                      className={`text-right font-semibold tabular-nums ${
                        s.balance > 0 ? "text-red-600" : s.balance < 0 ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {s.balance < 0 ? `${formatINR(-s.balance)} adv.` : formatINR(s.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Add supplier" className="h-fit">
          <ActionForm action={addSupplier} className="grid gap-3">
            <Field label="Name">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="WhatsApp / phone" hint="Used to send purchase orders.">
              <input name="phone" type="tel" className={inputClass} placeholder="98765 43210" />
            </Field>
            <div>
              <SubmitButton>Add supplier</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
