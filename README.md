# ERP Dubai — Unix Solutions

UAE FTA-Compliant Minimal ERP built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **PostgreSQL** (Prisma ORM).

---

## Modules

| Module | Features |
|---|---|
| Customers | B2B/B2C CRM, 15-digit TRN validation, live AR ledger |
| Suppliers | Vendor directory, Mainland / Free Zone / International toggle, RCM auto-detection |
| Inventory | Item master, SKU/barcode, Weighted Average Costing, tax classification |
| Sales | FTA-compliant sequential invoices, Tax/Simplified Invoice, multi-currency, VAT 5% |
| Purchases | PO receipt, Input VAT recoup, RCM self-assessment, customs/shipping landing cost |
| Commissions | Agent/broker directory, flexible payout basis, VAT on external commissions |
| Accounting | Live P&L, VAT Form 201 by Emirate, Corporate Tax planner (0%/9% thresholds) |

---

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes (Route Handlers)
- **Database**: PostgreSQL via Prisma ORM
- **Double-Entry Engine**: Every transaction posts balanced journal entries (DR = CR)
- **Hosting**: AWS `me-central-1` (UAE) recommended

---

## Setup

### 1. Configure Database
Edit `.env`:
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/erp_dubai?schema=public"
```

### 2. Run Migrations
```bash
npm run db:migrate
```

### 3. Seed Chart of Accounts
```bash
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Chart of Accounts

| Code | Account | Type |
|---|---|---|
| 1000 | Cash & Bank | Asset |
| 1100 | Accounts Receivable | Asset |
| 1200 | Input VAT Recoverable | Asset |
| 1300 | Inventory | Asset |
| 2000 | Accounts Payable | Liability |
| 2100 | Output VAT Payable | Liability |
| 2200 | RCM VAT Payable | Liability |
| 2300 | Commission Payable | Liability |
| 4000 | Sales Revenue | Revenue |
| 5000 | Cost of Goods Sold | Expense |
| 5100 | Commission Expense | Expense |
| 5200 | Import & Customs Expense | Expense |

---

## UAE Compliance Notes

- **VAT**: 5% standard, 0% zero-rated (exports), exempt categories supported
- **RCM**: Auto-applied for Free Zone and International suppliers
- **TRN**: 15-digit validation on all customer/supplier forms
- **Invoices**: Sequential numbering, "Tax Invoice" / "Simplified Tax Invoice" labels
- **Corporate Tax**: 0% up to AED 375,000 | 9% above | AED 3M Small Business Relief
- **Audit Trail**: Hard deletes blocked — cancellations post reverse journal entries
