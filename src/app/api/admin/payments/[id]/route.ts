import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireAdmin } from "@/lib/api";
import { getSetting } from "@/lib/settings";

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const s = await requireAdmin();
  const { id } = await ctx.params;
  const r = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!r) throw new HttpError(404, "Not found");
  if (r.status !== "PENDING") throw new HttpError(400, "Already processed");
  const { action, note } = await body<{ action: "approve" | "reject"; note?: string }>(req);
  if (action === "reject") {
    await prisma.paymentRequest.update({ where: { id }, data: { status: "REJECTED", adminNote: note } });
    return json({ ok: true });
  }
  const pay = await getSetting("payment");
  const ws = await prisma.workspace.findUnique({ where: { id: r.workspaceId } });
  if (!ws) throw new HttpError(404, "Vendor missing");
  if (r.purpose === "PLAN" && r.planId) {
    const p = await prisma.plan.findUnique({ where: { id: r.planId } });
    if (!p) throw new HttpError(400, "Plan missing");
    const base = ws.planId === p.id ? Math.max(Date.now(), ws.planExpiresAt?.getTime() || 0) : Date.now();
    await prisma.workspace.update({ where: { id: ws.id }, data: { planId: p.id, planExpiresAt: new Date(base + p.durationDays * 86400000) } });
    if (r.couponCode) await prisma.coupon.updateMany({ where: { code: r.couponCode }, data: { used: { increment: 1 } } });
  } else {
    await prisma.workspace.update({ where: { id: ws.id }, data: { wallet: { increment: r.amount } } });
    await prisma.walletTxn.create({ data: { workspaceId: ws.id, amount: r.amount, type: "CREDIT", description: "Wallet recharge", ref: r.utr } });
  }
  const tax = Math.round((r.amount * pay.gstPercent) / (100 + pay.gstPercent));
  await prisma.invoice.create({ data: { workspaceId: ws.id, number: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`, description: r.purpose === "PLAN" ? "Plan subscription" : "Wallet recharge", amount: r.amount, tax } });
  await prisma.paymentRequest.update({ where: { id }, data: { status: "APPROVED", adminNote: note } });
  await audit(null, s.name, "payment.approve", `${ws.name} ₹${r.amount}`);
  return json({ ok: true });
});
