import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, Empty, Field, PageHeader, Table, inputClass } from "@/components/ui";
import { addProduct } from "@/lib/actions";
import { formatINR, formatQty } from "@/lib/format";
import { listProducts } from "@/lib/queries";
import { requireUser } from "@/lib/auth";

export default async function ProductsPage() {
  await requireUser();
  const products = await listProducts();
  const stockValue = products.reduce((sum, p) => sum + Math.max(p.stock, 0) * p.cost, 0);

  return (
    <>
      <PageHeader
        title="Products & stock"
        subtitle={`${products.length} products · stock value ${formatINR(Math.round(stockValue))} (at cost)`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          {products.length === 0 ? (
            <Empty>No products yet. Add your first one using the form.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Stock</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const low = p.stock <= p.reorder_level;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                          {p.name}
                        </Link>
                        {p.sku && <span className="ml-2 text-xs text-slate-500">{p.sku}</span>}
                      </td>
                      <td className="text-right tabular-nums">{formatINR(p.price)}</td>
                      <td className="text-right tabular-nums text-slate-500">{formatINR(p.cost)}</td>
                      <td className="text-right tabular-nums">
                        {formatQty(p.stock)} {p.unit}
                      </td>
                      <td className="text-right">
                        {p.stock <= 0 ? <Badge tone="bad">Out</Badge> : low ? <Badge tone="warn">Low</Badge> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Add product" className="h-fit">
          <ActionForm action={addProduct} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Field label="Name">
              <input name="name" required className={inputClass} placeholder="e.g. Toor Dal 1kg" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit">
                <input name="unit" className={inputClass} placeholder="pcs" />
              </Field>
              <Field label="SKU / code">
                <input name="sku" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Selling price (₹)">
                <input name="price" type="number" step="0.01" min="0" required className={inputClass} />
              </Field>
              <Field label="Cost price (₹)">
                <input name="cost" type="number" step="0.01" min="0" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Opening stock">
                <input name="stock" type="number" step="any" min="0" className={inputClass} />
              </Field>
              <Field label="Alert when below">
                <input name="reorder_level" type="number" step="any" min="0" className={inputClass} />
              </Field>
            </div>
            <div>
              <SubmitButton>Add product</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
