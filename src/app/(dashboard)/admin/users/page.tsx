import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { redirect } from "next/navigation";
import { UserActions } from "./UserActions";
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  ChevronRight,
} from "lucide-react";

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: "default" | "blue" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    default: "bg-slate-100 text-slate-600",
    blue: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">
            {value}
          </p>
          {sub ? <p className="mt-1 text-sm text-slate-500">{sub}</p> : null}
        </div>

        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
          {icon}
        </div>
      </div>
    </SurfaceCard>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    SUPER_ADMIN: "bg-rose-50 text-rose-700 ring-rose-100",
    ADMIN: "bg-blue-50 text-blue-700 ring-blue-100",
    ACCOUNTANT: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    SALES: "bg-amber-50 text-amber-700 ring-amber-100",
    VIEWER: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
        styles[role] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {role.replaceAll("_", " ")}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-rose-50 text-rose-700 ring-rose-100"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

const roleLegend = [
  { role: "SUPER_ADMIN", desc: "Full system access and user deletion" },
  { role: "ADMIN", desc: "All modules and user creation" },
  { role: "ACCOUNTANT", desc: "Purchases, suppliers and accounting" },
  { role: "SALES", desc: "Customers, sales and commissions" },
  { role: "VIEWER", desc: "Read-only access" },
];

export default async function UsersPage() {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN"]);
  } catch {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = users.filter((u) => !u.isActive).length;
  const adminUsers = users.filter((u) =>
    ["SUPER_ADMIN", "ADMIN"].includes(u.role)
  ).length;

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <SurfaceCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Access control
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                User Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage system users, assign roles, and control account access.
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <UserActions />
            </div>
          </div>
        </SurfaceCard>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total users"
            value={String(totalUsers)}
            sub="All registered accounts"
            icon={<Users size={20} />}
            tone="blue"
          />
          <StatCard
            title="Active users"
            value={String(activeUsers)}
            sub="Currently enabled accounts"
            icon={<UserCheck size={20} />}
            tone="emerald"
          />
          <StatCard
            title="Inactive users"
            value={String(inactiveUsers)}
            sub="Disabled system access"
            icon={<UserX size={20} />}
            tone="rose"
          />
          <StatCard
            title="Admin access"
            value={String(adminUsers)}
            sub="Super admin and admin users"
            icon={<ShieldCheck size={20} />}
            tone="amber"
          />
        </section>

        <SurfaceCard className="p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Role access guide</h2>
            <p className="mt-1 text-sm text-slate-500">
              Quick overview of available permissions and role responsibility.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {roleLegend.map(({ role, desc }) => (
              <div
                key={role}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={role} />
                </div>
                <p className="mt-3 text-sm text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="hidden overflow-hidden lg:block">
          <div className="border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">System users</h2>
              <p className="mt-1 text-sm text-slate-500">{totalUsers} users</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                          {u.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{u.name}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>

                    <td className="px-6 py-4">
                      <RoleBadge role={u.role} />
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge isActive={u.isActive} />
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(u.createdAt).toLocaleDateString("en-AE")}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex justify-end">
                        <UserActions
                          userId={u.id}
                          userName={u.name}
                          userRole={u.role}
                          isActive={u.isActive}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <div className="grid grid-cols-1 gap-4 lg:hidden">
          <div className="px-1">
            <h2 className="text-base font-semibold text-slate-900">System users</h2>
            <p className="mt-1 text-sm text-slate-500">{totalUsers} users</p>
          </div>

          {users.map((u) => (
            <SurfaceCard key={u.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                    {u.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">
                      {u.name}
                    </p>
                    <p className="truncate text-sm text-slate-500">{u.email}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString("en-AE")}
                    </p>
                  </div>
                </div>

                <StatusBadge isActive={u.isActive} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <RoleBadge role={u.role} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-500">
                  Manage user
                  <ChevronRight size={15} />
                </span>

                <UserActions
                  userId={u.id}
                  userName={u.name}
                  userRole={u.role}
                  isActive={u.isActive}
                />
              </div>
            </SurfaceCard>
          ))}
        </div>
      </div>
    </main>
  );
}