import { NextRequest, NextResponse } from "next/server";
import { readToken, SESSION_COOKIE } from "./lib/session";

const PUBLIC_API = ["/api/webhooks/", "/api/v1/", "/api/public/"];

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p.startsWith("/api/")) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method) || PUBLIC_API.some((x) => p.startsWith(x))) return NextResponse.next();
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    return NextResponse.next();
  }
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

export const config = { matcher: ["/api/:path*", "/admin/:path*", "/client/:path*", "/login", "/signup"] };
