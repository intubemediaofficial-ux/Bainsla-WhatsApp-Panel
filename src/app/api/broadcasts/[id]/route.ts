import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireWs } from "@/lib/api";

export const GET = handle(async (req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  const bc = await prisma.broadcast.findFirst({ where: { id, workspaceId: s.wid } });
  if (!bc) throw new HttpError(404, "Not found");
  const st = req.nextUrl.searchParams.get("status");
  const recipients = await prisma.broadcastRecipient.findMany({ where: { broadcastId: id, ...(st ? { status: st } : {}) }, orderBy: { sentAt: "desc" }, take: 2000 });
  return json({ broadcast: bc, recipients });
});

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  const bc = await prisma.broadcast.findFirst({ where: { id, workspaceId: s.wid } });
  if (!bc) throw new HttpError(404, "Not found");
  const { action } = await body<{ action: "pause" | "resume" | "cancel" | "retryFailed" }>(req);
  const map = { pause: "PAUSED", resume: "RUNNING", cancel: "CANCELLED", retryFailed: "RUNNING" } as const;
  if (action === "retryFailed") {
    const n = await prisma.broadcastRecipient.updateMany({ where: { broadcastId: id, status: "FAILED" }, data: { status: "PENDING", error: null } });
    await prisma.broadcast.update({ where: { id }, data: { failed: { decrement: n.count } } });
  }
  if (action === "cancel") await prisma.broadcastRecipient.updateMany({ where: { broadcastId: id, status: "PENDING" }, data: { status: "SKIPPED" } });
  await prisma.broadcast.update({ where: { id }, data: { status: map[action], ...(action === "resume" || action === "retryFailed" ? { startedAt: bc.startedAt || new Date(), completedAt: null } : {}) } });
  await audit(s.wid, s.name, `broadcast.${action}`, bc.name);
  return json({ ok: true });
});

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  await prisma.broadcast.deleteMany({ where: { id, workspaceId: s.wid, status: { not: "RUNNING" } } });
  return json({ ok: true });
});
