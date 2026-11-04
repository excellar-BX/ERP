import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, Empty, Field, PageHeader, Table, dangerButton, inputClass } from "@/components/ui";
import { adjustStock, archiveProduct, updateProduct } from "@/lib/actions";
import { formatDate, formatINR, formatQty, invoiceNo, toRupees } from "@/lib/format";
import { getProduct, productMovements } from "@/lib/queries";
import { requireUser } from "@/lib/auth";

const reasonLabels: Record<string, string> = {
  opening: "Opening stock",
  restock: "Restock",
  adjust: "Adjustment",
  sale: "Sale",
};

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const product = await getProduct(Number(id));
  if (!product) notFound();
  const movements = await productMovements(product.id);
  const margin = product.price - product.cost;

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={`${formatQty(product.stock)} ${product.unit} in stock · margin ${formatINR(margin)} per ${product.unit}`}
        actions={
          <Link href="/products" className="text-sm font-medium text-emerald-700 hover:underline">
            ← All products
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Restock or adjust">
          <ActionForm action={adjustStock} className="grid gap-3">
            <input type="hidden" name="id" value={product.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select name="reason" className={inputClass} defaultValue="restock">
                  <option value="restock">Restock (add)</option>
                  <option value="adjust">Correction (+ / −)</option>
                </select>
              </Field>
              <Field label="Quantity" hint="Use a negative number to remove damaged or missing stock.">
                <input name="change" type="number" step="any" required className={inputClass} />
              </Field>
            </div>
            <Field label="Note (optional)">
              <input name="note" className={inputClass} placeholder="e.g. Supplier bill #123" />
            </Field>
            <div>
              <SubmitButton>Update stock</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <Card title="Details">
          <ActionForm action={updateProduct} className="grid gap-3">
            <input type="hidden" name="id" value={product.id} />
            <Field label="Name">
              <input name="name" required defaultValue={product.name} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit">
                <input name="unit" defaultValue={product.unit} className={inputClass} />
              </Field>
              <Field label="Barcode / code">
                <input name="sku" defaultValue={product.sku ?? ""} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Price (₹)">
                <input name="price" type="number" step="0.01" min="0" defaultValue={toRupees(product.price)} className={inputClass} />
              </Field>
              <Field label="Cost (₹)">
                <input name="cost" type="number" step="0.01" min="0" defaultValue={toRupees(product.cost)} className={inputClass} />
              </Field>
              <Field label="Alert below">
                <input name="reorder_level" type="number" step="any" min="0" defaultValue={product.reorder_level} className={inputClass} />
              </Field>
            </div>
            <div>
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </ActionForm>
          <form action={archiveProduct} className="mt-4 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={product.id} />
            <button type="submit" className={dangerButton}>
              Remove product
            </button>
            <span className="ml-3 text-xs text-slate-500">Past bills keep their records.</span>
          </form>
        </Card>

        <Card title="Stock history" className="lg:col-span-2">
          {movements.length === 0 ? (
            <Empty>No stock changes yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th className="text-right">Change</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="text-slate-500">{formatDate(m.created_at)}</td>
                    <td>
                      <Badge tone={m.change < 0 ? "default" : "good"}>{reasonLabels[m.reason] ?? m.reason}</Badge>
                    </td>
                    <td className={`text-right font-medium tabular-nums ${m.change < 0 ? "text-red-600" : "text-emerald-700"}`}>
                      {m.change > 0 ? "+" : ""}
                      {formatQty(m.change)}
                    </td>
                    <td className="text-slate-600">
                      {m.invoice_id ? (
                        <Link href={`/invoices/${m.invoice_id}`} className="hover:underline">
                          {invoiceNo(m.invoice_id)}
                        </Link>
                      ) : (
                        m.note
                      )}
                    </td>
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
