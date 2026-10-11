import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireWs } from "@/lib/api";
import { normalizePhone, isValidPhone } from "@/lib/phone";
import { checkLimit } from "@/lib/workspace";
import { runAutomations, triggerSequences } from "@/lib/automation";

function contactWhere(wid: string, p: URLSearchParams): Prisma.ContactWhereInput {
  const w: Prisma.ContactWhereInput = { workspaceId: wid };
  const q = p.get("q")?.trim();
  if (q) w.OR = [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || q } }, { email: { contains: q, mode: "insensitive" } }];
  if (p.get("tag")) w.tags = { has: p.get("tag")! };
  if (p.get("stage")) w.stage = p.get("stage");
  if (p.get("score")) w.leadScore = p.get("score");
  if (p.get("optedOut") === "1") w.optedOut = true;
  return w;
}

export const GET = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const p = req.nextUrl.searchParams;
  const page = Math.max(1, Number(p.get("page") || 1));
  const take = Math.min(500, Number(p.get("take") || 50));
  const where = contactWhere(s.wid, p);
  const [items, total, tags, stages] = await Promise.all([
    prisma.contact.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }),
    prisma.contact.count({ where }),
    prisma.tag.findMany({ where: { workspaceId: s.wid } }),
    prisma.stage.findMany({ where: { workspaceId: s.wid }, orderBy: { sortOrder: "asc" } }),
  ]);
  return json({ items, total, tags, stages });
});

export const POST = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const b = await body<{ phone: string; name?: string; email?: string; tags?: string[] | string; stage?: string; notes?: string; customFields?: Record<string, string>; birthday?: string; anniversary?: string }>(req);
  const ws = await prisma.workspace.findUnique({ where: { id: s.wid } });
  const phone = normalizePhone(b.phone || "", (ws?.settings as { defaultCountryCode?: string })?.defaultCountryCode || "91");
  if (!isValidPhone(phone)) throw new HttpError(400, "Invalid phone number (include country code)");
  if (await prisma.contact.findUnique({ where: { workspaceId_phone: { workspaceId: s.wid, phone } } })) throw new HttpError(409, "Contact already exists");
  await checkLimit(s.wid, "contacts");
  const tags = Array.isArray(b.tags) ? b.tags : String(b.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
  const c = await prisma.contact.create({
    data: { workspaceId: s.wid, phone, name: b.name || null, email: b.email || null, tags, stage: b.stage || null, notes: b.notes || null, customFields: b.customFields || {}, source: "manual", birthday: b.birthday ? new Date(b.birthday) : null, anniversary: b.anniversary ? new Date(b.anniversary) : null },
  });
  await audit(s.wid, s.name, "contact.create", phone);
  triggerSequences(c, "NEW_CONTACT").catch(() => {});
  runAutomations(c, "NEW_CONTACT").catch(() => {});
  return json(c, 201);
});
