import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const accounts = [
  // Assets
  { code: "1000", name: "Cash & Bank", type: "ASSET" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET" },
  { code: "1200", name: "Input VAT Recoverable", type: "ASSET" },
  { code: "1300", name: "Inventory", type: "ASSET" },
  { code: "1400", name: "Prepaid Expenses", type: "ASSET" },
  // Liabilities
  { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
  { code: "2100", name: "Output VAT Payable", type: "LIABILITY" },
  { code: "2200", name: "RCM VAT Payable", type: "LIABILITY" },
  { code: "2300", name: "Commission Payable", type: "LIABILITY" },
  { code: "2400", name: "Corporate Tax Payable", type: "LIABILITY" },
  // Equity
  { code: "3000", name: "Owner Equity", type: "EQUITY" },
  { code: "3100", name: "Retained Earnings", type: "EQUITY" },
  // Revenue
  { code: "4000", name: "Sales Revenue", type: "REVENUE" },
  { code: "4100", name: "Zero-Rated Sales", type: "REVENUE" },
  { code: "4200", name: "Exempt Sales", type: "REVENUE" },
  // Expenses
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
  { code: "5100", name: "Commission Expense", type: "EXPENSE" },
  { code: "5200", name: "Import & Customs Expense", type: "EXPENSE" },
  { code: "5300", name: "Operating Expenses", type: "EXPENSE" },
  { code: "5400", name: "Corporate Tax Expense", type: "EXPENSE" },
] as const;

async function main() {
  // ── Chart of Accounts ────────────────────────────────────────────────────
  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {},
      create: acc,
    });
  }
  console.log("✅ Chart of Accounts seeded");

  // ── Super Admin User ─────────────────────────────────────────────────────
  const adminEmail = "admin@erpdubai.com";
  const adminPassword = await bcrypt.hash("Admin@1234", 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Super Admin",
      email: adminEmail,
      password: adminPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log("✅ Super Admin seeded");
  console.log("   Email   : admin@erpdubai.com");
  console.log("   Password: Admin@1234");
  console.log("   Role    : SUPER_ADMIN");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
