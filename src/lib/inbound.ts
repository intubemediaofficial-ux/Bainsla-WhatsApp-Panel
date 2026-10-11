import type { Channel, Contact, Conversation, Workspace } from "@prisma/client";
import { prisma } from "./db";
import { emit } from "./events";
import { downloadMedia, templatePayload, buildTemplateComponents } from "./wa";
import { saveFile } from "./storage";
import { sendText, sendToContact } from "./messaging";
import { continueFlow, startFlow } from "./flow";
import { aiReply } from "./ai";
import { addTags, runAutomations, stopSequencesOnReply, triggerSequences } from "./automation";
import { wsSettings } from "./settings";

type WaMsg = {
  id: string;
  from: string;
  type: string;
  timestamp?: string;
  context?: { id?: string };
  text?: { body: string };
  button?: { text: string; payload?: string };
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string }; nfm_reply?: { response_json: string } };
  image?: { id: string; caption?: string; mime_type?: string };
  video?: { id: string; caption?: string; mime_type?: string };
  audio?: { id: string; mime_type?: string };
  voice?: { id: string; mime_type?: string };
  document?: { id: string; caption?: string; filename?: string; mime_type?: string };
  sticker?: { id: string; mime_type?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  contacts?: { name?: { formatted_name?: string }; phones?: { phone?: string }[] }[];
  reaction?: { emoji?: string };
  referral?: { source_url?: string; headline?: string; ctwa_clid?: string };
};
type WaStatus = { id: string; status: string; recipient_id: string; errors?: { title?: string; message?: string; error_data?: { details?: string } }[] };

const RANK: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3 };

export async function handleWebhook(payload: { entry?: { changes?: { field?: string; value?: Record<string, unknown> }[] }[] }) {
  for (const entry of payload.entry || []) {
    for (const ch of entry.changes || []) {
      const v = ch.value || {};
      const pnid = (v.metadata as { phone_number_id?: string })?.phone_number_id;
      if (!pnid) continue;
      const channel = await prisma.channel.findUnique({ where: { phoneNumberId: pnid } });
      if (!channel) continue;
      const profiles = (v.contacts as { wa_id: string; profile?: { name?: string } }[]) || [];
      for (const m of (v.messages as WaMsg[]) || []) {
        const name = profiles.find((p) => p.wa_id === m.from)?.profile?.name;
        await processInbound(channel, m, name).catch((e) => console.error("inbound", e));
      }
      for (const s of (v.statuses as WaStatus[]) || []) await processStatus(channel, s).catch((e) => console.error("status", e));
    }
  }
}

async function processStatus(channel: Channel, s: WaStatus) {
  const err = s.errors?.[0];
  const errText = err ? [err.title, err.message, err.error_data?.details].filter(Boolean).join(" — ") : null;
  const msg = await prisma.message.findUnique({ where: { waMessageId: s.id } });
  if (msg) {
    const better = s.status === "failed" || (RANK[s.status] ?? 0) > (RANK[msg.status] ?? 0);
    if (better) {
      await prisma.message.update({ where: { id: msg.id }, data: { status: s.status, error: errText || msg.error } });
      emit(channel.workspaceId, { type: "status", conversationId: msg.conversationId });
    }
  }
  const rec = await prisma.broadcastRecipient.findFirst({ where: { waMessageId: s.id } });
  if (!rec) return;
  const now = new Date();
  const inc: Record<string, { increment: number }> = {};
  const data: Record<string, unknown> = {};
  if (s.status === "failed" && rec.status !== "FAILED") {
    data.status = "FAILED";
    data.error = errText;
    inc.failed = { increment: 1 };
  } else {
    if ((s.status === "delivered" || s.status === "read") && !rec.deliveredAt) {
      data.deliveredAt = now;
      data.status = "DELIVERED";
      inc.delivered = { increment: 1 };
    }
    if (s.status === "read" && !rec.readAt) {
      data.readAt = now;
      data.status = "READ";
      inc.read = { increment: 1 };
    }
  }
  if (Object.keys(data).length) {
    await prisma.broadcastRecipient.update({ where: { id: rec.id }, data });
    if (Object.keys(inc).length) await prisma.broadcast.update({ where: { id: rec.broadcastId }, data: inc });
  }
}

async function extract(channel: Channel, m: WaMsg) {
  let body = "";
  let replyId: string | undefined;
  let mediaUrl: string | undefined;
  const media = m.image || m.video || m.audio || m.voice || m.document || m.sticker;
  switch (m.type) {
    case "text":
      body = m.text?.body || "";
      break;
    case "button":
      body = m.button?.text || "";
      replyId = m.button?.payload;
      break;
    case "interactive":
      body = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || m.interactive?.nfm_reply?.response_json || "";
      replyId = m.interactive?.button_reply?.id || m.interactive?.list_reply?.id;
      break;
    case "location":
      body = `📍 ${m.location?.name || ""} ${m.location?.address || ""} (${m.location?.latitude}, ${m.location?.longitude})`.trim();
      break;
    case "contacts":
      body = (m.contacts || []).map((c) => `👤 ${c.name?.formatted_name || ""} ${c.phones?.map((p) => p.phone).join(", ") || ""}`).join("\n");
      break;
    case "reaction":
      body = `Reacted ${m.reaction?.emoji || ""}`;
      break;
    default:
      body = (media as { caption?: string })?.caption || "";
  }
  if (media?.id) {
    try {
      const { buf, mime } = await downloadMedia(channel, media.id);
      const f = await saveFile(channel.workspaceId, buf, mime, (m.document?.filename as string) || m.type);
      mediaUrl = f.url;
      await prisma.mediaAsset.create({ data: { workspaceId: channel.workspaceId, name: m.document?.filename || `${m.type} from ${m.from}`, url: f.url, mime, size: buf.length } });
    } catch (e) {
      console.error("media", e);
    }
  }
  return { body, replyId, mediaUrl };
}

function withinHours(s: ReturnType<typeof wsSettings>) {
  const h = s.businessHours;
  if (!h?.enabled) return true;
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  if (h.days?.length && !h.days.includes(now.getDay())) return false;
  const hm = now.getHours() * 60 + now.getMinutes();
  const p = (t: string) => Number(t.split(":")[0]) * 60 + Number(t.split(":")[1] || 0);
  return hm >= p(h.start || "00:00") && hm <= p(h.end || "23:59");
}

export async function processInbound(channel: Channel, m: WaMsg, profileName?: string) {
  if (await prisma.message.findUnique({ where: { waMessageId: m.id } })) return;
  const ws = await prisma.workspace.findUnique({ where: { id: channel.workspaceId } });
  if (!ws) return;
  const now = new Date();
  const existing = await prisma.contact.findUnique({ where: { workspaceId_phone: { workspaceId: ws.id, phone: m.from } } });
  let contact: Contact =
    existing ||
    (await prisma.contact.create({
      data: { workspaceId: ws.id, phone: m.from, name: profileName, source: m.referral ? "ctwa_ad" : "whatsapp" },
    }));
  contact = await prisma.contact.update({
    where: { id: contact.id },
    data: { lastInboundAt: now, lastMessageAt: now, ...(contact.name ? {} : profileName ? { name: profileName } : {}) },
  });
  const { body, replyId, mediaUrl } = await extract(channel, m);
  let conv: Conversation = await prisma.conversation.upsert({
    where: { workspaceId_contactId_channelType: { workspaceId: ws.id, contactId: contact.id, channelType: "whatsapp" } },
    create: { workspaceId: ws.id, contactId: contact.id, channelId: channel.id, unread: 1, lastPreview: body.slice(0, 120) || `[${m.type}]` },
    update: { channelId: channel.id, unread: { increment: 1 }, status: "OPEN", lastMessageAt: now, lastPreview: body.slice(0, 120) || `[${m.type}]` },
  });
  if (!conv.assignedToId) {
    const s = wsSettings(ws.settings);
    if (s.roundRobin) {
      const agents = await prisma.user.findMany({ where: { workspaceId: ws.id, role: "AGENT", active: true }, orderBy: { createdAt: "asc" } });
      if (agents.length) {
        const counts = await Promise.all(agents.map((a) => prisma.conversation.count({ where: { assignedToId: a.id, status: "OPEN" } })));
        const pick = agents[counts.indexOf(Math.min(...counts))];
        conv = await prisma.conversation.update({ where: { id: conv.id }, data: { assignedToId: pick.id } });
      }
    }
  }
  await prisma.message.create({
    data: {
      workspaceId: ws.id,
      conversationId: conv.id,
      contactId: contact.id,
      channelId: channel.id,
      direction: "in",
      type: m.type === "voice" ? "audio" : m.type,
      body,
      mediaUrl,
      payload: m as object,
      waMessageId: m.id,
      status: "received",
    },
  });
  emit(ws.id, { type: "message", conversationId: conv.id });

  const rec = await prisma.broadcastRecipient.findFirst({
    where: { phone: contact.phone, repliedAt: null, sentAt: { gte: new Date(Date.now() - 72 * 3600 * 1000) }, broadcast: { workspaceId: ws.id } },
    orderBy: { sentAt: "desc" },
  });
  if (rec) {
    await prisma.broadcastRecipient.update({ where: { id: rec.id }, data: { repliedAt: now } });
    await prisma.broadcast.update({ where: { id: rec.broadcastId }, data: { replied: { increment: 1 } } });
  }

  if (ws.webhookUrl)
    fetch(ws.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Secret": ws.webhookSecret || "" },
      body: JSON.stringify({ event: "message.received", contact: { phone: contact.phone, name: contact.name }, message: { type: m.type, body, mediaUrl, id: m.id } }),
    }).catch(() => {});

  await stopSequencesOnReply(contact.id);
  if (!existing) {
    contact = await runAutomations(contact, "NEW_CONTACT");
    await triggerSequences(contact, "NEW_CONTACT");
  }
  contact = await runAutomations(contact, "MESSAGE_RECEIVED", body);
  if (m.referral) contact = await runAutomations(contact, "CTWA_LEAD", m.referral.headline || "");

  const s = wsSettings(ws.settings);
  const word = body.trim().toUpperCase();
  if (["STOP", "UNSUBSCRIBE", "OPT OUT", "OPTOUT"].includes(word)) {
    await prisma.contact.update({ where: { id: contact.id }, data: { optedOut: true } });
    await sendText(contact, s.optOutReply || "You have been unsubscribed. Reply START to subscribe again.", "Opt-out", conv);
    return;
  }
  if (["START", "SUBSCRIBE"].includes(word) && contact.optedOut) {
    await prisma.contact.update({ where: { id: contact.id }, data: { optedOut: false } });
    await sendText(contact, s.optInReply || "Welcome back! You are subscribed again.", "Opt-in", conv);
    return;
  }
  if (conv.botPaused) return;

  if (await continueFlow(ws, contact, conv, body, replyId)) return;

  const rules = await prisma.keywordRule.findMany({ where: { workspaceId: ws.id, active: true } });
  const low = body.trim().toLowerCase();
  const rule = rules.find((r) =>
    r.keywords.some((k) => {
      const kw = k.trim().toLowerCase();
      if (!kw) return false;
      return r.matchType === "EXACT" ? low === kw : r.matchType === "STARTS_WITH" ? low.startsWith(kw) : low.includes(kw);
    }),
  );
  await triggerSequences(contact, "KEYWORD", body);
  if (rule) {
    await prisma.keywordRule.update({ where: { id: rule.id }, data: { hits: { increment: 1 } } });
    if (rule.addTag) contact = await addTags(contact, rule.addTag.split(",").map((t) => t.trim()));
    if (rule.replyType === "FLOW" && rule.flowId) {
      await startFlow(rule.flowId, ws, contact, conv, body);
      return;
    }
    if (rule.replyType === "TEMPLATE" && rule.templateId) {
      const t = await prisma.template.findFirst({ where: { id: rule.templateId, workspaceId: ws.id } });
      if (t)
        await sendToContact(contact, templatePayload(t.name, t.language, buildTemplateComponents(t.components, {}, contact)), { body: `Template: ${t.name}`, sentBy: "Keyword" }, { conversation: conv });
      return;
    }
    if (rule.reply) {
      await sendText(contact, rule.reply, "Keyword", conv);
      return;
    }
  }
  const flows = await prisma.botFlow.findMany({ where: { workspaceId: ws.id, active: true } });
  const flow = flows.find((f) => f.triggers.some((t) => t.trim() && low === t.trim().toLowerCase())) || flows.find((f) => f.triggers.some((t) => t.trim() && low.includes(t.trim().toLowerCase())));
  if (flow) {
    await startFlow(flow.id, ws, contact, conv, body);
    return;
  }
  if (!withinHours(s) && s.awayMessage) {
    const recentAway = await prisma.message.findFirst({ where: { conversationId: conv.id, sentBy: "Away", createdAt: { gte: new Date(Date.now() - 6 * 3600 * 1000) } } });
    if (!recentAway) await sendText(contact, s.awayMessage, "Away", conv);
    return;
  }
  if (!existing && s.welcomeMessage) {
    await sendText(contact, s.welcomeMessage.replace(/\{\{\s*name\s*\}\}/gi, contact.name || ""), "Welcome", conv);
    return;
  }
  if (ws.aiEnabled && body && !conv.assignedToId) {
    try {
      const ans = await aiReply(ws as Workspace, conv.id, body);
      if (ans) await sendText(contact, ans, "AI", conv);
    } catch (e) {
      console.error("ai", e);
    }
  }
}
