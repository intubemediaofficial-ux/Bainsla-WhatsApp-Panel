import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { body, handle, HttpError, json } from "@/lib/api";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { sendText } from "@/lib/messaging";
import { runAutomations } from "@/lib/automation";

export const POST = handle(async (req: NextRequest, ctx) => {
  const { slug } = await ctx.params;
  const f = await prisma.form.findUnique({ where: { slug } });
  if (!f || !f.active) throw new HttpError(404, "Form not found");
  const b = await body<Record<string, string>>(req);
  const phone = normalizePhone(b.phone || "");
  if (!b.name || !isValidPhone(phone)) throw new HttpError(400, "Name and a valid mobile number are required");
  const data: Record<string, string> = {};
  for (const k of (f.fields as string[]) || []) if (b[k]) data[k] = String(b[k]).slice(0, 2000);
  await prisma.lead.create({ data: { workspaceId: f.workspaceId, name: b.name, phone, email: b.email || null, source: `form:${f.name}`, data } });
  const contact = await prisma.contact.upsert({
    where: { workspaceId_phone: { workspaceId: f.workspaceId, phone } },
    update: { name: b.name, ...(b.email ? { email: b.email } : {}) },
    create: { workspaceId: f.workspaceId, phone, name: b.name, email: b.email || null, source: `form:${f.name}`, customFields: data },
  });
  await prisma.form.update({ where: { id: f.id }, data: { submissions: { increment: 1 } } });
  if (f.successText) sendText(contact, f.successText.replace(/\{\{name\}\}/g, b.name), "Form").catch(() => {});
  runAutomations(contact, "FORM_SUBMITTED", f.name).catch(() => {});
  return json({ ok: true });
});
