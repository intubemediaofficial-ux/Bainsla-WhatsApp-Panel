import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, json, requireWs } from "@/lib/api";

export const GET = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const p = req.nextUrl.searchParams;
  const f = p.get("filter") || "all";
  const q = p.get("q")?.trim();
  const where: Record<string, unknown> = { workspaceId: s.wid };
  if (f === "unread") where.unread = { gt: 0 };
  if (f === "mine") where.assignedToId = s.uid;
  if (f === "unassigned") where.assignedToId = null;
  if (f === "open" || f === "closed") where.status = f.toUpperCase();
  if (p.get("label")) where.labels = { has: p.get("label") };
  if (s.role === "AGENT" && f !== "unassigned") where.OR = [{ assignedToId: s.uid }, { assignedToId: null }];
  if (q) where.contact = { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] };
  const items = await prisma.conversation.findMany({
    where, orderBy: { lastMessageAt: "desc" }, take: 100,
    include: { contact: { select: { id: true, name: true, phone: true, tags: true, optedOut: true } }, assignedTo: { select: { id: true, name: true } } },
  });
  const counts = {
    all: await prisma.conversation.count({ where: { workspaceId: s.wid } }),
    unread: await prisma.conversation.count({ where: { workspaceId: s.wid, unread: { gt: 0 } } }),
  };
  return json({ items, counts });
});
