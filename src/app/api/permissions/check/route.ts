import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const module = searchParams.get("module");

  if (!role || !module) return NextResponse.json({ canView: false });

  const perm = await prisma.rolePermission.findUnique({
    where: { role_module: { role: role as any, module } },
  });

  return NextResponse.json({ canView: perm?.canView ?? false });
}
