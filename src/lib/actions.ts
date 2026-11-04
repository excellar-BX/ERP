"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { get, run, transaction } from "./db";
import { formatQty, toPaise } from "./format";
import { SETTING_KEYS, type Product } from "./queries";

export type FormState = { error?: string; ok?: string };

// Errors meant for the person using the form (as opposed to bugs).
class UserError extends Error {}

const refresh = () => revalidatePath("/", "layout");

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function amount(fd: FormData, key: string, label: string, { allowNegative = false } = {}) {
  const raw = text(fd, key);
  const value = raw === "" ? 0 : Number(raw);
  if (!Number.isFinite(value) || (!allowNegative && value < 0)) throw new UserError(`${label} must be a valid number.`);
  return value;
}

async function handle(fn: () => Promise<string>): Promise<FormState> {
  try {
    const ok = await fn();
    refresh();
    return { ok };
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
}

// ---------- Settings ----------

export async function saveSettings(_: FormState, fd: FormData) {
  return handle(async () => {
    if (!text(fd, "businessName")) throw new UserError("Business name is required.");
    await transaction(async (tx) => {
      for (const key of SETTING_KEYS) {
        await tx.run(
          "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
          key,
          text(fd, key),
        );
      }
    });
    return "Settings saved.";
  });
}

// ---------- Products ----------

export async function addProduct(_: FormState, fd: FormData) {
  return handle(async () => {
    const name = text(fd, "name");
    if (!name) throw new UserError("Product name is required.");
    const stock = amount(fd, "stock", "Opening stock");
    const price = toPaise(amount(fd, "price", "Selling price"));
    const cost = toPaise(amount(fd, "cost", "Cost price"));
    const reorderLevel = amount(fd, "reorder_level", "Reorder level");
    await transaction(async (tx) => {
      const { id } = await tx.run(
        `INSERT INTO products (name, sku, unit, price, cost, stock, reorder_level)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        name,
        text(fd, "sku") || null,
        text(fd, "unit") || "pcs",
        price,
        cost,
        stock,
        reorderLevel,
      );
      if (stock > 0) {
        await tx.run("INSERT INTO stock_movements (product_id, change, reason) VALUES (?, ?, 'opening')", id, stock);
      }
    });
    return `Added ${name}.`;
  });
}

export async function updateProduct(_: FormState, fd: FormData) {
  return handle(async () => {
    const name = text(fd, "name");
    if (!name) throw new UserError("Product name is required.");
    await run(
      "UPDATE products SET name = ?, sku = ?, unit = ?, price = ?, cost = ?, reorder_level = ? WHERE id = ?",
      name,
      text(fd, "sku") || null,
      text(fd, "unit") || "pcs",
      toPaise(amount(fd, "price", "Selling price")),
      toPaise(amount(fd, "cost", "Cost price")),
      amount(fd, "reorder_level", "Reorder level"),
      Number(fd.get("id")),
    );
    return "Product updated.";
  });
}

export async function adjustStock(_: FormState, fd: FormData) {
  return handle(async () => {
    const id = Number(fd.get("id"));
    const reason = text(fd, "reason") === "adjust" ? "adjust" : "restock";
    const change = amount(fd, "change", "Quantity", { allowNegative: reason === "adjust" });
    if (change === 0) throw new UserError("Enter a quantity.");
    await transaction(async (tx) => {
      const product = await tx.get<Product>("SELECT stock FROM products WHERE id = ? AND active FOR UPDATE", id);
      if (!product) throw new UserError("Product not found.");
      if (product.stock + change < 0) throw new UserError(`Stock can't go below zero (current: ${formatQty(product.stock)}).`);
      await tx.run("UPDATE products SET stock = stock + ? WHERE id = ?", change, id);
      await tx.run(
        "INSERT INTO stock_movements (product_id, change, reason, note) VALUES (?, ?, ?, ?)",
        id,
        change,
        reason,
        text(fd, "note") || null,
      );
    });
    return reason === "restock" ? `Added ${formatQty(change)} to stock.` : "Stock adjusted.";
  });
}

export async function archiveProduct(fd: FormData) {
  await run("UPDATE products SET active = FALSE WHERE id = ?", Number(fd.get("id")));
  refresh();
  redirect("/products");
}

// ---------- Customers ----------

function phoneFrom(fd: FormData) {
  const phone = text(fd, "phone");
  const digits = phone.replace(/\D/g, "");
  if (phone && (digits.length < 10 || digits.length > 13)) throw new UserError("Enter a valid phone number (10 digits).");
  return phone || null;
}

export async function addCustomer(_: FormState, fd: FormData) {
  return handle(async () => {
    const name = text(fd, "name");
    if (!name) throw new UserError("Customer name is required.");
    await run("INSERT INTO customers (name, phone) VALUES (?, ?)", name, phoneFrom(fd));
    return `Added ${name}.`;
  });
}

export async function updateCustomer(_: FormState, fd: FormData) {
  return handle(async () => {
    const name = text(fd, "name");
    if (!name) throw new UserError("Customer name is required.");
    await run("UPDATE customers SET name = ?, phone = ? WHERE id = ?", name, phoneFrom(fd), Number(fd.get("id")));
    return "Customer updated.";
  });
}

export async function recordPayment(_: FormState, fd: FormData) {
  return handle(async () => {
    const customerId = Number(fd.get("customerId"));
    const paise = toPaise(amount(fd, "amount", "Amount"));
    if (paise <= 0) throw new UserError("Enter the amount received.");
    if (!(await get("SELECT id FROM customers WHERE id = ?", customerId))) throw new UserError("Customer not found.");
    await run(
      "INSERT INTO payments (customer_id, amount, method, note) VALUES (?, ?, ?, ?)",
      customerId,
      paise,
      text(fd, "method") || "cash",
      text(fd, "note") || null,
    );
    return "Payment recorded.";
  });
}

// ---------- Billing ----------

export type NewInvoice = {
  customerId: number | null;
  items: { productId: number; qty: number }[];
  discount: number; // rupees
  paid: number; // rupees
  method: string;
};

export async function createInvoice(input: NewInvoice): Promise<FormState> {
  let invoiceId: number;
  try {
    invoiceId = await transaction(async (tx) => {
      // Merge duplicate lines, and always use prices from the database, never from the browser.
      const quantities = new Map<number, number>();
      for (const item of input.items) {
        if (!Number.isFinite(item.qty) || item.qty <= 0) throw new UserError("Quantities must be more than zero.");
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.qty);
      }
      if (quantities.size === 0) throw new UserError("Add at least one item to the bill.");

      let subtotal = 0;
      const lines = [];
      for (const [productId, qty] of quantities) {
        // Lock the row so two counters can't sell the same last unit.
        const product = await tx.get<Product>("SELECT * FROM products WHERE id = ? AND active FOR UPDATE", productId);
        if (!product) throw new UserError("An item on this bill no longer exists.");
        if (qty > product.stock) {
          throw new UserError(`Only ${formatQty(product.stock)} ${product.unit} of ${product.name} left in stock.`);
        }
        const lineAmount = Math.round(product.price * qty);
        subtotal += lineAmount;
        lines.push({ product, qty, amount: lineAmount });
      }

      const discount = toPaise(input.discount || 0);
      if (discount < 0 || discount > subtotal) throw new UserError("Discount can't be more than the bill amount.");
      const total = subtotal - discount;
      const paid = toPaise(input.paid || 0);
      if (paid < 0) throw new UserError("Amount paid can't be negative.");
      if (paid > total) throw new UserError("Amount paid is more than the total. Enter the bill amount and give change.");

      if (input.customerId === null) {
        if (paid < total) throw new UserError("Select a customer to sell on credit.");
      } else if (!(await tx.get("SELECT id FROM customers WHERE id = ?", input.customerId))) {
        throw new UserError("Customer not found.");
      }

      const { id } = await tx.run(
        `INSERT INTO invoices (customer_id, subtotal, discount, total, paid, payment_method)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
        input.customerId,
        subtotal,
        discount,
        total,
        paid,
        paid > 0 ? input.method || "cash" : null,
      );
      for (const line of lines) {
        await tx.run(
          "INSERT INTO invoice_items (invoice_id, product_id, name, qty, price, cost, amount) VALUES (?, ?, ?, ?, ?, ?, ?)",
          id,
          line.product.id,
          line.product.name,
          line.qty,
          line.product.price,
          line.product.cost,
          line.amount,
        );
        await tx.run("UPDATE products SET stock = stock - ? WHERE id = ?", line.qty, line.product.id);
        await tx.run(
          "INSERT INTO stock_movements (product_id, change, reason, invoice_id) VALUES (?, ?, 'sale', ?)",
          line.product.id,
          -line.qty,
          id,
        );
      }
      return id;
    });
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
  refresh();
  redirect(`/invoices/${invoiceId}`);
}

// ---------- Demo data ----------

export async function loadDemoData() {
  return handle(async () => {
    if (await get("SELECT id FROM products LIMIT 1")) throw new UserError("Demo data can only be loaded into an empty shop.");
    await transaction(async (tx) => {
      const products: [string, string, number, number, number, number][] = [
        ["Basmati Rice 5kg", "bag", 650, 540, 24, 5],
        ["Toor Dal 1kg", "pkt", 160, 128, 40, 10],
        ["Sunflower Oil 1L", "btl", 145, 120, 3, 8],
        ["Sugar 1kg", "pkt", 48, 40, 60, 15],
        ["Tea Powder 250g", "pkt", 130, 100, 18, 6],
        ["Bathing Soap", "pcs", 38, 28, 4, 12],
        ["Toothpaste 150g", "pcs", 95, 74, 22, 6],
        ["Wheat Atta 5kg", "bag", 280, 235, 2, 5],
      ];
      for (const [name, unit, price, cost, stock, reorder] of products) {
        const { id } = await tx.run(
          "INSERT INTO products (name, unit, price, cost, stock, reorder_level) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
          name,
          unit,
          toPaise(price),
          toPaise(cost),
          stock,
          reorder,
        );
        await tx.run("INSERT INTO stock_movements (product_id, change, reason) VALUES (?, ?, 'opening')", id, stock);
      }
      for (const [name, phone] of [
        ["Ramesh Kumar", "9876543210"],
        ["Priya Sharma", "9123456780"],
        ["Anil Traders", "9988776655"],
      ]) {
        await tx.run("INSERT INTO customers (name, phone) VALUES (?, ?)", name, phone);
      }
    });
    return "Demo products and customers added.";
  });
}
