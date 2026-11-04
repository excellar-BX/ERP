import Link from "next/link";
import { Empty, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { toRupees } from "@/lib/format";
import { listProducts, listSuppliers, type Product } from "@/lib/queries";
import { PurchaseForm, type Line } from "./PurchaseForm";

// How much to order for a low-stock item: enough to get back to twice its reorder level.
function suggestedQty(p: Product) {
  return Math.max(Math.ceil(p.reorder_level * 2 - p.stock), 1);
}

// /purchases/new?lowstock=1 starts a draft order with every low-stock item already filled in.
export default async function NewPurchasePage({ searchParams }: { searchParams: Promise<{ lowstock?: string }> }) {
  await requireUser();
  const { lowstock } = await searchParams;
  const [products, suppliers] = await Promise.all([listProducts(), listSuppliers()]);
  const initialLines: Line[] = lowstock
    ? products
        .filter((p) => p.stock <= p.reorder_level)
        .map((p) => ({ productId: p.id, qty: String(suggestedQty(p)), cost: String(toRupees(p.cost)) }))
    : [];

  return (
    <>
      <PageHeader
        title={lowstock ? "Reorder low-stock items" : "New purchase"}
        subtitle={
          lowstock
            ? "Quantities are suggested to bring stock back to twice the reorder level. Adjust as needed."
            : "Record goods bought from a supplier, or prepare an order to send them."
        }
        actions={
          <Link href="/purchases" className="self-center text-sm font-medium text-emerald-700 hover:underline">
            ← All purchases
          </Link>
        }
      />
      {suppliers.length === 0 || products.length === 0 ? (
        <Empty>
          {suppliers.length === 0 ? (
            <>
              Add a supplier first on the{" "}
              <Link href="/suppliers" className="font-medium text-emerald-700 underline">
                Suppliers
              </Link>{" "}
              page.
            </>
          ) : (
            <>
              Add products first on the{" "}
              <Link href="/products" className="font-medium text-emerald-700 underline">
                Products
              </Link>{" "}
              page.
            </>
          )}
        </Empty>
      ) : (
        <PurchaseForm
          products={products}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          initialLines={initialLines}
        />
      )}
    </>
  );
}
