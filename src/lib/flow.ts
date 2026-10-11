import type { Contact, Conversation, Workspace } from "@prisma/client";
import { prisma } from "./db";
import { sendToContact } from "./messaging";
import { buttonsPayload, listPayload, mediaPayload, textPayload, fillPlaceholders } from "./wa";
import { aiReply } from "./ai";

export type FlowNode = { id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> };
export type FlowEdge = { id: string; source: string; target: string; sourceHandle?: string | null };

const WAITING = new Set(["buttons", "list", "question"]);
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const arr = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).map(str).filter(Boolean) : str(v).split("\n").map((s) => s.trim()).filter(Boolean));

function nextNode(edges: FlowEdge[], from: string, handle?: string) {
  const e = edges.find((x) => x.source === from && (handle ? x.sourceHandle === handle : !x.sourceHandle || x.sourceHandle === "out"));
  return e?.target || (handle ? null : edges.find((x) => x.source === from)?.target) || null;
}

type Ctx = { ws: Workspace; contact: Contact; conv: Conversation; vars: Record<string, string>; input: string };

function render(t: string, ctx: Ctx) {
  return fillPlaceholders(t, ctx.contact).replace(/\{\{\s*var\.([\w-]+)\s*\}\}/g, (_, k) => ctx.vars[k] || "");
}

async function exec(node: FlowNode, ctx: Ctx): Promise<string | null | "WAIT"> {
  const d = node.data || {};
  const say = (p: Parameters<typeof sendToContact>[1], body?: string, extra: object = {}) =>
    sendToContact(ctx.contact, p, { body, sentBy: "Bot Flow", ...extra }, { conversation: ctx.conv });
  switch (node.type) {
    case "message":
      await say(textPayload(render(str(d.text), ctx)), render(str(d.text), ctx));
      return null;
    case "media": {
      const t = (str(d.mediaType) || "image") as "image" | "video" | "audio" | "document";
      await say(mediaPayload(t, str(d.url), render(str(d.caption), ctx)), render(str(d.caption), ctx) || `[${t}]`, { type: t, mediaUrl: str(d.url) });
      return null;
    }
    case "buttons": {
      const b = arr(d.buttons).slice(0, 3);
      await say(buttonsPayload(render(str(d.text), ctx), b.map((title, i) => ({ id: `${node.id}:b${i}`, title }))), render(str(d.text), ctx));
      return "WAIT";
    }
    case "list": {
      const items = arr(d.items).slice(0, 10);
      await say(listPayload(render(str(d.text), ctx), str(d.buttonText), items.map((title, i) => ({ id: `${node.id}:i${i}`, title }))), render(str(d.text), ctx));
      return "WAIT";
    }
    case "question":
      await say(textPayload(render(str(d.text), ctx)), render(str(d.text), ctx));
      return "WAIT";
    case "tag": {
      const tag = str(d.tag);
      if (tag && !ctx.contact.tags.includes(tag))
        ctx.contact = await prisma.contact.update({ where: { id: ctx.contact.id }, data: { tags: { push: tag } } });
      return null;
    }
    case "condition": {
      const v = (ctx.vars[str(d.variable)] ?? ctx.input).toLowerCase();
      const want = str(d.value).toLowerCase();
      const hit = d.operator === "equals" ? v === want : v.includes(want);
      return hit ? "yes" : "no";
    }
    case "handover":
      if (str(d.text)) await say(textPayload(render(str(d.text), ctx)), render(str(d.text), ctx));
      await prisma.conversation.update({ where: { id: ctx.conv.id }, data: { botPaused: true, status: "OPEN" } });
      return "END";
    case "ai": {
      const ans = await aiReply(ctx.ws, ctx.conv.id, ctx.input, str(d.prompt)).catch((e) => `(${e.message})`);
      await say(textPayload(ans), ans, { sentBy: "AI" });
      return null;
    }
    case "webhook":
      if (str(d.url))
        await fetch(str(d.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact: { phone: ctx.contact.phone, name: ctx.contact.name }, vars: ctx.vars, input: ctx.input }),
        }).catch(() => {});
      return null;
    case "end":
      return "END";
    default:
      return null;
  }
}

async function runFrom(flow: { id: string; nodes: unknown; edges: unknown }, startId: string | null, ctx: Ctx) {
  const nodes = (flow.nodes as FlowNode[]) || [];
  const edges = (flow.edges as FlowEdge[]) || [];
  let cur = startId;
  for (let i = 0; cur && i < 25; i++) {
    const node = nodes.find((n) => n.id === cur);
    if (!node) break;
    const r = await exec(node, ctx);
    if (r === "WAIT") {
      await prisma.flowSession.upsert({
        where: { conversationId: ctx.conv.id },
        create: { conversationId: ctx.conv.id, flowId: flow.id, nodeId: node.id, vars: ctx.vars },
        update: { flowId: flow.id, nodeId: node.id, vars: ctx.vars },
      });
      return;
    }
    if (r === "END") break;
    cur = r === "yes" || r === "no" ? nextNode(edges, node.id, r) : nextNode(edges, node.id);
  }
  await prisma.flowSession.deleteMany({ where: { conversationId: ctx.conv.id } });
}

export async function startFlow(flowId: string, ws: Workspace, contact: Contact, conv: Conversation, input: string) {
  const flow = await prisma.botFlow.findFirst({ where: { id: flowId, workspaceId: ws.id } });
  if (!flow) return false;
  const nodes = (flow.nodes as FlowNode[]) || [];
  const start = nodes.find((n) => n.type === "start");
  await prisma.botFlow.update({ where: { id: flow.id }, data: { runs: { increment: 1 } } });
  await runFrom(flow, start ? nextNode((flow.edges as FlowEdge[]) || [], start.id) : nodes[0]?.id || null, { ws, contact, conv, vars: {}, input });
  return true;
}

export async function continueFlow(ws: Workspace, contact: Contact, conv: Conversation, input: string, replyId?: string) {
  const s = await prisma.flowSession.findUnique({ where: { conversationId: conv.id } });
  if (!s) return false;
  if (Date.now() - s.updatedAt.getTime() > 24 * 3600 * 1000) {
    await prisma.flowSession.delete({ where: { id: s.id } });
    return false;
  }
  const flow = await prisma.botFlow.findUnique({ where: { id: s.flowId } });
  if (!flow || !flow.active) return false;
  const nodes = (flow.nodes as FlowNode[]) || [];
  const edges = (flow.edges as FlowEdge[]) || [];
  const node = nodes.find((n) => n.id === s.nodeId);
  if (!node) return false;
  const vars = (s.vars as Record<string, string>) || {};
  const ctx: Ctx = { ws, contact, conv, vars, input };
  let next: string | null = null;
  if (node.type === "question") {
    const key = str(node.data.saveAs) || "answer";
    vars[key] = input;
    if (str(node.data.saveToField)) {
      const cf = { ...((contact.customFields as object) || {}), [str(node.data.saveToField)]: input };
      ctx.contact = await prisma.contact.update({ where: { id: contact.id }, data: { customFields: cf } });
    }
    next = nextNode(edges, node.id);
  } else {
    const opts = arr(node.type === "buttons" ? node.data.buttons : node.data.items);
    const prefix = node.type === "buttons" ? "b" : "i";
    let idx = -1;
    if (replyId?.startsWith(node.id + ":")) idx = Number(replyId.split(":")[1].slice(1));
    if (idx < 0) idx = opts.findIndex((o) => o.toLowerCase() === input.trim().toLowerCase());
    if (idx < 0) {
      await prisma.flowSession.delete({ where: { id: s.id } });
      return false;
    }
    vars[str(node.data.saveAs) || "choice"] = opts[idx];
    next = nextNode(edges, node.id, `${prefix}${idx}`);
  }
  await runFrom(flow, next, ctx);
  return true;
}
