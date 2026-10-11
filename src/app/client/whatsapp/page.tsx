"use client";
import { useCallback, useEffect, useState } from "react";
import * as I from "lucide-react";
import { api, Badge, Empty, Field, Modal, PageHero, Spinner, statusTone, toast } from "@/components/ui";

type Ch = { id: string; name: string; displayPhone?: string; verifiedName?: string; quality?: string; status: string; isDefault: boolean; phoneNumberId: string; wabaId: string; config: { verifyToken?: string; lastError?: string } };

export default function WhatsApp() {
  const [d, setD] = useState<{ items: Ch[]; webhookUrl: string; globalVerify: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phoneNumberId: "", wabaId: "", accessToken: "" });
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<NonNullable<typeof d>>("/api/channels").then(setD), []);
  useEffect(() => { load(); }, [load]);
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast("Copied"); };
  async function connect() {
    setBusy(true);
    try { await api("/api/channels", { method: "POST", json: f }); toast("WhatsApp number connected"); setOpen(false); setF({ name: "", phoneNumberId: "", wabaId: "", accessToken: "" }); load(); } catch (e) { toast((e as Error).message, "err"); }
    setBusy(false);
  }
  async function act(id: string, action?: string) {
    try { const r = await api<{ status?: string }>(`/api/channels/${id}`, { method: "PATCH", json: { action } }); toast(r.status ? `Status: ${r.status}` : "Updated"); load(); } catch (e) { toast((e as Error).message, "err"); }
  }
  return (
    <div>
      <PageHero title="WhatsApp Numbers" subtitle="Connect your numbers through Meta's official WhatsApp Business Cloud API" icon={<I.Plug />}
        actions={<button onClick={() => setOpen(true)} className="btn bg-white text-emerald-700 hover:bg-emerald-50"><I.Plus size={16} /> Connect Number</button>} />
      {!d ? <div className="grid h-40 place-items-center text-emerald-600"><Spinner /></div> : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {d.items.map((c) => (
              <div key={c.id} className="card p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#25D366] text-white"><I.Phone /></div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{c.verifiedName || c.name}</h3><Badge tone={statusTone(c.status)}>{c.status}</Badge>{c.isDefault && <Badge tone="violet">Default</Badge>}{c.quality && <Badge tone={c.quality === "GREEN" ? "green" : c.quality === "RED" ? "red" : "amber"}>Quality {c.quality}</Badge>}</div>
                    <div className="text-sm text-slate-500">{c.displayPhone}</div>
                    <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2"><span>Phone Number ID: <code>{c.phoneNumberId}</code></span><span>WABA ID: <code>{c.wabaId}</code></span></div>
                    {c.config?.lastError && c.status !== "CONNECTED" && <div className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{c.config.lastError}</div>}
                    {c.config?.verifyToken && <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">Verify token: <code className="rounded bg-slate-100 px-1.5 py-0.5">{c.config.verifyToken}</code><button onClick={() => copy(c.config.verifyToken!)}><I.Copy size={12} /></button></div>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => act(c.id)} className="btn-ghost px-3 py-1.5 text-xs"><I.RefreshCw size={14} /> Check</button>
                    {!c.isDefault && <button onClick={() => act(c.id, "default")} className="btn-ghost px-3 py-1.5 text-xs">Make default</button>}
                    <button onClick={async () => { const t = prompt("New permanent access token"); if (t) { await api(`/api/channels/${c.id}`, { method: "PATCH", json: { accessToken: t } }); load(); } }} className="btn-ghost px-3 py-1.5 text-xs"><I.KeyRound size={14} /></button>
                    <button onClick={async () => { if (confirm("Disconnect this number? Chats stay saved.")) { await api(`/api/channels/${c.id}`, { method: "DELETE" }); load(); } }} className="btn-ghost px-3 py-1.5 text-xs text-rose-600"><I.Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            {!d.items.length && <div className="card"><Empty text="No WhatsApp number connected yet" icon={<I.Phone />} action={<button onClick={() => setOpen(true)} className="btn-primary"><I.Plus size={16} /> Connect your first number</button>} /></div>}
          </div>
          <div className="card h-fit p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><I.Webhook size={18} className="text-emerald-600" /> Webhook setup (Meta App)</h3>
            <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-600">
              <li>Open <a href="https://developers.facebook.com/apps" target="_blank" className="font-medium text-emerald-700">developers.facebook.com</a> → your app → WhatsApp → Configuration.</li>
              <li>Callback URL: <div className="mt-1 flex items-center gap-2"><code className="break-all rounded bg-slate-100 px-2 py-1 text-xs">{d.webhookUrl}</code><button onClick={() => copy(d.webhookUrl)}><I.Copy size={13} /></button></div></li>
              <li>Verify token: the token shown on your number card{d.globalVerify ? " (or the platform token)" : ""}.</li>
              <li>Subscribe to <b>messages</b> (and <b>message_template_status_update</b>).</li>
              <li>Use a <b>System User permanent token</b> with <code>whatsapp_business_messaging</code> + <code>whatsapp_business_management</code>.</li>
            </ol>
          </div>
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Connect WhatsApp number">
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">Find these in Meta Business → WhatsApp Manager → API Setup. We verify them with Meta before saving.</div>
          <Field label="Display name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Sales number" /></Field>
          <Field label="Phone Number ID *"><input className="input" value={f.phoneNumberId} onChange={(e) => setF({ ...f, phoneNumberId: e.target.value })} /></Field>
          <Field label="WhatsApp Business Account ID *"><input className="input" value={f.wabaId} onChange={(e) => setF({ ...f, wabaId: e.target.value })} /></Field>
          <Field label="Permanent Access Token *"><textarea className="input min-h-[80px] font-mono text-xs" value={f.accessToken} onChange={(e) => setF({ ...f, accessToken: e.target.value })} /></Field>
          <button onClick={connect} disabled={busy} className="btn-primary w-full">{busy && <Spinner size={14} />} Verify & Connect</button>
        </div>
      </Modal>
    </div>
  );
}
