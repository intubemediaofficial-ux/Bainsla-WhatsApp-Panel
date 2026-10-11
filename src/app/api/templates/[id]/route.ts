import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, handle, HttpError, json, requireWs } from "@/lib/api";
import { deleteTemplate } from "@/lib/wa";
import { defaultChannel } from "@/lib/messaging";

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  const t = await prisma.template.findFirst({ where: { id, workspaceId: s.wid } });
  if (!t) throw new HttpError(404, "Not found");
  if (t.metaId) {
    const ch = (t.channelId && (await prisma.channel.findUnique({ where: { id: t.channelId } }))) || (await defaultChannel(s.wid));
    if (ch) await deleteTemplate(ch, t.name).catch(() => {});
  }
  await prisma.template.delete({ where: { id } });
  await audit(s.wid, s.name, "template.delete", t.name);
  return json({ ok: true });
});
