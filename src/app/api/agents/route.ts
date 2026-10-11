import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireOwner, requireWs } from "@/lib/api";
import { checkLimit } from "@/lib/workspace";

export const GET = handle(async () => {
  const s = await requireWs();
  const items = await prisma.user.findMany({ where: { workspaceId: s.wid }, select: { id: true, name: true, email: true, phone: true, role: true, active: true, permissions: true, lastLoginAt: true, createdAt: true }, orderBy: { createdAt: "asc" } });
  return json({ items });
});

export const POST = handle(async (req: NextRequest) => {
  const s = await requireOwner();
  const b = await body<{ name: string; email: string; password: string; phone?: string; permissions?: string[] }>(req);
  if (!b.name || !b.email || !b.password || b.password.length < 6) throw new HttpError(400, "Name, email and password (min 6) required");
  const email = b.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, "Email already in use");
  await checkLimit(s.wid, "agents");
  const u = await prisma.user.create({ data: { name: b.name, email, phone: b.phone, role: "AGENT", workspaceId: s.wid, passwordHash: await bcrypt.hash(b.password, 10), permissions: b.permissions || [] } });
  await audit(s.wid, s.name, "agent.create", email);
  return json({ id: u.id }, 201);
});
