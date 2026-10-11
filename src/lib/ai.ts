import type { Workspace } from "@prisma/client";
import { prisma } from "./db";
import { getSetting } from "./settings";

function chunks(text: string, size = 900) {
  const out: string[] = [];
  const paras = text.split(/\n\s*\n/);
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > size && cur) {
      out.push(cur);
      cur = p;
    } else cur = cur ? cur + "\n\n" + p : p;
  }
  if (cur) out.push(cur);
  return out.flatMap((c) => (c.length > size * 2 ? c.match(new RegExp(`[\\s\\S]{1,${size}}`, "g")) || [] : [c]));
}

const words = (s: string) => new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));

export async function retrieve(workspaceId: string, query: string, k = 4) {
  const docs = await prisma.knowledgeDoc.findMany({ where: { workspaceId }, select: { title: true, content: true } });
  const q = words(query);
  const scored = docs.flatMap((d) =>
    chunks(d.content).map((c) => {
      const w = words(c);
      let s = 0;
      q.forEach((x) => w.has(x) && s++);
      return { s, text: `[${d.title}]\n${c}` };
    }),
  );
  return scored.sort((a, b) => b.s - a.s).filter((x) => x.s > 0).slice(0, k).map((x) => x.text);
}

export async function aiConfig(ws: Workspace) {
  const g = await getSetting("ai");
  const provider = ws.aiProvider || g.provider;
  const apiKey = ws.aiApiKey || g.apiKey;
  const baseUrl =
    provider === "gemini" ? "https://generativelanguage.googleapis.com/v1beta/openai" : provider === "custom" ? g.baseUrl : "https://api.openai.com/v1";
  const model = ws.aiModel || (provider === "gemini" ? "gemini-2.0-flash" : g.model || "gpt-4o-mini");
  return { apiKey, baseUrl: provider === g.provider && g.baseUrl && provider === "custom" ? g.baseUrl : baseUrl, model };
}

export async function chat(ws: Workspace, messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  const cfg = await aiConfig(ws);
  if (!cfg.apiKey) throw new Error("AI API key not set (Settings → AI Settings)");
  const r = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: cfg.model, messages, temperature: 0.4, max_tokens: 500 }),
  });
  const j = (await r.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  if (!r.ok) throw new Error(j.error?.message || `AI error ${r.status}`);
  return (j.choices?.[0]?.message?.content || "").trim();
}

export async function aiReply(ws: Workspace, conversationId: string, input: string, extraPrompt?: string) {
  const ctx = await retrieve(ws.id, input);
  const history = await prisma.message.findMany({
    where: { conversationId, type: { in: ["text", "interactive", "button"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const sys = [
    ws.aiPrompt || `You are a helpful WhatsApp assistant for ${ws.brandName || ws.name}. Reply briefly and politely in the customer's language (Hindi, Hinglish or English).`,
    extraPrompt || "",
    "If you don't know the answer from the knowledge base, say a team member will reply soon. Never invent prices or policies.",
    ctx.length ? `Knowledge base:\n${ctx.join("\n---\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const msgs = history
    .reverse()
    .filter((m) => m.body)
    .map((m) => ({ role: (m.direction === "in" ? "user" : "assistant") as "user" | "assistant", content: m.body! }));
  if (!msgs.length || msgs[msgs.length - 1].content !== input) msgs.push({ role: "user", content: input });
  return chat(ws, [{ role: "system", content: sys }, ...msgs]);
}
