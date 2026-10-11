import { NextRequest, NextResponse } from "next/server";
import { readToken, SESSION_COOKIE } from "./lib/session";

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  const s = await readToken(req.cookies.get(SESSION_COOKIE)?.value);
  const to = (u: string) => NextResponse.redirect(new URL(u, req.url));
  if (p.startsWith("/admin")) {
    if (!s) return to(`/login?next=${encodeURIComponent(p)}`);
    if (s.role !== "SUPER_ADMIN") return to("/client/dashboard");
  }
  if (p.startsWith("/client")) {
    if (!s) return to(`/login?next=${encodeURIComponent(p)}`);
    if (!s.wid) return to("/admin/dashboard");
  }
  if ((p === "/login" || p === "/signup") && s) return to(s.wid ? "/client/dashboard" : "/admin/dashboard");
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/client/:path*", "/login", "/signup"] };
