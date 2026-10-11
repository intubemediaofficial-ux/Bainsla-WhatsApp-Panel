import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireWs } from "@/lib/api";
import { triggerSequences } from "@/lib/automation";

export const GET = handle(async (_req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  const c = await prisma.contact.findFirst({ where: { id, workspaceId: s.wid }, include: { conversations: { select: { id: true } } } });
  if (!c) throw new HttpError(404, "Not found");
  return json(c);
});

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  const old = await prisma.contact.findFirst({ where: { id, workspaceId: s.wid } });
  if (!old) throw new HttpError(404, "Not found");
  const b = await body<Record<string, unknown>>(req);
  const data: Record<string, unknown> = {};
  for (const k of ["name", "email", "stage", "leadScore", "notes", "source"]) if (b[k] !== undefined) data[k] = b[k] || null;
  if (b.tags !== undefined) data.tags = Array.isArray(b.tags) ? b.tags : String(b.tags).split(",").map((t) => t.trim()).filter(Boolean);
  if (b.optedOut !== undefined) data.optedOut = !!b.optedOut;
  if (b.customFields !== undefined) data.customFields = b.customFields;
  for (const k of ["birthday", "anniversary"]) if (b[k] !== undefined) data[k] = b[k] ? new Date(String(b[k])) : null;
  const c = await prisma.contact.update({ where: { id }, data });
  for (const t of c.tags.filter((t) => !old.tags.includes(t))) triggerSequences(c, "TAG_ADDED", t).catch(() => {});
  return json(c);
});

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  const r = await prisma.contact.deleteMany({ where: { id, workspaceId: s.wid } });
  await audit(s.wid, s.name, "contact.delete", id);
  return json({ ok: r.count > 0 });
});
