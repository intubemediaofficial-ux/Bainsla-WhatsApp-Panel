import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireAdmin } from "@/lib/api";

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const s = await requireAdmin();
  const { id } = await ctx.params;
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) throw new HttpError(404, "Not found");
  const b = await body<{ active?: boolean; password?: string; name?: string; phone?: string }>(req);
  const data: { active?: boolean; passwordHash?: string; name?: string; phone?: string } = {};
  if (typeof b.active === "boolean") {
    if (u.id === s.uid && !b.active) throw new HttpError(400, "You cannot deactivate yourself");
    data.active = b.active;
  }
  if (b.password) {
    if (b.password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
    data.passwordHash = await bcrypt.hash(b.password, 10);
  }
  if (b.name?.trim()) data.name = b.name.trim();
  if (typeof b.phone === "string") data.phone = b.phone.trim() || undefined;
  await prisma.user.update({ where: { id }, data });
  await audit(u.workspaceId, s.name, b.password ? "user.password_reset" : "user.update", u.email);
  return json({ ok: true });
});
