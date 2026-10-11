import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { body, handle, HttpError, json, requireWs } from "@/lib/api";

export const POST = handle(async (req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  if (!(await prisma.conversation.findFirst({ where: { id, workspaceId: s.wid } }))) throw new HttpError(404, "Not found");
  const { text } = await body<{ text: string }>(req);
  if (!text?.trim()) throw new HttpError(400, "Note is empty");
  return json(await prisma.conversationNote.create({ data: { conversationId: id, userName: s.name, body: text.trim() } }));
});
