import Link from "next/link";
import { Empty, PageHeader } from "@/components/ui";
import { listCustomers, listProducts } from "@/lib/queries";
import { BillingForm } from "./BillingForm";
import { requireUser } from "@/lib/auth";

export default async function BillingPage() {
  await requireUser();
  const [products, allCustomers] = await Promise.all([listProducts(), listCustomers()]);
  const customers = allCustomers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, balance: c.balance }));

  return (
    <>
      <PageHeader title="New bill" subtitle="Tap products to add them. Stock and dues update automatically." />
      {products.length === 0 ? (
        <Empty>
          Add products first on the{" "}
          <Link href="/products" className="font-medium text-emerald-700 underline">
            Products
          </Link>{" "}
          page, or load demo data in{" "}
          <Link href="/settings" className="font-medium text-emerald-700 underline">
            Settings
          </Link>
          .
        </Empty>
      ) : (
        <BillingForm products={products} customers={customers} />
      )}
    </>
  );
}
