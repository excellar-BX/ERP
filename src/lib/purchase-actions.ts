"use server";

import { redirect } from "next/navigation";
import { requireUser } from "./auth";
import { get, run, transaction, type Tx } from "./db";
import { UserError, amount, handle, phoneFrom, refresh, text, type FormState } from "./form";
import { toPaise } from "./format";

// ---------- Suppliers ----------

export async function addSupplier(_: FormState, fd: FormData) {
  await requireUser();
  return handle(async () => {
    const name = text(fd, "name");
    if (!name) throw new UserError("Supplier name is required.");
    await run("INSERT INTO suppliers (name, phone) VALUES (?, ?)", name, phoneFrom(fd));
    return `Added ${name}.`;
  });
}

export async function updateSupplier(_: FormState, fd: FormData) {
  await requireUser();
  return handle(async () => {
    const name = text(fd, "name");
    if (!name) throw new UserError("Supplier name is required.");
    await run("UPDATE suppliers SET name = ?, phone = ? WHERE id = ?", name, phoneFrom(fd), Number(fd.get("id")));
    return "Supplier updated.";
  });
}

export async function recordSupplierPayment(_: FormState, fd: FormData) {
  await requireUser();
  return handle(async () => {
    const supplierId = Number(fd.get("supplierId"));
    const paise = toPaise(amount(fd, "amount", "Amount"));
    if (paise <= 0) throw new UserError("Enter the amount paid.");
    if (!(await get("SELECT id FROM suppliers WHERE id = ?", supplierId))) throw new UserError("Supplier not found.");
    await run(
      "INSERT INTO supplier_payments (supplier_id, amount, method, note) VALUES (?, ?, ?, ?)",
      supplierId,
      paise,
      text(fd, "method") || "cash",
      text(fd, "note") || null,
    );
    return "Payment recorded.";
  });
}

// ---------- Purchases ----------

export type NewPurchase = {
  supplierId: number;
  items: { productId: number; qty: number; cost: number }[]; // cost in rupees per unit
  receive: boolean; // true: goods are here now; false: save as an order to send to the supplier
  paid: number; // rupees, only when receiving
  method: string;
  note: string;
};

// Adds a purchase's items to stock and makes their cost the product's current cost price.
async function receiveItems(tx: Tx, purchaseId: number) {
  const items = await tx.all<{ product_id: number; qty: number; cost: number }>(
    "SELECT product_id, qty, cost FROM purchase_items WHERE purchase_id = ?",
    purchaseId,
  );
  for (const item of items) {
    await tx.run("UPDATE products SET stock = stock + ?, cost = ? WHERE id = ?", item.qty, item.cost, item.product_id);
    await tx.run(
      "INSERT INTO stock_movements (product_id, change, reason, purchase_id) VALUES (?, ?, 'purchase', ?)",
      item.product_id,
      item.qty,
      purchaseId,
    );
  }
}

function checkPaid(paid: number, total: number) {
  if (paid < 0) throw new UserError("Amount paid can't be negative.");
  if (paid > total) throw new UserError("Amount paid is more than the purchase total.");
}

export async function createPurchase(input: NewPurchase): Promise<FormState> {
  await requireUser();
  let purchaseId: number;
  try {
    purchaseId = await transaction(async (tx) => {
      if (!(await tx.get("SELECT id FROM suppliers WHERE id = ?", input.supplierId))) {
        throw new UserError("Select a supplier.");
      }
      const lines = [];
      let total = 0;
      for (const item of input.items) {
        if (!Number.isFinite(item.qty) || item.qty <= 0) throw new UserError("Quantities must be more than zero.");
        if (!Number.isFinite(item.cost) || item.cost < 0) throw new UserError("Cost prices must be valid numbers.");
        const product = await tx.get<{ id: number; name: string }>(
          "SELECT id, name FROM products WHERE id = ? AND active",
          item.productId,
        );
        if (!product) throw new UserError("A product on this purchase no longer exists.");
        const cost = toPaise(item.cost);
        const lineAmount = Math.round(cost * item.qty);
        total += lineAmount;
        lines.push({ product, qty: item.qty, cost, amount: lineAmount });
      }
      if (lines.length === 0) throw new UserError("Add at least one item.");

      const paid = input.receive ? toPaise(input.paid || 0) : 0;
      checkPaid(paid, total);

      const { id } = await tx.run(
        `INSERT INTO purchases (supplier_id, status, total, paid, payment_method, note, received_at)
         VALUES (?, ?, ?, ?, ?, ?, ${input.receive ? "now()" : "NULL"}) RETURNING id`,
        input.supplierId,
        input.receive ? "received" : "ordered",
        total,
        paid,
        paid > 0 ? input.method || "cash" : null,
        input.note.trim() || null,
      );
      for (const line of lines) {
        await tx.run(
          "INSERT INTO purchase_items (purchase_id, product_id, name, qty, cost, amount) VALUES (?, ?, ?, ?, ?, ?)",
          id,
          line.product.id,
          line.product.name,
          line.qty,
          line.cost,
          line.amount,
        );
      }
      if (input.receive) await receiveItems(tx, id);
      return id;
    });
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
  refresh();
  redirect(`/purchases/${purchaseId}`);
}

// The ordered goods have arrived: add them to stock.
export async function receivePurchase(_: FormState, fd: FormData) {
  await requireUser();
  return handle(async () => {
    const id = Number(fd.get("id"));
    const paid = toPaise(amount(fd, "paid", "Amount paid"));
    await transaction(async (tx) => {
      // The lock stops the same order being received twice from two screens.
      const purchase = await tx.get<{ status: string; total: number }>(
        "SELECT status, total FROM purchases WHERE id = ? FOR UPDATE",
        id,
      );
      if (!purchase) throw new UserError("Purchase not found.");
      if (purchase.status === "received") throw new UserError("This order was already received.");
      checkPaid(paid, purchase.total);
      await tx.run(
        "UPDATE purchases SET status = 'received', received_at = now(), paid = ?, payment_method = ? WHERE id = ?",
        paid,
        paid > 0 ? text(fd, "method") || "cash" : null,
        id,
      );
      await receiveItems(tx, id);
    });
    return "Goods received. Stock updated.";
  });
}

export async function cancelPurchase(fd: FormData) {
  await requireUser();
  await run("DELETE FROM purchases WHERE id = ? AND status = 'ordered'", Number(fd.get("id")));
  refresh();
  redirect("/purchases");
}
