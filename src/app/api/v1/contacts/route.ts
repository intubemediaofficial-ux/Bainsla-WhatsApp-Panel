import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { body, handle, HttpError, json, requireApiKey } from "@/lib/api";
import { isValidPhone, normalizePhone } from "@/lib/phone";

export const GET = handle(async (req: NextRequest) => {
  const wid = await requireApiKey(req);
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
  const items = await prisma.contact.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 100, take: 100, select: { id: true, phone: true, name: true, email: true, tags: true, stage: true, optedOut: true, createdAt: true } });
  return json({ items, page });
});

export const POST = handle(async (req: NextRequest) => {
  const wid = await requireApiKey(req);
  const b = await body<{ phone: string; name?: string; email?: string; tags?: string[]; customFields?: Record<string, string> }>(req);
  const phone = normalizePhone(b.phone || "");
  if (!isValidPhone(phone)) throw new HttpError(400, "Invalid phone");
  const c = await prisma.contact.upsert({
    where: { workspaceId_phone: { workspaceId: wid, phone } },
    update: { ...(b.name ? { name: b.name } : {}), ...(b.email ? { email: b.email } : {}), ...(b.tags ? { tags: b.tags } : {}), ...(b.customFields ? { customFields: b.customFields } : {}) },
    create: { workspaceId: wid, phone, name: b.name, email: b.email, tags: b.tags || [], customFields: b.customFields || {}, source: "api" },
  });
  return json(c);
});
