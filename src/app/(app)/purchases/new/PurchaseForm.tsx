"use client";

import { useState, useTransition } from "react";
import { Card, Field, inputClass, primaryButton, secondaryButton } from "@/components/ui";
import { formatINR, formatQty, toPaise, toRupees } from "@/lib/format";
import { createPurchase } from "@/lib/purchase-actions";
import type { Product } from "@/lib/queries";

export type Line = { productId: number; qty: string; cost: string };

export function PurchaseForm({
  products,
  suppliers,
  initialLines,
}: {
  products: Product[];
  suppliers: { id: number; name: string }[];
  initialLines: Line[];
}) {
  const [supplierId, setSupplierId] = useState(suppliers.length === 1 ? suppliers[0].id : 0);
  const [lines, setLines] = useState<Line[]>(initialLines);
  const [pick, setPick] = useState("");
  const [receive, setReceive] = useState(initialLines.length === 0);
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = new Map(products.map((p) => [p.id, p]));
  const total = lines.reduce((sum, l) => sum + Math.round(toPaise(Number(l.cost) || 0) * (Number(l.qty) || 0)), 0);

  function update(index: number, change: Partial<Line>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...change } : line)));
  }

  function addProduct(id: number) {
    const product = byId.get(id);
    if (!product) return;
    if (lines.some((l) => l.productId === id)) {
      setError(`${product.name} is already on this purchase.`);
      return;
    }
    setError(null);
    setLines((prev) => [...prev, { productId: id, qty: "1", cost: String(toRupees(product.cost)) }]);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createPurchase({
        supplierId,
        items: lines.map((l) => ({ productId: l.productId, qty: Number(l.qty), cost: Number(l.cost) })),
        receive,
        paid: Number(paid) || 0,
        method,
        note,
      });
      // On success the action redirects to the purchase, so we only get here on errors.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card title="Items">
        {lines.length > 0 && (
          <ul className="mb-4 divide-y divide-slate-100">
            {lines.map((line, i) => {
              const product = byId.get(line.productId);
              if (!product) return null;
              return (
                <li key={line.productId} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-40 flex-1">
                    <span className="block text-sm font-medium">{product.name}</span>
                    <span className="text-xs text-slate-500">
                      In stock: {formatQty(product.stock)} {product.unit}
                    </span>
                  </span>
                  <label className="text-xs text-slate-500">
                    Qty
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={line.qty}
                      onChange={(e) => update(i, { qty: e.target.value })}
                      className="ml-1 h-8 w-20 rounded border border-slate-300 px-2 text-right text-sm tabular-nums text-slate-900"
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Cost ₹
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.cost}
                      onChange={(e) => update(i, { cost: e.target.value })}
                      className="ml-1 h-8 w-24 rounded border border-slate-300 px-2 text-right text-sm tabular-nums text-slate-900"
                    />
                  </label>
                  <span className="w-24 text-right text-sm font-semibold tabular-nums">
                    {formatINR(Math.round(toPaise(Number(line.cost) || 0) * (Number(line.qty) || 0)))}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                    className="text-sm text-red-600 hover:underline"
                    aria-label={`Remove ${product.name}`}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex gap-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className={inputClass} aria-label="Product to add">
            <option value="">Choose a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({formatQty(p.stock)} {p.unit} in stock)
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!pick}
            onClick={() => {
              addProduct(Number(pick));
              setPick("");
            }}
            className={secondaryButton}
          >
            Add
          </button>
        </div>
      </Card>

      <Card title="Purchase" className="h-fit lg:sticky lg:top-8">
        <div className="grid gap-3">
          <Field label="Supplier">
            <select value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))} className={inputClass}>
              <option value={0}>Choose a supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <fieldset className="grid gap-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="radio" checked={!receive} onChange={() => setReceive(false)} className="mt-1" />
              <span>
                <span className="font-medium">Order only</span>
                <span className="block text-xs text-slate-500">Send it to the supplier; add stock when the goods arrive.</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" checked={receive} onChange={() => setReceive(true)} className="mt-1" />
              <span>
                <span className="font-medium">Goods received now</span>
                <span className="block text-xs text-slate-500">Adds the items to stock straight away.</span>
              </span>
            </label>
          </fieldset>

          {receive && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Paid now (₹)" hint="Leave empty if on credit.">
                <input type="number" step="0.01" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Method">
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank transfer</option>
                </select>
              </Field>
            </div>
          )}

          <Field label="Note (optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </Field>

          <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatINR(total)}</span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={pending || lines.length === 0}
            className={`${primaryButton} py-3 text-base`}
          >
            {pending ? "Saving…" : receive ? "Save & add to stock" : "Save order"}
          </button>
        </div>
      </Card>
    </div>
  );
}
