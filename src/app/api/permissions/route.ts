import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getAllPermissions } from "@/lib/permissions";

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await getAllPermissions();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  // body: { role, module, canView, canCreate, canEdit, canDelete }
  const row = await prisma.rolePermission.upsert({
    where: { role_module: { role: body.role, module: body.module } },
    update: {
      canView: body.canView,
      canCreate: body.canCreate,
      canEdit: body.canEdit,
      canDelete: body.canDelete,
    },
    create: {
      role: body.role,
      module: body.module,
      canView: body.canView ?? false,
      canCreate: body.canCreate ?? false,
      canEdit: body.canEdit ?? false,
      canDelete: body.canDelete ?? false,
    },
  });
  return NextResponse.json(row);
}
