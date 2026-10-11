import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { body, handle, HttpError, json, requireApiKey } from "@/lib/api";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { sendToContact } from "@/lib/messaging";
import { buildTemplateComponents, mediaPayload, renderTemplateText, templatePayload, textPayload, TemplateVars } from "@/lib/wa";

export const POST = handle(async (req: NextRequest) => {
  const wid = await requireApiKey(req);
  const b = await body<{ to: string; type?: "text" | "template" | "image" | "video" | "document" | "audio"; text?: string; url?: string; caption?: string; template?: string; language?: string; variables?: TemplateVars; name?: string }>(req);
  const phone = normalizePhone(b.to || "");
  if (!isValidPhone(phone)) throw new HttpError(400, "Invalid 'to' number");
  const contact = await prisma.contact.upsert({ where: { workspaceId_phone: { workspaceId: wid, phone } }, update: {}, create: { workspaceId: wid, phone, name: b.name, source: "api" } });
  if (contact.optedOut) throw new HttpError(400, "Contact opted out");
  const type = b.type || (b.template ? "template" : "text");
  let r;
  if (type === "template") {
    const t = await prisma.template.findFirst({ where: { workspaceId: wid, name: b.template, ...(b.language ? { language: b.language } : {}), status: "APPROVED" } });
    if (!t) throw new HttpError(404, "Approved template not found");
    r = await sendToContact(contact, templatePayload(t.name, t.language, buildTemplateComponents(t.components, b.variables || {}, contact)), { type: "template", body: renderTemplateText(t.components, b.variables || {}, contact), sentBy: "API" });
  } else if (type === "text") {
    if (!b.text) throw new HttpError(400, "text required");
    r = await sendToContact(contact, textPayload(b.text), { type: "text", body: b.text, sentBy: "API" });
  } else {
    if (!b.url) throw new HttpError(400, "url required");
    r = await sendToContact(contact, mediaPayload(type, b.url, b.caption), { type, body: b.caption, mediaUrl: b.url, sentBy: "API" });
  }
  if (r.error) throw new HttpError(502, r.error);
  return json({ id: r.message.id, waMessageId: r.message.waMessageId, status: r.message.status });
});
