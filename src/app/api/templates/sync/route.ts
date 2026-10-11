import { prisma } from "@/lib/db";
import { handle, HttpError, json, requireWs } from "@/lib/api";
import { listTemplates } from "@/lib/wa";

export const POST = handle(async () => {
  const s = await requireWs();
  const chans = await prisma.channel.findMany({ where: { workspaceId: s.wid, status: "CONNECTED" } });
  if (!chans.length) throw new HttpError(400, "Connect a WhatsApp number first");
  let n = 0;
  const seenWaba = new Set<string>();
  for (const ch of chans) {
    if (!ch.wabaId || seenWaba.has(ch.wabaId)) continue;
    seenWaba.add(ch.wabaId);
    for (const t of await listTemplates(ch)) {
      const ex = await prisma.template.findFirst({ where: { workspaceId: s.wid, name: t.name, language: t.language } });
      const data = { status: t.status, category: t.category, components: t.components as object[], metaId: t.id, rejectedReason: t.rejected_reason && t.rejected_reason !== "NONE" ? t.rejected_reason : null, channelId: ch.id };
      if (ex) await prisma.template.update({ where: { id: ex.id }, data });
      else await prisma.template.create({ data: { workspaceId: s.wid, name: t.name, language: t.language, ...data } });
      n++;
    }
  }
  return json({ ok: true, synced: n });
});
