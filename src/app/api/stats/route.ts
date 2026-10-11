import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, json, requireWs } from "@/lib/api";

export const GET = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const w = s.wid;
  const days = Math.min(90, Number(req.nextUrl.searchParams.get("days") || 14));
  const since = new Date(Date.now() - days * 86400000);
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const [contacts, newContacts, open, unread, sentToday, recvToday, broadcasts, flows, leads, orders, appts, statusGroups, msgs, tagGroups, recentBc] = await Promise.all([
    prisma.contact.count({ where: { workspaceId: w } }),
    prisma.contact.count({ where: { workspaceId: w, createdAt: { gte: since } } }),
    prisma.conversation.count({ where: { workspaceId: w, status: "OPEN" } }),
    prisma.conversation.count({ where: { workspaceId: w, unread: { gt: 0 } } }),
    prisma.message.count({ where: { workspaceId: w, direction: "out", createdAt: { gte: today } } }),
    prisma.message.count({ where: { workspaceId: w, direction: "in", createdAt: { gte: today } } }),
    prisma.broadcast.count({ where: { workspaceId: w } }),
    prisma.botFlow.count({ where: { workspaceId: w, active: true } }),
    prisma.lead.count({ where: { workspaceId: w } }),
    prisma.order.count({ where: { workspaceId: w } }),
    prisma.appointment.count({ where: { workspaceId: w, startsAt: { gte: today } } }),
    prisma.message.groupBy({ by: ["status"], where: { workspaceId: w, direction: "out", createdAt: { gte: since } }, _count: true }),
    prisma.message.findMany({ where: { workspaceId: w, createdAt: { gte: since } }, select: { createdAt: true, direction: true } }),
    prisma.contact.findMany({ where: { workspaceId: w }, select: { tags: true }, take: 5000 }),
    prisma.broadcast.findMany({ where: { workspaceId: w }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const series: Record<string, { day: string; sent: number; received: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    series[d] = { day: d.slice(5), sent: 0, received: 0 };
  }
  for (const m of msgs) {
    const d = m.createdAt.toISOString().slice(0, 10);
    if (series[d]) series[d][m.direction === "out" ? "sent" : "received"]++;
  }
  const tagCount: Record<string, number> = {};
  for (const c of tagGroups) for (const t of c.tags) tagCount[t] = (tagCount[t] || 0) + 1;
  return json({
    contacts, newContacts, open, unread, sentToday, recvToday, broadcasts, flows, leads, orders, appts,
    status: Object.fromEntries(statusGroups.map((g) => [g.status, g._count])),
    series: Object.values(series),
    tags: Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value })),
    recentBroadcasts: recentBc,
  });
});
