import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireWs } from "@/lib/api";
import { createTemplate } from "@/lib/wa";
import { defaultChannel } from "@/lib/messaging";

export const GET = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const st = req.nextUrl.searchParams.get("status");
  const items = await prisma.template.findMany({ where: { workspaceId: s.wid, ...(st ? { status: st } : {}) }, orderBy: { updatedAt: "desc" } });
  return json({ items });
});

export const POST = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const b = await body<{ name: string; language: string; category: string; components: unknown[]; submit?: boolean }>(req);
  const name = String(b.name || "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (!name) throw new HttpError(400, "Template name required");
  const t = await prisma.template.create({ data: { workspaceId: s.wid, name, language: b.language || "en", category: b.category || "MARKETING", components: (b.components || []) as object[], status: "DRAFT" } });
  if (b.submit !== false) {
    const ch = await defaultChannel(s.wid);
    if (!ch) return json({ ...t, warning: "Saved as draft — connect a WhatsApp number to submit to Meta" }, 201);
    try {
      const r = await createTemplate(ch, { name, language: t.language, category: t.category, components: b.components });
      await prisma.template.update({ where: { id: t.id }, data: { metaId: r.id, status: r.status || "PENDING", channelId: ch.id } });
    } catch (e) {
      await prisma.template.update({ where: { id: t.id }, data: { status: "REJECTED", rejectedReason: (e as Error).message } });
      throw new HttpError(400, `Meta: ${(e as Error).message}`);
    }
  }
  await audit(s.wid, s.name, "template.create", name);
  return json(await prisma.template.findUnique({ where: { id: t.id } }), 201);
});
