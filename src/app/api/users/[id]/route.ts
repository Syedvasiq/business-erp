import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name) data.name = body.name;
  if (body.role) data.role = body.role;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.password) data.password = await bcrypt.hash(body.password, 12);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const caller = await requireRole(["SUPER_ADMIN"]);
    if (caller.id === id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 409 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    return NextResponse.json({ error: msg === "FORBIDDEN" ? "Forbidden" : "Unauthorized" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
