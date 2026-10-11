import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireAdmin } from "@/lib/api";
import { vendorDetail } from "./detail";

export const GET = handle(async (_req: NextRequest, ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const d = await vendorDetail(id);
  if (!d) throw new HttpError(404, "Not found");
  return json(d);
});

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const s = await requireAdmin();
  const { id } = await ctx.params;
  const ws = await prisma.workspace.findUnique({ where: { id } });
  if (!ws) throw new HttpError(404, "Not found");
  const b = await body<{ name?: string; status?: string; planId?: string; extendDays?: number; walletAdjust?: number; note?: string; planExpiresAt?: string }>(req);
  const data: Prisma.WorkspaceUpdateInput = {};
  if (b.name?.trim()) data.name = b.name.trim();
  if (b.status) {
    if (!["ACTIVE", "SUSPENDED"].includes(b.status)) throw new HttpError(400, "Bad status");
    data.status = b.status;
    await prisma.user.updateMany({ where: { workspaceId: id }, data: { active: b.status === "ACTIVE" } });
  }
  if (b.planId) {
    const p = await prisma.plan.findUnique({ where: { id: b.planId } });
    if (!p) throw new HttpError(400, "Plan not found");
    data.plan = { connect: { id: p.id } };
    data.planExpiresAt = new Date(Date.now() + p.durationDays * 86400000);
  }
  if (b.planExpiresAt) data.planExpiresAt = new Date(b.planExpiresAt);
  if (b.extendDays) data.planExpiresAt = new Date(Math.max(Date.now(), ws.planExpiresAt?.getTime() || 0) + b.extendDays * 86400000);
  if (b.walletAdjust) {
    data.wallet = { increment: b.walletAdjust };
    await prisma.walletTxn.create({ data: { workspaceId: id, amount: b.walletAdjust, type: b.walletAdjust > 0 ? "CREDIT" : "DEBIT", description: b.note || "Admin adjustment" } });
  }
  await prisma.workspace.update({ where: { id }, data });
  await audit(null, s.name, "vendor.update", `${ws.name}: ${JSON.stringify(b)}`);
  return json({ ok: true });
});

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const s = await requireAdmin();
  const { id } = await ctx.params;
  const ws = await prisma.workspace.findUnique({ where: { id } });
  if (!ws) throw new HttpError(404, "Not found");
  // Soft delete: suspend instead of destroying vendor data.
  await prisma.workspace.update({ where: { id }, data: { status: "DELETED" } });
  await prisma.user.updateMany({ where: { workspaceId: id }, data: { active: false } });
  await audit(null, s.name, "vendor.archive", ws.name);
  return json({ ok: true });
});
