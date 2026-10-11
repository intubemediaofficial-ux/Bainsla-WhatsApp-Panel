import { prisma } from "@/lib/db";
import { handle, json, requireAdmin } from "@/lib/api";

export const GET = handle(async () => {
  await requireAdmin();
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [vendors, active, suspended, channels, contacts, msgsToday, pending, revenue, recent, planGroups] = await Promise.all([
    prisma.workspace.count({ where: { status: { not: "DELETED" } } }),
    prisma.workspace.count({ where: { status: "ACTIVE" } }),
    prisma.workspace.count({ where: { status: "SUSPENDED" } }),
    prisma.channel.count({ where: { status: "CONNECTED" } }),
    prisma.contact.count(),
    prisma.message.count({ where: { createdAt: { gte: today } } }),
    prisma.paymentRequest.count({ where: { status: "PENDING" } }),
    prisma.paymentRequest.aggregate({ where: { status: "APPROVED", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.workspace.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { plan: { select: { name: true } } } }),
    prisma.workspace.groupBy({ by: ["planId"], _count: true }),
  ]);
  const plans = await prisma.plan.findMany({ select: { id: true, name: true } });
  const pn = Object.fromEntries(plans.map((p) => [p.id, p.name]));
  return json({ vendors, active, suspended, channels, contacts, msgsToday, pending, revenue: revenue._sum.amount || 0, recent, byPlan: planGroups.map((g) => ({ name: g.planId ? pn[g.planId] || "?" : "No plan", value: g._count })) });
});
