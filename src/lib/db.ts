import { neon, Pool, type NeonQueryFunction, type PoolClient } from "@neondatabase/serverless";

// All money columns are stored as integer paise (₹1 = 100) to avoid float rounding.
// Aggregates are cast to float8 so the driver returns JS numbers instead of strings.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id            SERIAL PRIMARY KEY,
    name          TEXT             NOT NULL,
    sku           TEXT,
    unit          TEXT             NOT NULL DEFAULT 'pcs',
    price         INTEGER          NOT NULL DEFAULT 0,
    cost          INTEGER          NOT NULL DEFAULT 0,
    stock         DOUBLE PRECISION NOT NULL DEFAULT 0,
    reorder_level DOUBLE PRECISION NOT NULL DEFAULT 0,
    active        BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ      NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id         SERIAL PRIMARY KEY,
    name       TEXT        NOT NULL,
    phone      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id             SERIAL PRIMARY KEY,
    customer_id    INTEGER REFERENCES customers(id),
    subtotal       INTEGER     NOT NULL,
    discount       INTEGER     NOT NULL DEFAULT 0,
    total          INTEGER     NOT NULL,
    paid           INTEGER     NOT NULL DEFAULT 0,
    payment_method TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS invoice_items (
    id         SERIAL PRIMARY KEY,
    invoice_id INTEGER          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    name       TEXT             NOT NULL,
    qty        DOUBLE PRECISION NOT NULL,
    price      INTEGER          NOT NULL,
    cost       INTEGER          NOT NULL DEFAULT 0,
    amount     INTEGER          NOT NULL
  )`,
  // Payments received later against a customer's dues (payment at billing lives on invoices.paid).
  `CREATE TABLE IF NOT EXISTS payments (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER     NOT NULL REFERENCES customers(id),
    amount      INTEGER     NOT NULL,
    method      TEXT        NOT NULL DEFAULT 'cash',
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Every stock change is recorded, so stock levels can always be explained.
  `CREATE TABLE IF NOT EXISTS stock_movements (
    id         SERIAL PRIMARY KEY,
    product_id INTEGER          NOT NULL REFERENCES products(id),
    change     DOUBLE PRECISION NOT NULL,
    reason     TEXT             NOT NULL,
    invoice_id INTEGER REFERENCES invoices(id),
    note       TEXT,
    created_at TIMESTAMPTZ      NOT NULL DEFAULT now()
  )`,
  // Logins. role is 'owner' (everything) or 'staff' (no settings or user management).
  `CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          TEXT        NOT NULL,
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
    active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Only a SHA-256 hash of each session token is stored, so a leaked table can't be used to log in.
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id)`,
];

type Param = string | number | boolean | null;

// Two connections to the same database:
//  - HTTP (`neon()`): one HTTPS request per query. Used for everyday reads and single writes;
//    it copes much better with slow or flaky networks than a WebSocket.
//  - Pool (WebSocket): only for multi-step transactions such as billing, which HTTP can't do.
// Both are reused across hot reloads in development.
const globalForDb = globalThis as unknown as {
  erpSql?: NeonQueryFunction<false, false>;
  erpPool?: Pool;
  erpReady?: Promise<void>;
};

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  return url;
}

function http() {
  return (globalForDb.erpSql ??= neon(databaseUrl()));
}

function pool() {
  return (globalForDb.erpPool ??= new Pool({ connectionString: databaseUrl(), max: 5 }));
}

function ready() {
  globalForDb.erpReady ??= http()
    .transaction(SCHEMA.map((statement) => http().query(statement)))
    .then(() => undefined)
    .catch((error) => {
      globalForDb.erpReady = undefined; // retry on the next request
      throw error;
    });
  return globalForDb.erpReady;
}

// Queries are written with "?" placeholders; Postgres wants $1, $2, …
function numbered(sql: string) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

// SQL errors from Postgres carry a `code`; anything else is a network problem worth retrying.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isSqlError = typeof error === "object" && error !== null && "code" in error && Boolean(error.code);
      if (isSqlError || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
}

// Reads are safe to retry. Writes are not (a retried insert could run twice), so `run` isn't retried.
async function read(sql: string, params: Param[]) {
  await ready();
  return withRetry(() => http().query(numbered(sql), params));
}

export async function all<T>(sql: string, ...params: Param[]) {
  return (await read(sql, params)) as T[];
}

export async function get<T>(sql: string, ...params: Param[]) {
  return (await read(sql, params))[0] as T | undefined;
}

export async function run(sql: string, ...params: Param[]) {
  await ready();
  const rows = await http().query(numbered(sql), params);
  return { id: Number(rows[0]?.id ?? 0) };
}

function txHelpers(client: PoolClient) {
  return {
    async all<T>(sql: string, ...params: Param[]) {
      return (await client.query(numbered(sql), params)).rows as T[];
    },
    async get<T>(sql: string, ...params: Param[]) {
      return (await client.query(numbered(sql), params)).rows[0] as T | undefined;
    },
    async run(sql: string, ...params: Param[]) {
      const result = await client.query(numbered(sql), params);
      return { id: Number(result.rows[0]?.id ?? 0) };
    },
  };
}

export type Tx = ReturnType<typeof txHelpers>;

export async function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  await ready();
  const client = await withRetry(() => pool().connect());
  let broken = false;
  try {
    await client.query("BEGIN");
    const result = await fn(txHelpers(client));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    // If even ROLLBACK fails the connection is dead; drop it instead of reusing it.
    await client.query("ROLLBACK").catch(() => (broken = true));
    throw error;
  } finally {
    client.release(broken);
  }
}
