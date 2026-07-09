import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const s = await prisma.companySetting.findUnique({ where: { id: "singleton" } });
  return NextResponse.json(s ?? {});
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const {
    companyName, trn, address, emirate, phone, email,
    logoUrl, defaultCurrency, invoicePrefix, poPrefix,
    paymentTermsDays, vatRate,
  } = body;

  const setting = await prisma.companySetting.upsert({
    where: { id: "singleton" },
    update: {
      companyName, trn, address, emirate, phone, email,
      logoUrl, defaultCurrency, invoicePrefix, poPrefix,
      paymentTermsDays: Number(paymentTermsDays),
      vatRate: Number(vatRate),
    },
    create: {
      id: "singleton",
      companyName, trn, address, emirate, phone, email,
      logoUrl, defaultCurrency, invoicePrefix, poPrefix,
      paymentTermsDays: Number(paymentTermsDays),
      vatRate: Number(vatRate),
    },
  });

  return NextResponse.json(setting);
}
