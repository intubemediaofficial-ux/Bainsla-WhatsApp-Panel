import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, json, requireAdmin } from "@/lib/api";

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin();
  const st = req.nextUrl.searchParams.get("status");
  const items = await prisma.paymentRequest.findMany({ where: st ? { status: st } : {}, orderBy: { createdAt: "desc" }, take: 300 });
  const ws = await prisma.workspace.findMany({ where: { id: { in: items.map((i) => i.workspaceId) } }, select: { id: true, name: true } });
  const plans = await prisma.plan.findMany({ select: { id: true, name: true } });
  const wn = Object.fromEntries(ws.map((w) => [w.id, w.name]));
  const pn = Object.fromEntries(plans.map((p) => [p.id, p.name]));
  return json({ items: items.map((i) => ({ ...i, workspaceName: wn[i.workspaceId], planName: i.planId ? pn[i.planId] : null })) });
});
