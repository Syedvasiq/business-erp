import { prisma } from "./prisma";

export type CompanySettings = {
  companyName: string;
  trn: string;
  address: string;
  emirate: string;
  phone: string;
  email: string;
  logoUrl: string;
  defaultCurrency: string;
  invoicePrefix: string;
  poPrefix: string;
  paymentTermsDays: number;
  vatRate: number;
};

export async function getSettings(): Promise<CompanySettings> {
  const s = await prisma.companySetting.findUnique({ where: { id: "singleton" } });
  return {
    companyName:      s?.companyName      || "Your Company LLC",
    trn:              s?.trn              || "",
    address:          s?.address          || "",
    emirate:          s?.emirate          || "Dubai",
    phone:            s?.phone            || "",
    email:            s?.email            || "",
    logoUrl:          s?.logoUrl          || "",
    defaultCurrency:  s?.defaultCurrency  || "AED",
    invoicePrefix:    s?.invoicePrefix    || "INV",
    poPrefix:         s?.poPrefix         || "PO",
    paymentTermsDays: s?.paymentTermsDays ?? 30,
    vatRate:          Number(s?.vatRate   ?? 5),
  };
}
