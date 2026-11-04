"use client";

import { useMemo, useState, useTransition } from "react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Card, Field, inputClass, primaryButton } from "@/components/ui";
import { createInvoice } from "@/lib/actions";
import { formatINR, formatQty, toPaise } from "@/lib/format";
import type { Product } from "@/lib/queries";

type CustomerOption = { id: number; name: string; phone: string | null; balance: number };

export function BillingForm({ products, customers }: { products: Product[]; customers: CustomerOption[] }) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Map<number, number>>(new Map());
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [discount, setDiscount] = useState("");
  const [paidInput, setPaidInput] = useState<string | null>(null); // null = "paid in full"
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }, [products, search]);

  const lines = [...cart].flatMap(([id, qty]) => {
    const product = byId.get(id);
    return product ? [{ product, qty, amount: Math.round(product.price * qty) }] : [];
  });
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const discountPaise = Math.min(toPaise(Number(discount) || 0), subtotal);
  const total = subtotal - discountPaise;
  const paidPaise = paidInput === null ? total : toPaise(Number(paidInput) || 0);
  const due = Math.max(total - paidPaise, 0);
  const customer = customers.find((c) => c.id === customerId);

  function setQty(id: number, qty: number) {
    setCart((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(id);
      else next.set(id, qty);
      return next;
    });
  }

  function add(product: Product) {
    const qty = (cart.get(product.id) ?? 0) + 1;
    if (qty > product.stock) {
      setError(`Only ${formatQty(product.stock)} ${product.unit} of ${product.name} left in stock.`);
      return;
    }
    setQty(product.id, qty);
    setError(null);
  }

  // A scanned barcode (or typed code) that exactly matches a product's code wins over a name search.
  function addByCode(code: string) {
    const q = code.trim().toLowerCase();
    if (!q) return;
    const product =
      products.find((p) => p.sku?.toLowerCase() === q) ??
      products.find((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    if (!product) {
      setError(`Nothing matches “${code.trim()}”.`);
      return;
    }
    add(product);
    setSearch("");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createInvoice({
        customerId,
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
        discount: Number(discount) || 0,
        paid: paidPaise / 100,
        method,
      });
      // On success the action redirects to the new invoice, so we only get here on errors.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <Card>
        <div className="mb-4 flex gap-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addByCode(search);
              }
            }}
            placeholder="Search product or scan barcode, then press Enter…"
            className={`${inputClass} py-3 text-base`}
          />
          <BarcodeScanner onCode={addByCode} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {matches.map((p) => {
            const inCart = cart.get(p.id) ?? 0;
            const outOfStock = p.stock - inCart <= 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => add(p)}
                disabled={outOfStock}
                className={`rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  inCart ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-400"
                }`}
              >
                <span className="block text-sm font-medium leading-snug">{p.name}</span>
                <span className="mt-1 flex items-baseline justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-900">{formatINR(p.price)}</span>
                  <span className={p.stock <= p.reorder_level ? "text-amber-600" : "text-slate-500"}>
                    {formatQty(p.stock - inCart)} {p.unit}
                  </span>
                </span>
              </button>
            );
          })}
          {matches.length === 0 && <p className="col-span-full text-sm text-slate-500">No products match “{search}”.</p>}
        </div>
      </Card>

      <Card title="Bill" className="h-fit lg:sticky lg:top-8">
        {lines.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">No items yet.</p>
        ) : (
          <ul className="mb-4 divide-y divide-slate-100">
            {lines.map(({ product, qty, amount }) => (
              <li key={product.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{product.name}</span>
                  <span className="text-xs text-slate-500">{formatINR(product.price)} each</span>
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQty(product.id, qty - 1)}
                    className="h-7 w-7 rounded border border-slate-300 text-sm hover:bg-slate-50"
                    aria-label={`Decrease ${product.name}`}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={qty}
                    onChange={(e) => setQty(product.id, Number(e.target.value))}
                    className="h-7 w-14 rounded border border-slate-300 text-center text-sm tabular-nums"
                    aria-label={`Quantity of ${product.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => setQty(product.id, qty + 1)}
                    disabled={qty + 1 > product.stock}
                    className="h-7 w-7 rounded border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-40"
                    aria-label={`Increase ${product.name}`}
                  >
                    +
                  </button>
                </span>
                <span className="w-20 text-right text-sm font-semibold tabular-nums">{formatINR(amount)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3">
          <Field label="Customer">
            <select
              value={customerId ?? ""}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}
              className={inputClass}
            >
              <option value="">Walk-in customer (pays now)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.balance > 0 ? ` (owes ${formatINR(c.balance)})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount (₹)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Payment method">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </Field>
          </div>

          <Field label="Amount paid now (₹)" hint={customer ? "Anything unpaid is added to their dues." : undefined}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={paidInput ?? (total / 100).toString()}
              onChange={(e) => setPaidInput(e.target.value)}
              className={inputClass}
            />
          </Field>

          <dl className="space-y-1 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="tabular-nums">{formatINR(subtotal)}</dd>
            </div>
            {discountPaise > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Discount</dt>
                <dd className="tabular-nums">−{formatINR(discountPaise)}</dd>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatINR(total)}</dd>
            </div>
            {due > 0 && (
              <div className="flex justify-between font-medium text-amber-600">
                <dt>On credit</dt>
                <dd className="tabular-nums">{formatINR(due)}</dd>
              </div>
            )}
          </dl>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={pending || lines.length === 0}
            className={`${primaryButton} py-3 text-base`}
          >
            {pending ? "Saving…" : `Save bill · ${formatINR(total)}`}
          </button>
        </div>
      </Card>
    </div>
  );
}
