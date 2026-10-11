import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { body, handle, HttpError, json, requireWs } from "@/lib/api";
import { emit } from "@/lib/events";

async function own(id: string, wid: string) {
  const c = await prisma.conversation.findFirst({ where: { id, workspaceId: wid } });
  if (!c) throw new HttpError(404, "Conversation not found");
  return c;
}

export const GET = handle(async (_req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  await own(id, s.wid);
  const [conv, messages, notes] = await Promise.all([
    prisma.conversation.update({ where: { id }, data: { unread: 0 }, include: { contact: true, assignedTo: { select: { id: true, name: true } } } }),
    prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.conversationNote.findMany({ where: { conversationId: id }, orderBy: { createdAt: "desc" } }),
  ]);
  const last = conv.contact.lastInboundAt;
  const windowOpen = !!last && Date.now() - new Date(last).getTime() < 24 * 3600 * 1000;
  return json({ conversation: conv, messages: messages.reverse(), notes, windowOpen });
});

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  await own(id, s.wid);
  const b = await body<{ status?: string; assignedToId?: string | null; labels?: string[]; botPaused?: boolean }>(req);
  const data: Record<string, unknown> = {};
  if (b.status) data.status = b.status;
  if (b.assignedToId !== undefined) data.assignedToId = b.assignedToId || null;
  if (b.labels) data.labels = b.labels;
  if (b.botPaused !== undefined) data.botPaused = b.botPaused;
  const c = await prisma.conversation.update({ where: { id }, data });
  emit(s.wid, { type: "conversation", conversationId: id });
  return json(c);
});
