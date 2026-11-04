import Link from "next/link";
import { Badge, Card, Empty, PageHeader, Table, primaryButton } from "@/components/ui";
import { formatDate, formatINR, invoiceNo } from "@/lib/format";
import { listInvoices } from "@/lib/queries";
import { requireUser } from "@/lib/auth";

export default async function InvoicesPage() {
  await requireUser();
  const invoices = await listInvoices();

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={invoices.length === 200 ? "Showing the latest 200 bills" : `${invoices.length} bills`}
        actions={
          <Link href="/billing" className={primaryButton}>
            + New bill
          </Link>
        }
      />
      <Card>
        {invoices.length === 0 ? (
          <Empty>No bills yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Bill</th>
                <th>Date</th>
                <th>Customer</th>
                <th className="text-right">Items</th>
                <th className="text-right">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                      {invoiceNo(inv.id)}
                    </Link>
                  </td>
                  <td className="text-slate-500">{formatDate(inv.created_at)}</td>
                  <td>{inv.customer_name ?? <span className="text-slate-400">Walk-in</span>}</td>
                  <td className="text-right tabular-nums">{inv.item_count}</td>
                  <td className="text-right font-semibold tabular-nums">{formatINR(inv.total)}</td>
                  <td className="text-right">
                    {inv.paid < inv.total ? (
                      <Badge tone="warn">{formatINR(inv.total - inv.paid)} on credit</Badge>
                    ) : (
                      <Badge tone="good">Paid</Badge>
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
