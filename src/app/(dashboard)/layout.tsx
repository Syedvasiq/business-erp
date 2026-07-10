import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/Sidebar";
import { getAllPermissions } from "@/lib/permissions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.user) redirect("/login");

  // SUPER_ADMIN skips DB check — always full access
  const permissions = session.user.role === "SUPER_ADMIN"
    ? null
    : await getAllPermissions();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={session.user} permissions={permissions} />
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
