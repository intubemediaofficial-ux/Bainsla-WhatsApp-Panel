import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { body, handle, json } from "@/lib/api";

const hits = new Map<string, { n: number; t: number }>();

export const POST = handle(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const h = hits.get(ip);
  if (h && Date.now() - h.t < 15 * 60000 && h.n >= 20) return json({ error: "Too many attempts, try again in 15 minutes" }, 429);
  const { email, password } = await body<{ email: string; password: string }>(req);
  const user = await prisma.user.findUnique({ where: { email: String(email || "").trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) {
    hits.set(ip, { n: (h && Date.now() - h.t < 15 * 60000 ? h.n : 0) + 1, t: h?.t && Date.now() - h.t < 15 * 60000 ? h.t : Date.now() });
    return json({ error: "Invalid email or password" }, 401);
  }
  if (!user.active) return json({ error: "Account disabled — contact support" }, 403);
  if (user.workspaceId) {
    const ws = await prisma.workspace.findUnique({ where: { id: user.workspaceId } });
    if (ws && ws.status !== "ACTIVE") return json({ error: "Workspace suspended — contact support" }, 403);
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSession({ uid: user.id, role: user.role, wid: user.workspaceId, name: user.name, email: user.email });
  return json({ ok: true, redirect: user.role === "SUPER_ADMIN" ? "/admin/dashboard" : "/client/dashboard" });
});
