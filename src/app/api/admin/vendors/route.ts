import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireAdmin } from "@/lib/api";
import { createWorkspace } from "@/lib/workspace";

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin();
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const items = await prisma.workspace.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { users: { some: { email: { contains: q, mode: "insensitive" } } } }] } : {},
    orderBy: { createdAt: "desc" }, take: 300,
    include: { plan: { select: { name: true } }, users: { where: { role: "OWNER" }, select: { id: true, name: true, email: true, phone: true }, take: 1 }, _count: { select: { contacts: true, channels: true } } },
  });
  return json({ items, plans: await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }) });
});

export const POST = handle(async (req: NextRequest) => {
  const s = await requireAdmin();
  const b = await body<{ business: string; name: string; email: string; password: string; phone?: string; planId?: string }>(req);
  if (!b.business || !b.email || !b.password) throw new HttpError(400, "Business, email and password required");
  const email = b.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, "Email already in use");
  const ws = await createWorkspace(b.business);
  if (b.planId) {
    const p = await prisma.plan.findUnique({ where: { id: b.planId } });
    if (p) await prisma.workspace.update({ where: { id: ws.id }, data: { planId: p.id, planExpiresAt: new Date(Date.now() + p.durationDays * 86400000) } });
  }
  await prisma.user.create({ data: { email, name: b.name || b.business, phone: b.phone, role: "OWNER", workspaceId: ws.id, passwordHash: await bcrypt.hash(b.password, 10) } });
  await audit(null, s.name, "vendor.create", `${b.business} (${email})`);
  return json({ id: ws.id }, 201);
});
