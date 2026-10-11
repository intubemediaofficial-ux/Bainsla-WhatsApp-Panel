import { NextRequest } from "next/server";
import { audit, body, handle, json, requireAdmin } from "@/lib/api";
import { DEFAULTS, getSetting, setSetting } from "@/lib/settings";
import { encrypt, maskSecret } from "@/lib/secret";

type K = keyof typeof DEFAULTS;
const SECRET_FIELDS = ["apiKey", "appSecret"];
const mask = (v: Record<string, unknown>) => {
  const o = { ...v };
  for (const f of SECRET_FIELDS) if (o[f]) o[f] = maskSecret(String(o[f]));
  return o;
};

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
  const allowed = Object.keys(DEFAULTS[b.key]);
  const v: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(b.value || {})) if (allowed.includes(k)) v[k] = val;
  for (const f of SECRET_FIELDS) {
    if (typeof v[f] !== "string") continue;
    if (String(v[f]).startsWith("••••")) delete v[f];
    else if (v[f]) v[f] = encrypt(String(v[f]).trim());
  }
  for (const [k, val] of Object.entries(v)) if (typeof (DEFAULTS[b.key] as Record<string, unknown>)[k] === "number") v[k] = Number(val);
  await setSetting(b.key, v as never);
  await audit(null, s.name, "settings.update", b.key);
  return json({ ok: true });
});
