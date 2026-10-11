import { prisma } from "@/lib/db";
import { handle, json, requireWs } from "@/lib/api";
import { getSetting } from "@/lib/settings";

export const GET = handle(async () => {
  const s = await requireWs();
  const [ws, plans, requests, payment, pricing] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: s.wid }, include: { plan: true } }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.paymentRequest.findMany({ where: { workspaceId: s.wid }, orderBy: { createdAt: "desc" }, take: 30 }),
    getSetting("payment"),
    getSetting("pricing"),
  ]);
  return json({ wallet: ws?.wallet, plan: ws?.plan, planExpiresAt: ws?.planExpiresAt, plans, requests, payment, pricing });
});
