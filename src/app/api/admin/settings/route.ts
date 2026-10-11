import { NextRequest } from "next/server";
import { audit, body, handle, json, requireAdmin } from "@/lib/api";
import { DEFAULTS, getSetting, setSetting } from "@/lib/settings";

type K = keyof typeof DEFAULTS;
const mask = (v: Record<string, unknown>) => ({ ...v, ...(v.apiKey ? { apiKey: "••••" + String(v.apiKey).slice(-4) } : {}) });

export const GET = handle(async () => {
  await requireAdmin();
  const keys = Object.keys(DEFAULTS) as K[];
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = mask((await getSetting(k)) as Record<string, unknown>);
  return json(out);
});

export const PATCH = handle(async (req: NextRequest) => {
  const s = await requireAdmin();
  const b = await body<{ key: K; value: Record<string, unknown> }>(req);
  if (!(b.key in DEFAULTS)) return json({ error: "bad key" }, 400);
  const v = { ...b.value };
  if (typeof v.apiKey === "string" && v.apiKey.startsWith("••••")) delete v.apiKey;
  for (const [k, val] of Object.entries(v)) if (typeof (DEFAULTS[b.key] as Record<string, unknown>)[k] === "number") v[k] = Number(val);
  await setSetting(b.key, v as never);
  await audit(null, s.name, "settings.update", b.key);
  return json({ ok: true });
});
