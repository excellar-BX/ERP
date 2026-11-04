import Link from "next/link";
import { Badge, Card, Empty, PageHeader, Table, primaryButton, secondaryButton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, formatINR, purchaseNo } from "@/lib/format";
import { listPurchases } from "@/lib/queries";

export default async function PurchasesPage() {
  await requireUser();
  const purchases = await listPurchases();
  const openOrders = purchases.filter((p) => p.status === "ordered").length;

  return (
    <>
      <PageHeader
        title="Purchases"
        subtitle={`${purchases.length} purchases · ${openOrders} orders waiting for delivery`}
        actions={
          <>
            <Link href="/purchases/new?lowstock=1" className={secondaryButton}>
              Reorder low stock
            </Link>
            <Link href="/purchases/new" className={primaryButton}>
              + New purchase
            </Link>
          </>
        }
      />
      <Card>
        {purchases.length === 0 ? (
          <Empty>No purchases yet. Record goods you buy so stock and cost prices stay correct.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Purchase</th>
                <th>Supplier</th>
                <th>Date</th>
                <th className="text-right">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/purchases/${p.id}`} className="font-medium hover:underline">
                      {purchaseNo(p.id)}
                    </Link>
                    <span className="ml-2 text-xs text-slate-500">{p.item_count} items</span>
                  </td>
                  <td>{p.supplier_name}</td>
                  <td className="text-slate-500">{formatDate(p.received_at ?? p.created_at, false)}</td>
                  <td className="text-right font-semibold tabular-nums">{formatINR(p.total)}</td>
                  <td className="text-right">
                    {p.status === "ordered" ? (
                      <Badge tone="warn">Ordered</Badge>
                    ) : p.paid < p.total ? (
                      <Badge tone="bad">Unpaid {formatINR(p.total - p.paid)}</Badge>
                    ) : (
                      <Badge tone="good">Received</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
