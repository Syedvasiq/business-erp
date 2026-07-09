import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SUPPORTED = ["USD", "EUR", "GBP", "SAR"] as const;
type Currency = typeof SUPPORTED[number];

async function fetchLiveRates(): Promise<Record<Currency, number>> {
  const res = await fetch(
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aed.min.json",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Exchange API fetch failed");
  const json = await res.json();
  // json.aed = { usd: 0.272..., eur: 0.239... } — AED→foreign, invert to get foreign→AED
  const aedRates = json.aed as Record<string, number>;
  const rates: Record<string, number> = {};
  for (const cur of SUPPORTED) {
    const aedToForeign = aedRates[cur.toLowerCase()];
    if (aedToForeign) rates[cur] = 1 / aedToForeign;
  }
  return rates as Record<Currency, number>;
}

export async function GET(req: NextRequest) {
  const currency = req.nextUrl.searchParams.get("currency")?.toUpperCase() as Currency | null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Single currency requested
  if (currency && (SUPPORTED as readonly string[]).includes(currency)) {
    const cached = await prisma.exchangeRate.findFirst({
      where: { currency: currency as any, date: { gte: today } },
      orderBy: { date: "desc" },
    });
    if (cached) return NextResponse.json({ currency, rate: Number(cached.rate) });

    const rates = await fetchLiveRates();
    await Promise.all(
      SUPPORTED.map((cur) =>
        prisma.exchangeRate.upsert({
          where: { currency_date: { currency: cur as any, date: today } },
          update: { rate: rates[cur] },
          create: { currency: cur as any, rate: rates[cur], date: today },
        })
      )
    );
    return NextResponse.json({ currency, rate: rates[currency as Currency] });
  }

  // All rates
  const cached = await prisma.exchangeRate.findMany({
    where: { date: { gte: today } },
    orderBy: { currency: "asc" },
  });

  if (cached.length >= SUPPORTED.length) {
    return NextResponse.json(
      Object.fromEntries(cached.map((r) => [r.currency, Number(r.rate)]))
    );
  }

  const rates = await fetchLiveRates();
  await Promise.all(
    SUPPORTED.map((cur) =>
      prisma.exchangeRate.upsert({
        where: { currency_date: { currency: cur as any, date: today } },
        update: { rate: rates[cur] },
        create: { currency: cur as any, rate: rates[cur], date: today },
      })
    )
  );
  return NextResponse.json(rates);
}
