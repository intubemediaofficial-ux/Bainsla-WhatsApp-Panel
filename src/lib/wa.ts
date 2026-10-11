import type { Channel } from "@prisma/client";

const GRAPH = () => `https://graph.facebook.com/${process.env.GRAPH_VERSION || "v21.0"}`;

export type WaPayload = Record<string, unknown> & { type: string };

async function graph<T = Record<string, unknown>>(path: string, token: string, init?: RequestInit): Promise<T> {
  const r = await fetch(GRAPH() + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const j = (await r.json().catch(() => ({}))) as { error?: { message?: string; error_user_msg?: string } } & T;
  if (!r.ok) throw new Error(j?.error?.error_user_msg || j?.error?.message || `Meta API error ${r.status}`);
  return j;
}

function need(ch: Pick<Channel, "accessToken" | "phoneNumberId">) {
  if (!ch.accessToken || !ch.phoneNumberId) throw new Error("WhatsApp number is not connected");
  return { token: ch.accessToken, pnid: ch.phoneNumberId };
}

export async function sendWa(ch: Channel, to: string, payload: WaPayload): Promise<string> {
  const { token, pnid } = need(ch);
  const j = await graph<{ messages?: { id: string }[] }>(`/${pnid}/messages`, token, {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...payload }),
  });
  return j.messages?.[0]?.id || "";
}

export const textPayload = (body: string): WaPayload => ({ type: "text", text: { body, preview_url: true } });

export function mediaPayload(type: "image" | "video" | "audio" | "document", link: string, caption?: string, filename?: string): WaPayload {
  const m: Record<string, string> = { link };
  if (caption && type !== "audio") m.caption = caption;
  if (filename && type === "document") m.filename = filename;
  return { type, [type]: m };
}

export const templatePayload = (name: string, language: string, components: unknown[]): WaPayload => ({
  type: "template",
  template: { name, language: { code: language }, components },
});

export function buttonsPayload(body: string, buttons: { id: string; title: string }[], header?: string, footer?: string): WaPayload {
  return {
    type: "interactive",
    interactive: {
      type: "button",
      ...(header ? { header: { type: "text", text: header.slice(0, 60) } } : {}),
      body: { text: body.slice(0, 1024) },
      ...(footer ? { footer: { text: footer.slice(0, 60) } } : {}),
      action: { buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } })) },
    },
  };
}

export function listPayload(body: string, buttonText: string, rows: { id: string; title: string; description?: string }[]): WaPayload {
  return {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body.slice(0, 1024) },
      action: {
        button: (buttonText || "Options").slice(0, 20),
        sections: [{ title: "Options", rows: rows.slice(0, 10).map((r) => ({ id: r.id, title: r.title.slice(0, 24), description: r.description?.slice(0, 72) })) }],
      },
    },
  };
}

export const locationPayload = (lat: number, lng: number, name?: string, address?: string): WaPayload => ({
  type: "location",
  location: { latitude: lat, longitude: lng, name, address },
});

export async function fetchPhoneInfo(ch: Channel) {
  const { token, pnid } = need(ch);
  return graph<{ display_phone_number?: string; verified_name?: string; quality_rating?: string }>(
    `/${pnid}?fields=display_phone_number,verified_name,quality_rating`,
    token,
  );
}

export type MetaTemplate = { id: string; name: string; language: string; category: string; status: string; components: unknown[]; rejected_reason?: string };

export async function listTemplates(ch: Channel): Promise<MetaTemplate[]> {
  if (!ch.wabaId || !ch.accessToken) throw new Error("WABA ID / token missing on this number");
  const out: MetaTemplate[] = [];
  let next: string | null = `/${ch.wabaId}/message_templates?limit=200&fields=id,name,language,category,status,components,rejected_reason`;
  while (next) {
    const j: { data: MetaTemplate[]; paging?: { next?: string } } = await graph(next, ch.accessToken);
    out.push(...j.data);
    next = j.paging?.next ? j.paging.next.replace(GRAPH(), "") : null;
  }
  return out;
}

export async function createTemplate(ch: Channel, t: { name: string; language: string; category: string; components: unknown[] }) {
  if (!ch.wabaId || !ch.accessToken) throw new Error("WABA ID / token missing on this number");
  return graph<{ id: string; status: string; category: string }>(`/${ch.wabaId}/message_templates`, ch.accessToken, {
    method: "POST",
    body: JSON.stringify(t),
  });
}

export async function deleteTemplate(ch: Channel, name: string) {
  if (!ch.wabaId || !ch.accessToken) return;
  await graph(`/${ch.wabaId}/message_templates?name=${encodeURIComponent(name)}`, ch.accessToken, { method: "DELETE" });
}

export async function downloadMedia(ch: Channel, mediaId: string): Promise<{ buf: Buffer; mime: string }> {
  const { token } = need(ch);
  const meta = await graph<{ url: string; mime_type: string }>(`/${mediaId}`, token);
  const r = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error("media download failed");
  return { buf: Buffer.from(await r.arrayBuffer()), mime: meta.mime_type };
}

export async function markRead(ch: Channel, waMessageId: string) {
  const { token, pnid } = need(ch);
  await graph(`/${pnid}/messages`, token, {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: waMessageId }),
  }).catch(() => {});
}

type TplComponent = { type: string; format?: string; text?: string; buttons?: { type: string; text?: string; url?: string }[] };
export type TemplateVars = { header?: string; body?: string[]; buttons?: Record<string, string> };

export const countVars = (text?: string) => {
  const m = (text || "").match(/\{\{\s*(\d+)\s*\}\}/g) || [];
  return new Set(m.map((x) => x.replace(/\D/g, ""))).size;
};

export function fillPlaceholders(v: string, c: { name?: string | null; phone: string; email?: string | null; customFields?: unknown }) {
  const cf = (c.customFields || {}) as Record<string, unknown>;
  return v
    .replace(/\{\{\s*name\s*\}\}/gi, c.name || "Customer")
    .replace(/\{\{\s*phone\s*\}\}/gi, c.phone)
    .replace(/\{\{\s*email\s*\}\}/gi, c.email || "")
    .replace(/\{\{\s*field\.([\w-]+)\s*\}\}/gi, (_, k) => String(cf[k] ?? ""));
}

export function buildTemplateComponents(components: unknown, vars: TemplateVars, contact: Parameters<typeof fillPlaceholders>[1]) {
  const comps = (Array.isArray(components) ? components : []) as TplComponent[];
  const out: unknown[] = [];
  for (const c of comps) {
    if (c.type === "HEADER") {
      if (c.format === "TEXT" && countVars(c.text) > 0) {
        out.push({ type: "header", parameters: [{ type: "text", text: fillPlaceholders(vars.header || "", contact) || "-" }] });
      } else if (c.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(c.format) && vars.header) {
        const t = c.format.toLowerCase();
        out.push({ type: "header", parameters: [{ type: t, [t]: { link: vars.header } }] });
      }
    }
    if (c.type === "BODY") {
      const n = countVars(c.text);
      if (n > 0) {
        const params = Array.from({ length: n }, (_, i) => ({
          type: "text",
          text: fillPlaceholders(vars.body?.[i] || "", contact) || "-",
        }));
        out.push({ type: "body", parameters: params });
      }
    }
    if (c.type === "BUTTONS") {
      (c.buttons || []).forEach((b, i) => {
        if (b.type === "URL" && b.url && countVars(b.url) > 0) {
          out.push({
            type: "button",
            sub_type: "url",
            index: String(i),
            parameters: [{ type: "text", text: fillPlaceholders(vars.buttons?.[String(i)] || "", contact) || "-" }],
          });
        }
      });
    }
  }
  return out;
}

export function renderTemplateText(components: unknown, vars: TemplateVars, contact: Parameters<typeof fillPlaceholders>[1]) {
  const comps = (Array.isArray(components) ? components : []) as TplComponent[];
  const body = comps.find((c) => c.type === "BODY")?.text || "";
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => fillPlaceholders(vars.body?.[Number(n) - 1] || "", contact) || `{{${n}}}`);
}
