"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users,
  Truck,
  Package,
  FileText,
  ShoppingCart,
  DollarSign,
  BarChart2,
  LayoutDashboard,
  ShieldCheck,
  KeyRound,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionUser } from "@/lib/session";

// ── nav definition ────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  sub?: boolean;
};

const nav: NavItem[] = [
  { href: "/",                    label: "Dashboard",       icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "SALES", "VIEWER"] },
  { href: "/customers",           label: "Customers",        icon: Users,           roles: ["SUPER_ADMIN", "ADMIN", "SALES", "VIEWER"] },
  { href: "/suppliers",           label: "Suppliers",        icon: Truck,           roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "VIEWER"] },
  { href: "/inventory",           label: "Inventory",        icon: Package,         roles: ["SUPER_ADMIN", "ADMIN", "SALES", "VIEWER"] },
  { href: "/sales",               label: "Sales",            icon: FileText,        roles: ["SUPER_ADMIN", "ADMIN", "SALES", "VIEWER"] },
  { href: "/purchases",           label: "Purchases",        icon: ShoppingCart,    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "VIEWER"] },
  { href: "/accounting",          label: "Accounting",       icon: BarChart2,       roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"] },
  { href: "/admin/users",         label: "User Management",  icon: ShieldCheck,     roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/permissions",    label: "Roles & Permissions", icon: KeyRound,     roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/settings",            label: "Settings",         icon: Settings,        roles: ["SUPER_ADMIN", "ADMIN"] },
];

const roleStyles: Record<string, string> = {
  SUPER_ADMIN: "bg-violet-100 text-violet-700 ring-violet-200",
  ADMIN:       "bg-blue-100 text-blue-700 ring-blue-200",
  ACCOUNTANT:  "bg-emerald-100 text-emerald-700 ring-emerald-200",
  SALES:       "bg-amber-100 text-amber-700 ring-amber-200",
  VIEWER:      "bg-slate-100 text-slate-700 ring-slate-200",
};

// ── NavContent ────────────────────────────────────────────────────────────────

function NavContent({ user, path, onClose }: { user: SessionUser; path: string; onClose?: () => void }) {
  const router = useRouter();
  const visibleNav = nav.filter((item) => item.roles.includes(user.role));

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Brand */}
      <div className="border-b border-slate-200/80 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Unix Solutions</h1>
          </div>
          {onClose && (
            <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 lg:hidden">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Scroll area */}
      <div className="sidebar-scroll flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        <div className="mb-4 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Navigation</p>
        </div>

        <nav className="space-y-0.5">
          {visibleNav.map(({ href, label, icon: Icon, sub }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3.5 text-sm font-medium transition-all duration-200",
                  sub ? "ml-4 min-h-[40px] py-2" : "min-h-[48px] py-3",
                  active
                    ? "bg-sky-50 text-sky-700 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.14)]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sky-500" />
                )}
                <div className={cn(
                  "flex items-center justify-center rounded-xl transition-all duration-200",
                  sub ? "h-7 w-7" : "h-9 w-9",
                  active
                    ? "bg-white text-sky-600 shadow-sm ring-1 ring-sky-100"
                    : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-700 group-hover:ring-1 group-hover:ring-slate-200"
                )}>
                  <Icon size={sub ? 14 : 17} className="shrink-0" />
                </div>
                <span className="flex-1 truncate">{label}</span>
                <ChevronRight size={14} className={cn(
                  "transition-all duration-200",
                  active ? "text-sky-500 opacity-100" : "text-slate-300 opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100"
                )} />
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User footer */}
      <div className="border-t border-slate-200/80 p-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <span className={cn("mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1", roleStyles[user.role] ?? "bg-slate-100 text-slate-700 ring-slate-200")}>
                {user.role.replace("_", " ")}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* Whizfortune credit */}
        <div className="mt-3 text-center">
          <p className="text-[10px] text-slate-400">
            Designed &amp; Developed by{" "}
            <a
              href="https://whizfortune.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-500 transition hover:text-slate-800"
            >
              Whizfortune
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ user }: { user: SessionUser }) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const visibleNav = nav.filter((item) => item.roles.includes(user.role));
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <style jsx global>{`
        .sidebar-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .sidebar-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        >
          <Menu size={19} />
        </button>
        <p className="truncate text-sm font-semibold text-slate-900">Unix Solutions</p>
      </div>

      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-[290px] max-w-[82vw] border-r border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent user={user} path={path} onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-screen shrink-0 border-r border-slate-200 bg-white lg:flex sticky top-0 flex-col transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[280px]"
        )}
      >
        {collapsed ? (
          /* ── Icon-only collapsed state ── */
          <div className="flex h-full flex-col">
            {/* Toggle button at top */}
            <div className="flex items-center justify-center border-b border-slate-200/80 py-[18px]">
              <button
                onClick={() => setCollapsed(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                title="Expand sidebar"
              >
                <Menu size={17} />
              </button>
            </div>

            {/* Icon nav */}
            <div className="sidebar-scroll flex-1 overflow-y-auto py-3">
              <nav className="flex flex-col items-center gap-1 px-2">
                {visibleNav.map(({ href, label, icon: Icon }) => {
                  const active = path === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={label}
                      className={cn(
                        "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                        active
                          ? "bg-sky-50 text-sky-600 ring-1 ring-sky-100"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sky-500" />
                      )}
                      <Icon size={17} className="shrink-0" />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Logout icon at bottom */}
            <div className="flex flex-col items-center gap-2 border-t border-slate-200/80 py-4">
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* ── Full expanded state ── */
          <div className="flex h-full flex-col">
            {/* Brand + collapse button */}
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-5">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">Unix Solutions</h1>
              <button
                onClick={() => setCollapsed(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                title="Collapse sidebar"
              >
                <Menu size={17} />
              </button>
            </div>

            {/* Scroll area */}
            <div className="sidebar-scroll flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              <div className="mb-4 px-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Navigation</p>
              </div>
              <nav className="space-y-0.5">
                {visibleNav.map(({ href, label, icon: Icon, sub }) => {
                  const active = path === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-2xl px-3.5 text-sm font-medium transition-all duration-200",
                        sub ? "ml-4 min-h-[40px] py-2" : "min-h-[48px] py-3",
                        active
                          ? "bg-sky-50 text-sky-700 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.14)]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sky-500" />
                      )}
                      <div className={cn(
                        "flex items-center justify-center rounded-xl transition-all duration-200",
                        sub ? "h-7 w-7" : "h-9 w-9",
                        active
                          ? "bg-white text-sky-600 shadow-sm ring-1 ring-sky-100"
                          : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-700 group-hover:ring-1 group-hover:ring-slate-200"
                      )}>
                        <Icon size={sub ? 14 : 17} className="shrink-0" />
                      </div>
                      <span className="flex-1 truncate">{label}</span>
                      <ChevronRight size={14} className={cn(
                        "transition-all duration-200",
                        active ? "text-sky-500 opacity-100" : "text-slate-300 opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100"
                      )} />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User footer */}
            <div className="border-t border-slate-200/80 p-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                    <span className={cn("mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1", roleStyles[user.role] ?? "bg-slate-100 text-slate-700 ring-slate-200")}>
                      {user.role.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
              <div className="mt-3 text-center">
                <p className="text-[10px] text-slate-400">
                  Designed &amp; Developed by{" "}
                  <a href="https://whizfortune.com" target="_blank" rel="noopener noreferrer"
                    className="font-semibold text-slate-500 transition hover:text-slate-800">
                    Whizfortune
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}