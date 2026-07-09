import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export type PermAction = "canView" | "canCreate" | "canEdit" | "canDelete";

export const MODULES = [
  "customers",
  "suppliers",
  "inventory",
  "sales",
  "purchases",
  "commissions",
  "accounting",
  "users",
  "settings",
] as const;

export type Module = (typeof MODULES)[number];

// SUPER_ADMIN always has full access — no DB check needed
export async function can(
  role: UserRole,
  module: Module,
  action: PermAction
): Promise<boolean> {
  if (role === "SUPER_ADMIN") return true;
  const perm = await prisma.rolePermission.findUnique({
    where: { role_module: { role, module } },
  });
  if (!perm) return false;
  return perm[action];
}

// Returns all permissions for all roles as a nested map
export async function getAllPermissions() {
  const rows = await prisma.rolePermission.findMany();
  // map: { [role]: { [module]: { canView, canCreate, canEdit, canDelete } } }
  const map: Record<string, Record<string, Record<PermAction, boolean>>> = {};
  for (const r of rows) {
    if (!map[r.role]) map[r.role] = {};
    map[r.role][r.module] = {
      canView: r.canView,
      canCreate: r.canCreate,
      canEdit: r.canEdit,
      canDelete: r.canDelete,
    };
  }
  return map;
}
