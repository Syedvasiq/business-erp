import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSession } from "@/lib/session";

const MODULE_PATHS: Record<string, string> = {
  "/customers":   "customers",
  "/suppliers":   "suppliers",
  "/inventory":   "inventory",
  "/sales":       "sales",
  "/purchases":   "purchases",
  "/commissions": "commissions",
  "/accounting":  "accounting",
  "/settings":    "settings",
  "/admin":       "users",
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) return res;

  const session = await getIronSession<AppSession>(req, res, sessionOptions);

  if (!session.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // SUPER_ADMIN bypasses all checks
  if (session.user.role === "SUPER_ADMIN") return res;

  // Find which module this path belongs to
  const module = Object.entries(MODULE_PATHS).find(([prefix]) =>
    pathname.startsWith(prefix)
  )?.[1];

  if (!module) return res; // dashboard or unmatched — allow

  // Fetch permissions for this role+module
  const permRes = await fetch(
    new URL(`/api/permissions/check?role=${session.user.role}&module=${module}`, req.url)
  );

  if (permRes.ok) {
    const perm = await permRes.json();
    if (!perm.canView) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
