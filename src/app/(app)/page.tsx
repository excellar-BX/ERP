import Link from "next/link";
import { Badge, Card, Empty, PageHeader, Stat, primaryButton, secondaryButton, whatsappButton } from "@/components/ui";
import { formatDate, formatINR, formatQty, invoiceNo } from "@/lib/format";
import { customersWithDues, dailySummary, getSettings, listInvoices, lowStockProducts } from "@/lib/queries";
import { reminderMessage, summaryMessage, waLink } from "@/lib/whatsapp";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();
  const [settings, summary, lowStockAll, dues, recent] = await Promise.all([
    getSettings(),
    dailySummary(),
    lowStockProducts(),
    customersWithDues(6),
    listInvoices(6),
  ]);
  const lowStock = lowStockAll.slice(0, 8);
  const setupNeeded = user.role === "owner" && (!settings.ownerWhatsapp || !settings.upiId);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Today, ${formatDate(summary.date, false)}`}
        actions={
          <>
            <a
              href={waLink(settings.ownerWhatsapp, summaryMessage(settings, summary))}
              target="_blank"
              rel="noreferrer"
              className={whatsappButton}
            >
              Send today&apos;s summary
            </a>
            <Link href="/billing" className={primaryButton}>
              + New bill
            </Link>
          </>
        }
      />

      {setupNeeded && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Finish setting up: add your <strong>UPI ID</strong> and <strong>WhatsApp number</strong> in{" "}
          <Link href="/settings" className="font-medium underline">
            Settings
          </Link>{" "}
          so reminders include a payment link and the daily summary goes to you.
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Today's sales" value={formatINR(summary.sales)} hint={`${summary.bills} bills`} />
        <Stat label="Collected today" value={formatINR(summary.collected)} tone="good" hint="At billing + dues paid" />
        <Stat label="Credit given today" value={formatINR(summary.creditGiven)} tone="warn" />
        <Stat label="Gross profit today" value={formatINR(summary.grossProfit)} tone="good" />
        <Stat
          label="Dues outstanding"
          value={formatINR(summary.outstanding)}
          tone={summary.outstanding > 0 ? "bad" : "default"}
          hint="All customers"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title={`Low stock (${summary.lowStockCount})`}
          action={
            summary.lowStockCount > 0 ? (
              <Link href="/purchases/new?lowstock=1" className={secondaryButton}>
                Reorder
              </Link>
            ) : (
              <Link href="/products" className="text-sm font-medium text-emerald-700 hover:underline">
                All products
              </Link>
            )
          }
        >
          {lowStock.length === 0 ? (
            <Empty>All items are above their reorder level. 👍</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <span className="flex items-center gap-2 text-sm">
                    <Badge tone={p.stock <= 0 ? "bad" : "warn"}>
                      {formatQty(p.stock)} {p.unit} left
                    </Badge>
                    <span className="hidden text-slate-500 sm:inline">reorder at {formatQty(p.reorder_level)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Collect dues"
          action={
            <Link href="/customers" className="text-sm font-medium text-emerald-700 hover:underline">
              All customers
            </Link>
          }
        >
          {dues.length === 0 ? (
            <Empty>No pending dues. 🎉</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {dues.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/customers/${c.id}`} className="min-w-0 truncate font-medium hover:underline">
                    {c.name}
                  </Link>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold tabular-nums text-red-600">{formatINR(c.balance)}</span>
                    {c.phone && (
                      <a
                        href={waLink(c.phone, reminderMessage(settings, c))}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-emerald-700 hover:underline"
                      >
                        Remind
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Top sellers today">
          {summary.topProducts.length === 0 ? (
            <Empty>No sales yet today.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.topProducts.map((p) => (
                <li key={p.name} className="flex justify-between gap-3 py-2.5">
                  <span className="font-medium">{p.name}</span>
                  <span className="tabular-nums text-slate-600">
                    {formatQty(p.qty)} · {formatINR(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent bills"
          action={
            <Link href="/invoices" className={secondaryButton}>
              View all
            </Link>
          }
        >
          {recent.length === 0 ? (
            <Empty>
              No bills yet.{" "}
              <Link href="/billing" className="font-medium text-emerald-700 underline">
                Create the first one
              </Link>
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/invoices/${inv.id}`} className="min-w-0 hover:underline">
                    <span className="font-medium">{invoiceNo(inv.id)}</span>{" "}
                    <span className="text-sm text-slate-500">{inv.customer_name ?? "Walk-in"}</span>
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    {inv.paid < inv.total && <Badge tone="warn">Credit</Badge>}
                    <span className="font-semibold tabular-nums">{formatINR(inv.total)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
