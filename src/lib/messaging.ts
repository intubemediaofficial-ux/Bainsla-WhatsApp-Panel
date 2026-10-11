import type { Channel, Contact, Conversation } from "@prisma/client";
import { prisma } from "./db";
import { emit } from "./events";
import { sendWa, WaPayload } from "./wa";

export async function defaultChannel(workspaceId: string, channelId?: string | null): Promise<Channel | null> {
  if (channelId) {
    const c = await prisma.channel.findFirst({ where: { id: channelId, workspaceId } });
    if (c) return c;
  }
  return (
    (await prisma.channel.findFirst({ where: { workspaceId, type: "whatsapp", status: "CONNECTED", isDefault: true } })) ||
    (await prisma.channel.findFirst({ where: { workspaceId, type: "whatsapp", status: "CONNECTED" }, orderBy: { createdAt: "asc" } }))
  );
}

export async function ensureConversation(contact: Contact, channelId?: string | null) {
  return prisma.conversation.upsert({
    where: { workspaceId_contactId_channelType: { workspaceId: contact.workspaceId, contactId: contact.id, channelType: "whatsapp" } },
    create: { workspaceId: contact.workspaceId, contactId: contact.id, channelId: channelId || null },
    update: channelId ? { channelId } : {},
  });
}

export type OutMeta = { type?: string; body?: string; mediaUrl?: string; sentBy?: string; sentById?: string; broadcastId?: string };

export function previewOf(payload: WaPayload, meta: OutMeta) {
  if (meta.body) return meta.body.slice(0, 120);
  if (payload.type === "template") return `Template: ${(payload.template as { name: string }).name}`;
  return `[${payload.type}]`;
}

export async function sendToContact(
  contact: Contact,
  payload: WaPayload,
  meta: OutMeta = {},
  opts: { conversation?: Conversation; channelId?: string | null; throwOnError?: boolean } = {},
) {
  const conv = opts.conversation || (await ensureConversation(contact, opts.channelId));
  const channel = await defaultChannel(contact.workspaceId, opts.channelId || conv.channelId);
  let waMessageId: string | null = null;
  let status = "sent";
  let error: string | null = null;
  try {
    if (!channel) throw new Error("WhatsApp not connected — add your number in Channels → WhatsApp Settings");
    waMessageId = (await sendWa(channel, contact.phone, payload)) || null;
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
  }
  const msg = await prisma.message.create({
    data: {
      workspaceId: contact.workspaceId,
      conversationId: conv.id,
      contactId: contact.id,
      channelId: channel?.id,
      direction: "out",
      type: meta.type || payload.type,
      body: meta.body,
      mediaUrl: meta.mediaUrl,
      payload: payload as object,
      waMessageId,
      status,
      error,
      sentBy: meta.sentBy,
      sentById: meta.sentById,
      broadcastId: meta.broadcastId,
    },
  });
  const now = new Date();
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessageAt: now, lastPreview: previewOf(payload, meta), channelId: channel?.id ?? conv.channelId },
  });
  await prisma.contact.update({ where: { id: contact.id }, data: { lastMessageAt: now } });
  emit(contact.workspaceId, { type: "message", conversationId: conv.id });
  if (error && opts.throwOnError) throw new Error(error);
  return { message: msg, error };
}

export async function sendText(contact: Contact, text: string, sentBy = "Bot", conversation?: Conversation) {
  return sendToContact(contact, { type: "text", text: { body: text, preview_url: true } }, { body: text, sentBy }, { conversation });
}
