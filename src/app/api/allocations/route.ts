import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const allocations = await prisma.stockAllocation.findMany({
    include: {
      item: { select: { id: true, name: true, sku: true, stockQty: true, weightedAvgCost: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Attach user name manually since StockAllocation has no relation to User model
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return NextResponse.json(
    allocations.map((a) => ({
      ...a,
      allocatedQty: Number(a.allocatedQty),
      soldQty: Number(a.soldQty),
      remainingQty: Number(a.allocatedQty) - Number(a.soldQty),
      user: userMap[a.userId] ?? { id: a.userId, name: "Unknown", role: "" },
    }))
  );
}

export async function POST(req: NextRequest) {
  const { itemId, userId, qty, note } = await req.json();

  if (!itemId || !userId || !qty || Number(qty) <= 0) {
    return NextResponse.json({ error: "itemId, userId and qty are required" }, { status: 400 });
  }

  // Check master stock has enough unallocated qty
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId } });
  const existingAllocations = await prisma.stockAllocation.aggregate({
    where: { itemId },
    _sum: { allocatedQty: true },
  });
  const totalAllocated = Number(existingAllocations._sum.allocatedQty ?? 0);
  const available = Number(item.stockQty) - totalAllocated;

  if (Number(qty) > available) {
    return NextResponse.json(
      { error: `Only ${available.toFixed(3)} units available to allocate` },
      { status: 422 }
    );
  }

  // Upsert — if user already has an allocation for this item, increment it
  const allocation = await prisma.stockAllocation.upsert({
    where: { itemId_userId: { itemId, userId } },
    update: { allocatedQty: { increment: Number(qty) }, note: note ?? undefined },
    create: { itemId, userId, allocatedQty: Number(qty), note: note ?? null },
  });

  return NextResponse.json(allocation, { status: 201 });
}
