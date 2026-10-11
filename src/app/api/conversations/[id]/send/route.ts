import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { body, handle, HttpError, json, requireWs } from "@/lib/api";
import { sendToContact } from "@/lib/messaging";
import { buildTemplateComponents, mediaPayload, renderTemplateText, templatePayload, textPayload, TemplateVars } from "@/lib/wa";

type B = { kind: "text" | "media" | "template"; text?: string; mediaType?: "image" | "video" | "audio" | "document"; url?: string; filename?: string; templateId?: string; vars?: TemplateVars };

export const POST = handle(async (req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  const conv = await prisma.conversation.findFirst({ where: { id, workspaceId: s.wid }, include: { contact: true } });
  if (!conv) throw new HttpError(404, "Not found");
  if (conv.contact.optedOut) throw new HttpError(400, "Contact has opted out (STOP). They must reply START first.");
  const b = await body<B>(req);
  const sender = { sentBy: s.name, sentById: s.uid };
  const opts = { conversation: conv, channelId: conv.channelId, throwOnError: true };
  let msg;
  if (b.kind === "template") {
    const t = await prisma.template.findFirst({ where: { id: b.templateId, workspaceId: s.wid } });
    if (!t) throw new HttpError(404, "Template not found");
    const comps = buildTemplateComponents(t.components, b.vars || {}, conv.contact);
    msg = await sendToContact(conv.contact, templatePayload(t.name, t.language, comps), { ...sender, type: "template", body: renderTemplateText(t.components, b.vars || {}, conv.contact) }, opts);
  } else {
    const last = conv.contact.lastInboundAt;
    if (!last || Date.now() - new Date(last).getTime() > 24 * 3600 * 1000) throw new HttpError(400, "24-hour window closed — send an approved template instead");
    if (b.kind === "media") {
      if (!b.url || !b.mediaType) throw new HttpError(400, "Media missing");
      msg = await sendToContact(conv.contact, mediaPayload(b.mediaType, b.url, b.text, b.filename), { ...sender, type: b.mediaType, body: b.text || b.filename, mediaUrl: b.url }, opts);
    } else {
      if (!b.text?.trim()) throw new HttpError(400, "Message is empty");
      msg = await sendToContact(conv.contact, textPayload(b.text), { ...sender, type: "text", body: b.text }, opts);
    }
  }
  return json(msg);
});
