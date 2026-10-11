"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as I from "lucide-react";
import { api, Field, fmtDate, PageHero, toast } from "@/components/ui";
import { useWorkspace } from "@/components/useWorkspace";

export default function Integrations() {
  const { ws, save } = useWorkspace();
  const [keys, setKeys] = useState<{ id: string; name: string; prefix: string; lastUsedAt?: string; createdAt: string }[]>([]);
  const [fresh, setFresh] = useState("");
  const [hook, setHook] = useState("");
  const load = useCallback(() => api<{ items: typeof keys }>("/api/api-keys").then((j) => setKeys(j.items)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (ws) setHook(ws.webhookUrl || ""); }, [ws]);
  return (
    <div>
      <PageHero title="API & Webhooks" subtitle="Connect your website, CRM, Shopify/WooCommerce, Google Sheets or Zapier/Make" icon={<I.Code2 />} actions={<Link href="/client/api-docs" className="btn bg-white text-emerald-700"><I.BookOpen size={16} /> API Docs</Link>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5"><h3 className="mb-3 flex items-center gap-2 font-semibold"><I.KeyRound size={18} className="text-emerald-600" /> API keys</h3>
          {fresh && <div className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Copy now — it won&apos;t be shown again:<div className="mt-1 flex items-center gap-2"><code className="break-all font-mono">{fresh}</code><button onClick={() => { navigator.clipboard.writeText(fresh); toast("Copied"); }}><I.Copy size={13} /></button></div></div>}
          <div className="space-y-2">{keys.map((k) => <div key={k.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm"><div><b>{k.name}</b> <code className="text-xs text-slate-400">{k.prefix}…</code><div className="text-[11px] text-slate-400">Created {fmtDate(k.createdAt)} · last used {fmtDate(k.lastUsedAt)}</div></div><button onClick={async () => { if (confirm("Revoke key?")) { await api(`/api/api-keys/${k.id}`, { method: "DELETE" }); load(); } }} className="text-slate-400 hover:text-rose-600"><I.Trash2 size={15} /></button></div>)}</div>
          <button onClick={async () => { const n = prompt("Key name", "Website"); if (n === null) return; const r = await api<{ key: string }>("/api/api-keys", { method: "POST", json: { name: n } }); setFresh(r.key); load(); }} className="btn-primary mt-3"><I.Plus size={16} /> Generate key</button>
        </div>
        <div className="card space-y-3 p-5"><h3 className="flex items-center gap-2 font-semibold"><I.Webhook size={18} className="text-emerald-600" /> Outgoing webhook</h3>
          <p className="text-sm text-slate-500">We POST every incoming message & status update (JSON) to this URL. Signed with header <code>x-signature</code> (HMAC-SHA256 of body using your secret).</p>
          <Field label="Webhook URL"><input className="input" value={hook} onChange={(e) => setHook(e.target.value)} placeholder="https://yourapp.com/whatsapp-hook" /></Field>
          {ws?.webhookSecret && <div className="text-xs text-slate-500">Secret: <code className="rounded bg-slate-100 px-1.5">{ws.webhookSecret}</code></div>}
          <button onClick={() => save({ webhookUrl: hook })} className="btn-primary">Save webhook</button>
        </div>
        <div className="card p-5 lg:col-span-2"><h3 className="mb-3 font-semibold">Popular integrations</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Google Sheets", "Use Apps Script / Make to call POST /api/v1/contacts on new rows", "Sheet"], ["Shopify / WooCommerce", "Send order confirmations with POST /api/v1/messages (template)", "ShoppingCart"], ["Website forms", "Use Lead Gen Forms or POST /api/v1/contacts", "Globe"], ["Zapier / Make / n8n", "HTTP module with your API key as Bearer token", "Zap"]].map(([t, d, ic]) => { const C = I[ic as keyof typeof I] as React.ComponentType<{ size?: number }>; return <div key={t} className="rounded-xl border border-slate-100 p-4"><div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><C size={18} /></div><div className="font-semibold">{t}</div><div className="mt-1 text-xs text-slate-500">{d}</div></div>; })}</div>
        </div>
      </div>
    </div>
  );
}
