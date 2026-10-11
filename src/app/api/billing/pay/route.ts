import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireOwner } from "@/lib/api";

export const POST = handle(async (req: NextRequest) => {
  const s = await requireOwner();
  const b = await body<{ purpose: "WALLET" | "PLAN"; amount?: number; planId?: string; utr: string; coupon?: string }>(req);
  if (!b.utr || b.utr.trim().length < 6) throw new HttpError(400, "Enter the UPI transaction ID / UTR");
  if (await prisma.paymentRequest.findFirst({ where: { utr: b.utr.trim() } })) throw new HttpError(409, "This UTR was already submitted");
  let amount = Math.round(Number(b.amount || 0));
  let couponCode: string | null = null;
  if (b.purpose === "PLAN") {
    const p = await prisma.plan.findFirst({ where: { id: b.planId, active: true } });
    if (!p) throw new HttpError(400, "Choose a plan");
    amount = p.price;
    if (b.coupon) {
      const c = await prisma.coupon.findFirst({ where: { code: b.coupon.trim().toUpperCase(), active: true } });
      if (!c || (c.expiresAt && c.expiresAt < new Date()) || (c.maxUses > 0 && c.used >= c.maxUses)) throw new HttpError(400, "Invalid or expired coupon");
      amount = Math.max(0, Math.round(amount - (amount * c.percentOff) / 100 - c.amountOff));
      couponCode = c.code;
    }
  } else if (amount < 100) throw new HttpError(400, "Minimum recharge ₹100");
  const r = await prisma.paymentRequest.create({ data: { workspaceId: s.wid, purpose: b.purpose, planId: b.planId, amount, utr: b.utr.trim(), couponCode } });
  await audit(s.wid, s.name, "payment.submit", `${b.purpose} ₹${amount}`);
  return json(r, 201);
});
