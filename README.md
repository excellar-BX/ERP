# Smart ERP *(working name)*

**An automation-first ERP that helps businesses work faster and smarter by taking manual, repetitive tasks off their hands.**

Most ERPs are a place to *record* work. This one aims to *do* the routine work for you:

> **"Tell the system once, and it handles the routine work automatically."**

---

## Table of Contents
- [What is an ERP?](#what-is-an-erp)
- [The Problem](#the-problem)
- [Our Approach](#our-approach)
- [Who It's For](#who-its-for)
- [Automations](#automations)
- [Smart (AI-Assisted) Features](#smart-ai-assisted-features)
- [Modules](#modules)
- [Existing ERPs & Where We Fit](#existing-erps--where-we-fit)
- [MVP Scope](#mvp-scope)
- [Roadmap](#roadmap)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Contributing](#contributing)

---

## What is an ERP?

**ERP (Enterprise Resource Planning)** software brings a business's core operations (sales, inventory, purchasing, accounting, staff and customers) into **one system with one shared database**.

When a sale is made, a good ERP automatically:
1. Reduces **stock**
2. Creates the **invoice**
3. Records the payment in **accounts**
4. Updates **sales reports**
5. Flags a **reorder** if stock runs low

---

## The Problem

Many businesses, especially small and local ones, still run on:
- Paper registers and notebooks
- Spreadsheets that don't talk to each other
- Credit (*udhaar*) records kept in someone's memory
- Hours spent re-typing the same data into different places
- Month-end panic to prepare tax reports
- No real-time view of sales, stock or profit

The result is wasted time, mistakes, stock going missing, unpaid dues, and owners who can't see how their business is doing.

---

## Our Approach

| Principle | What it means |
|---|---|
| **Automation-first** | Every feature should remove a manual step, not just digitise it |
| **Simple** | Usable with little or no training |
| **Mobile-first** | Works well on a phone, the device most owners already use |
| **Offline-capable** | Keeps working on unreliable internet and syncs later |
| **Local-friendly** | Local languages, local tax (GST), UPI and WhatsApp |
| **Affordable** | Priced for small businesses, with room to grow |

---

## Who It's For

### Local / small-town businesses
Kirana stores, hardware shops, pharmacies, small manufacturers, wholesalers, tailors, workshops.

**Needs:** fast billing, stock tracking, credit/due tracking, expiry alerts, daily cash and profit view, offline use, local language.

### Urban / growing businesses
Retail chains, restaurants, distributors, e-commerce sellers, clinics, service agencies, factories.

**Needs:** multiple branches and warehouses, integrations (e-commerce, payments, delivery), role-based access, advanced analytics, HR and payroll, audit trails.

| | Local business | Urban business |
|---|---|---|
| Main need | Billing, stock, credit tracking | Multi-location, integrations, analytics |
| Users | 1–5 | 10–500+ |
| Internet | Often unreliable, so offline matters | Cloud-first |
| Budget | Very low | Medium to high |
| Design focus | Simple, mobile, local language | Modular, role-based, API-connected |

> **Strategy:** start with **one niche** (e.g. pharmacies or small wholesalers), build the automations those owners need, then expand.

---

## Automations

The core of the product: replacing repetitive manual tasks.

| Manual task today | Automated with Smart ERP |
|---|---|
| Writing bills by hand | One-tap billing from saved products/customers; barcode scan |
| Chasing customers for dues | **Automatic WhatsApp/SMS reminders** with a UPI payment link |
| Walking the shelves to check stock | **Low-stock alerts** and auto-drafted purchase orders to the usual supplier |
| Typing supplier bills into the books | **Snap a photo/PDF of the bill, read automatically (OCR/AI)** into purchase entries |
| Preparing GST/tax reports at month-end | Reports generated automatically from recorded transactions |
| Calling to ask "how were sales today?" | **Daily summary on WhatsApp/email** every evening |
| Paper attendance registers | Mobile check-in, with automatic salary calculation |
| Updating stock on several platforms | One entry syncs stock everywhere (shop, website, marketplaces) |
| Following up on quotes and leads | Automatic follow-up reminders and messages |
| Checking expiry dates | Alerts before products expire, with discount suggestions |
| Matching bank statements | Auto-match payments to invoices |

---

## Smart (AI-Assisted) Features

- **Sales forecasting:** *"You usually sell 40 units of X in December; order now."*
- **Questions in plain language:** *"Which customers owe me more than ₹10,000?"*
- **Spotting unusual activity:** sudden stock drops, unusual discounts, possible theft
- **Voice entry** in local languages for owners who prefer speaking to typing
- **Smart reorder suggestions** based on sales speed and supplier lead times

---

## Modules

| Module | What it handles |
|---|---|
| **Sales / POS** | Billing, quotations, orders, returns |
| **Inventory** | Stock levels, warehouses, batches, expiry, reorder alerts |
| **Purchasing** | Supplier orders, goods received, supplier bills |
| **Customers (CRM)** | Customer records, credit/dues, follow-ups, loyalty |
| **Accounting** | Ledgers, profit and loss, GST/VAT, receivables and payables |
| **HR / Payroll** | Attendance, salaries, leave |
| **Manufacturing** | Bill of materials, production planning (optional) |
| **Reports & Dashboard** | Daily sales, top products, cash flow, branch comparison |
| **Automation Engine** | Scheduled jobs, triggers, notifications (WhatsApp/SMS/email) |

---

## Existing ERPs & Where We Fit

| Category | Examples | Gap |
|---|---|---|
| Enterprise | SAP S/4HANA, Oracle NetSuite, Microsoft Dynamics 365 | Too costly and complex for small businesses |
| Mid-size / SME | Odoo, ERPNext, Zoho, SAP Business One | Capable, but setup usually needs a consultant |
| Small business tools | Tally Prime, Vyapar, Marg, Busy, Khatabook | Desktop-bound, dated, or too limited; little automation |
| Accounting / POS | QuickBooks, Xero, Square, Loyverse | Cover only one part of the business |

**Our position:** simpler than Odoo/ERPNext, smarter than Tally/Vyapar. **Automation is the main feature**, built for a specific niche, with offline use, local languages and WhatsApp built in.

---

## MVP Scope

The smallest version that still saves real time:

1. **Products & Inventory:** add items, track stock
2. **Billing / Invoices:** fast billing; stock updates automatically
3. **Customers & Dues:** credit tracking with **automatic payment reminders**
4. **Low-stock alerts:** with a suggested reorder
5. **Daily summary report:** sent automatically to the owner

**Success metric:** a business owner can say *"I stopped doing X manually."*

---

## Roadmap

### Phase 0: Foundation
- [ ] Choose target niche and interview 5–10 business owners
- [x] Finalise tech stack and architecture (Next.js + Neon Postgres)
- [x] Set up repository, CI and development environment (GitHub Actions: lint, type-check, build)
- [x] Design database schema (products, stock, customers, invoices, payments)
- [x] Authentication and basic user accounts (owner + staff roles)

### Phase 1: MVP (core loop)
- [x] Product and inventory management
- [x] Fast billing / invoicing (print + share on WhatsApp)
- [x] Customer records and credit/due tracking
- [x] One-tap payment reminders (WhatsApp) with UPI link
- [ ] Fully automatic scheduled reminders (WhatsApp Business API / SMS)
- [x] Low-stock alerts
- [x] Daily summary for the owner (one-tap WhatsApp + `/api/summary`)
- [ ] Scheduled daily summary (sent automatically every evening)
- [x] Simple dashboard (today's sales, dues, low stock)
- [ ] Pilot with 3–5 real businesses

### Phase 2: Operations
- [x] Purchasing: supplier management, purchase orders, goods received
- [x] Auto-drafted purchase orders from low-stock alerts
- [x] Barcode scanning (USB/Bluetooth scanners, plus phone camera on supported browsers)
- [ ] Batch and expiry tracking, with expiry alerts
- [ ] Returns and credit notes
- [ ] Offline mode with background sync
- [ ] Local language support (first 2–3 languages)

### Phase 3: Accounting & Compliance
- [ ] Ledgers, profit and loss, balance sheet
- [ ] GST-ready invoices and automatic GST reports
- [ ] Expense tracking
- [ ] Bank statement import and auto-matching
- [ ] Data export (Excel/PDF, Tally-compatible)

### Phase 4: Team & Growth
- [x] Staff accounts with role-based access (owner / staff)
- [ ] Attendance (mobile check-in) and payroll
- [ ] Multi-branch / multi-warehouse support and stock transfers
- [ ] Audit trail and approval workflows
- [ ] CRM: leads, follow-ups, loyalty points

### Phase 5: Smart Features (AI)
- [ ] OCR: photo of supplier bill read into purchase entries
- [ ] Sales forecasting and smart reorder suggestions
- [ ] Plain-language questions ("Who owes me the most?")
- [ ] Detection of unusual activity (stock, discounts, cash)
- [ ] Voice entry in local languages

### Phase 6: Integrations & Scale
- [ ] E-commerce sync (Shopify, Amazon, etc.)
- [ ] Payment gateway and UPI reconciliation
- [ ] Delivery / logistics integrations
- [ ] Public API and webhooks
- [ ] Custom automation builder ("when X happens, do Y")
- [ ] Niche editions (pharmacy, restaurant, wholesale, manufacturing)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Server Components, Server Actions) + **React 19** |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | **Neon** serverless Postgres via `@neondatabase/serverless` (`Pool`, for real transactions) |
| Messaging | WhatsApp click-to-chat links (`wa.me`) + UPI payment links |

**Planned later:** a job scheduler for automations, the WhatsApp Business API for fully automatic
sending, a PWA for offline use, and AI/OCR services.

---

## Getting Started

**Requirements:** Node.js **22+** (Node 24 recommended) and a [Neon](https://neon.tech) database.

```bash
npm install
cp .env.example .env.local   # then paste your Neon connection string into DATABASE_URL
npm run dev
```

Open http://localhost:3000. On the very first visit you'll be asked to **create the owner account**.
Then go to **Settings** and click **Load demo data** to try it out, or add your own products.

Tables are created automatically on first request. `DATABASE_URL` is only read on the server; never expose it
with a `NEXT_PUBLIC_` prefix or commit `.env.local`. `BUSINESS_TZ` (default `Asia/Kolkata`) sets what "today" means in reports.

### Logins & roles

| Role | Can do |
|---|---|
| **Owner** | Everything, including Settings, demo data, removing products, and adding / removing users |
| **Staff** | Billing, invoices, products & stock, customers & payments |

- The owner adds staff logins under **Settings → Users** (and can reset passwords or remove access).
- Passwords are hashed with scrypt; sessions last 30 days in an `httpOnly` cookie, and only a hash of each
  session token is stored in the database.
- Password guessing is limited: after 5 wrong tries on a username (or 20 from one network) within
  15 minutes, logins are refused for 15 minutes. A successful login clears that username's count.
- `src/proxy.ts` redirects visitors without a session to `/login`; every page, Server Action and API route
  also verifies the session itself (`requireUser()` / `requireOwner()` in `src/lib/auth.ts`).
- `/api/summary` accepts a logged-in user, or `Authorization: Bearer <CRON_SECRET>` for schedulers
  (set `CRON_SECRET` in `.env.local`).

### Project structure

```
src/
  proxy.ts                Redirects logged-out visitors to /login
  app/
    login/                Login + first-run owner setup
    (app)/                Everything behind the login (shared sidebar layout)
      page.tsx            Dashboard (today's numbers, low stock, dues, recent bills)
      billing/            New bill (fast POS-style screen)
      invoices/           Bill list + printable / WhatsApp-shareable bill
      products/           Products, stock, restock & stock history
      customers/          Customers, dues (khata), payments, reminders
      purchases/          Purchase orders, goods received, reorder low stock
      suppliers/          Suppliers, what you owe them, payments made
      settings/           Business details, UPI ID, users, demo data (owner only)
    api/summary/          GET daily summary as JSON (for schedulers)
  components/             Shared UI
  lib/
    db.ts                 Neon connection (HTTP for reads, Pool for transactions), schema
    auth.ts               Passwords, sessions, requireUser() / requireOwner()
    auth-actions.ts       Login, logout, owner setup, user management
    queries.ts            All reads (reports, balances, summaries)
    actions.ts            Writes for products, customers, billing, settings (Server Actions)
    purchase-actions.ts   Writes for suppliers and purchases
    form.ts               Shared helpers for Server Actions (validation, user-facing errors)
    whatsapp.ts           Reminder / bill / summary messages and links
    format.ts             Money (stored as paise), dates, quantities
```

### What works today (MVP)

- **Billing:** tap, search or scan products (a barcode scanner or the phone camera; Enter adds the exact code match, else the top match), quantities, discount, partial payment, walk-in or credit sale
- **Automatic stock updates** on every sale, with a full stock history for each product
- **Low-stock alerts** on the dashboard and products page, with one tap to draft a reorder
- **Purchases:** send an order to a supplier on WhatsApp, then mark it received to add stock and update cost prices; or record goods received straight away
- **Supplier dues:** what you owe each supplier, a ledger, and payments made
- **Customer dues (khata):** balance tracking, a ledger, and payment recording
- **One-tap WhatsApp reminders** with the outstanding amount and a UPI payment link
- **Bills:** printable, and shareable on WhatsApp
- **Daily summary:** sales, cash collected, credit given, gross profit, outstanding dues and top sellers; one tap sends it to the owner on WhatsApp, and it's also available at `/api/summary`

> **Note:** WhatsApp messages currently open pre-filled in WhatsApp for one-tap sending.
> Fully automatic (scheduled) sending needs the WhatsApp Business API, which is on the roadmap.

---

## Contributing

The project is at an early stage. Ideas, feedback and real-world use cases from business owners are very welcome. Open an issue to discuss.
