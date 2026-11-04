import { all, get } from "./db";
import { BUSINESS_TZ } from "./format";

export type Settings = {
  businessName: string;
  address: string;
  phone: string;
  gstin: string;
  upiId: string;
  ownerWhatsapp: string;
};

export const SETTING_KEYS = ["businessName", "address", "phone", "gstin", "upiId", "ownerWhatsapp"] as const;

const DEFAULT_SETTINGS: Settings = {
  businessName: "My Shop",
  address: "",
  phone: "",
  gstin: "",
  upiId: "",
  ownerWhatsapp: "",
};

export async function getSettings(): Promise<Settings> {
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of await all<{ key: string; value: string }>("SELECT key, value FROM settings")) {
    if (row.key in settings) settings[row.key as keyof Settings] = row.value;
  }
  return settings;
}

// ---------- Products ----------

export type Product = {
  id: number;
  name: string;
  sku: string | null;
  unit: string;
  price: number;
  cost: number;
  stock: number;
  reorder_level: number;
  created_at: Date;
};

const PRODUCT_COLUMNS = "id, name, sku, unit, price, cost, stock, reorder_level, created_at";

export function listProducts() {
  return all<Product>(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE active ORDER BY lower(name)`);
}

export function getProduct(id: number) {
  return get<Product>(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ? AND active`, id);
}

export function lowStockProducts() {
  return all<Product>(
    `SELECT ${PRODUCT_COLUMNS} FROM products
      WHERE active AND stock <= reorder_level
      ORDER BY stock - reorder_level, lower(name)`,
  );
}

export type StockMovement = {
  id: number;
  change: number;
  reason: string;
  invoice_id: number | null;
  purchase_id: number | null;
  note: string | null;
  created_at: Date;
};

export function productMovements(productId: number) {
  return all<StockMovement>(
    `SELECT id, change, reason, invoice_id, purchase_id, note, created_at
       FROM stock_movements WHERE product_id = ? ORDER BY id DESC LIMIT 50`,
    productId,
  );
}

// ---------- Customers ----------

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  created_at: Date;
  balance: number;
  last_invoice_at: Date | null;
};

// Balance = credit given on bills − payments received later. Positive means the customer owes us.
const CUSTOMER_SQL = `
  SELECT c.id, c.name, c.phone, c.created_at,
    (COALESCE((SELECT SUM(total - paid) FROM invoices WHERE customer_id = c.id), 0)
      - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id), 0))::float8 AS balance,
    (SELECT MAX(created_at) FROM invoices WHERE customer_id = c.id) AS last_invoice_at
  FROM customers c`;

export function listCustomers() {
  return all<Customer>(`SELECT * FROM (${CUSTOMER_SQL}) t ORDER BY balance DESC, lower(name)`);
}

export function getCustomer(id: number) {
  return get<Customer>(`${CUSTOMER_SQL} WHERE c.id = ?`, id);
}

export function customersWithDues(limit = 100) {
  return all<Customer>(`SELECT * FROM (${CUSTOMER_SQL}) t WHERE balance > 0 ORDER BY balance DESC LIMIT ?`, limit);
}

export type LedgerEntry = {
  kind: "invoice" | "payment";
  id: number;
  created_at: Date;
  debit: number;
  credit: number;
  method: string | null;
  note: string | null;
};

export function customerLedger(customerId: number) {
  return all<LedgerEntry>(
    `SELECT 'invoice' AS kind, id, created_at, total AS debit, paid AS credit, payment_method AS method, NULL AS note
       FROM invoices WHERE customer_id = ?
     UNION ALL
     SELECT 'payment' AS kind, id, created_at, 0 AS debit, amount AS credit, method, note
       FROM payments WHERE customer_id = ?
     ORDER BY created_at DESC, kind DESC`,
    customerId,
    customerId,
  );
}

// ---------- Invoices ----------

export type InvoiceRow = {
  id: number;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  payment_method: string | null;
  created_at: Date;
  item_count: number;
};

const INVOICE_SQL = `
  SELECT i.*, c.name AS customer_name, c.phone AS customer_phone,
    (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id)::int AS item_count
  FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id`;

export function listInvoices(limit = 200) {
  return all<InvoiceRow>(`${INVOICE_SQL} ORDER BY i.id DESC LIMIT ?`, limit);
}

export type InvoiceItem = { id: number; product_id: number | null; name: string; qty: number; price: number; amount: number };

export async function getInvoice(id: number) {
  const invoice = await get<InvoiceRow>(`${INVOICE_SQL} WHERE i.id = ?`, id);
  if (!invoice) return undefined;
  const items = await all<InvoiceItem>(
    "SELECT id, product_id, name, qty, price, amount FROM invoice_items WHERE invoice_id = ? ORDER BY id",
    id,
  );
  return { ...invoice, items };
}

// ---------- Suppliers & purchases ----------

export type Supplier = { id: number; name: string; phone: string | null; created_at: Date; balance: number };

// Balance = received purchases not paid at the time − payments made later. Positive means we owe the supplier.
const SUPPLIER_SQL = `
  SELECT s.id, s.name, s.phone, s.created_at,
    (COALESCE((SELECT SUM(total - paid) FROM purchases WHERE supplier_id = s.id AND status = 'received'), 0)
      - COALESCE((SELECT SUM(amount) FROM supplier_payments WHERE supplier_id = s.id), 0))::float8 AS balance
  FROM suppliers s`;

export function listSuppliers() {
  return all<Supplier>(`SELECT * FROM (${SUPPLIER_SQL}) t ORDER BY balance DESC, lower(name)`);
}

export function getSupplier(id: number) {
  return get<Supplier>(`${SUPPLIER_SQL} WHERE s.id = ?`, id);
}

export type SupplierLedgerEntry = {
  kind: "purchase" | "payment";
  id: number;
  created_at: Date;
  status: "ordered" | "received" | null;
  debit: number;
  credit: number;
  method: string | null;
  note: string | null;
};

export function supplierLedger(supplierId: number) {
  return all<SupplierLedgerEntry>(
    `SELECT 'purchase' AS kind, id, COALESCE(received_at, created_at) AS created_at, status,
            total AS debit, paid AS credit, payment_method AS method, note
       FROM purchases WHERE supplier_id = ?
     UNION ALL
     SELECT 'payment' AS kind, id, created_at, NULL AS status, 0 AS debit, amount AS credit, method, note
       FROM supplier_payments WHERE supplier_id = ?
     ORDER BY created_at DESC, kind DESC`,
    supplierId,
    supplierId,
  );
}

export type PurchaseRow = {
  id: number;
  supplier_id: number;
  supplier_name: string;
  supplier_phone: string | null;
  status: "ordered" | "received";
  total: number;
  paid: number;
  payment_method: string | null;
  note: string | null;
  created_at: Date;
  received_at: Date | null;
  item_count: number;
};

const PURCHASE_SQL = `
  SELECT p.*, s.name AS supplier_name, s.phone AS supplier_phone,
    (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id)::int AS item_count
  FROM purchases p JOIN suppliers s ON s.id = p.supplier_id`;

export function listPurchases(limit = 200) {
  return all<PurchaseRow>(`${PURCHASE_SQL} ORDER BY p.id DESC LIMIT ?`, limit);
}

export type PurchaseItem = { id: number; product_id: number; name: string; unit: string; qty: number; cost: number; amount: number };

export async function getPurchase(id: number) {
  const purchase = await get<PurchaseRow>(`${PURCHASE_SQL} WHERE p.id = ?`, id);
  if (!purchase) return undefined;
  const items = await all<PurchaseItem>(
    `SELECT pi.id, pi.product_id, pi.name, pr.unit, pi.qty, pi.cost, pi.amount
       FROM purchase_items pi JOIN products pr ON pr.id = pi.product_id
      WHERE pi.purchase_id = ? ORDER BY pi.id`,
    id,
  );
  return { ...purchase, items };
}

// ---------- Daily summary ----------

export type DailySummary = {
  date: string;
  bills: number;
  sales: number;
  collected: number;
  creditGiven: number;
  grossProfit: number;
  outstanding: number;
  lowStockCount: number;
  topProducts: { name: string; qty: number; amount: number }[];
};


// One round trip for the whole summary: on a slow connection, fewer requests matter more than query cost.
// "Today" is the calendar day in the shop's time zone, not the server's.
export async function dailySummary(date?: string): Promise<DailySummary> {
  const row = await get<{
    date: string;
    bills: number;
    sales: number;
    paid: number;
    credit: number;
    discount: number;
    dues_collected: number;
    margin: number;
    outstanding: number;
    low_stock: number;
    top_products: DailySummary["topProducts"];
  }>(
    `WITH d AS (SELECT COALESCE(?::date, (now() AT TIME ZONE ?)::date) AS day),
          inv AS (SELECT invoices.* FROM invoices, d WHERE (invoices.created_at AT TIME ZONE ?)::date = d.day)
     SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
       (SELECT COUNT(*) FROM inv)::float8 AS bills,
       (SELECT COALESCE(SUM(total), 0) FROM inv)::float8 AS sales,
       (SELECT COALESCE(SUM(paid), 0) FROM inv)::float8 AS paid,
       (SELECT COALESCE(SUM(total - paid), 0) FROM inv)::float8 AS credit,
       (SELECT COALESCE(SUM(discount), 0) FROM inv)::float8 AS discount,
       (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE (created_at AT TIME ZONE ?)::date = d.day)::float8 AS dues_collected,
       (SELECT COALESCE(SUM(ii.amount - ROUND(ii.cost * ii.qty)), 0)
          FROM invoice_items ii JOIN inv ON inv.id = ii.invoice_id)::float8 AS margin,
       (SELECT COALESCE(SUM(balance), 0) FROM (${CUSTOMER_SQL}) t WHERE balance > 0)::float8 AS outstanding,
       (SELECT COUNT(*) FROM products WHERE active AND stock <= reorder_level)::int AS low_stock,
       (SELECT COALESCE(json_agg(tp), '[]'::json) FROM (
          SELECT ii.name, SUM(ii.qty)::float8 AS qty, SUM(ii.amount)::float8 AS amount
            FROM invoice_items ii JOIN inv ON inv.id = ii.invoice_id
           GROUP BY ii.product_id, ii.name
           ORDER BY amount DESC LIMIT 5) tp) AS top_products
     FROM d`,
    date ?? null,
    BUSINESS_TZ,
    BUSINESS_TZ,
    BUSINESS_TZ,
  );

  return {
    date: row!.date,
    bills: row!.bills,
    sales: row!.sales,
    collected: row!.paid + row!.dues_collected,
    creditGiven: row!.credit,
    grossProfit: row!.margin - row!.discount,
    outstanding: row!.outstanding,
    lowStockCount: row!.low_stock,
    topProducts: row!.top_products,
  };
}

// ---------- Users ----------

export type User = { id: number; name: string; username: string; role: "owner" | "staff" };

export function listUsers() {
  return all<User>("SELECT id, name, username, role FROM users WHERE active ORDER BY role, lower(name)");
}
