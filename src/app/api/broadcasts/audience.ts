import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isValidPhone, normalizePhone } from "@/lib/phone";

export type Audience = { type: "all" | "tags" | "segment" | "contacts" | "phones"; tags?: string[]; segmentId?: string; contactIds?: string[]; phones?: string };

export async function audienceWhere(wid: string, a: Audience): Promise<Prisma.ContactWhereInput> {
  const base: Prisma.ContactWhereInput = { workspaceId: wid, optedOut: false };
  if (a.type === "tags" && a.tags?.length) return { ...base, tags: { hasSome: a.tags } };
  if (a.type === "contacts") return { ...base, id: { in: a.contactIds || [] } };
  if (a.type === "segment" && a.segmentId) {
    const sg = await prisma.segment.findFirst({ where: { id: a.segmentId, workspaceId: wid } });
    if (!sg) return { ...base, id: "none" };
    return { ...base, ...(sg.tags.length ? { tags: { hasSome: sg.tags } } : {}), ...(sg.stage ? { stage: sg.stage } : {}), ...(sg.leadScore ? { leadScore: sg.leadScore } : {}), ...(sg.source ? { source: sg.source } : {}) };
  }
  return base;
}

export async function resolvePhones(wid: string, raw: string) {
  const ws = await prisma.workspace.findUnique({ where: { id: wid } });
  const cc = (ws?.settings as { defaultCountryCode?: string })?.defaultCountryCode || "91";
  const phones = Array.from(new Set(raw.split(/[\s,;]+/).map((p) => normalizePhone(p, cc)).filter(isValidPhone)));
  const out = [];
  for (const phone of phones) {
    const c = await prisma.contact.upsert({ where: { workspaceId_phone: { workspaceId: wid, phone } }, update: {}, create: { workspaceId: wid, phone, source: "broadcast" } });
    if (!c.optedOut) out.push(c);
  }
  return out;
}
