import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireOwner } from "@/lib/api";

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const s = await requireOwner();
  const { id } = await ctx.params;
  const u = await prisma.user.findFirst({ where: { id, workspaceId: s.wid } });
  if (!u) throw new HttpError(404, "Not found");
  const b = await body<{ name?: string; active?: boolean; password?: string; permissions?: string[] }>(req);
  const data: Record<string, unknown> = {};
  if (b.name) data.name = b.name;
  if (b.active !== undefined && u.role === "AGENT") data.active = b.active;
  if (b.permissions) data.permissions = b.permissions;
  if (b.password) {
    if (b.password.length < 6) throw new HttpError(400, "Password min 6 chars");
    data.passwordHash = await bcrypt.hash(b.password, 10);
  }
  await prisma.user.update({ where: { id }, data });
  return json({ ok: true });
});

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const s = await requireOwner();
  const { id } = await ctx.params;
  await prisma.user.deleteMany({ where: { id, workspaceId: s.wid, role: "AGENT" } });
  await audit(s.wid, s.name, "agent.delete", id);
  return json({ ok: true });
});
