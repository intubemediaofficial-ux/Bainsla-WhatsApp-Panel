"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as I from "lucide-react";
import { api, Badge, Empty, Field, fmtDate, Modal, PageHero, Spinner, statusTone, toast } from "@/components/ui";

type Comp = { type: string; format?: string; text?: string; buttons?: { type: string; text: string; url?: string; phone_number?: string }[] };
type T = { id: string; name: string; language: string; category: string; status: string; components: Comp[]; rejectedReason?: string; updatedAt: string };
type Btn = { type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; value: string };

function Preview({ comps }: { comps: Comp[] }) {
  const h = comps.find((c) => c.type === "HEADER"), b = comps.find((c) => c.type === "BODY"), f = comps.find((c) => c.type === "FOOTER"), bt = comps.find((c) => c.type === "BUTTONS");
  return (
    <div className="chat-bg rounded-2xl p-4">
      <div className="max-w-[290px] overflow-hidden rounded-xl rounded-tl-none bg-white text-sm shadow-sm">
        {h && (h.format === "TEXT" ? <div className="px-3 pt-2 font-semibold">{h.text}</div> : <div className="grid h-28 place-items-center bg-slate-100 text-xs text-slate-400">{h.format}</div>)}
        <div className="whitespace-pre-wrap px-3 py-2">{b?.text || "Body text…"}</div>
        {f?.text && <div className="px-3 pb-2 text-xs text-slate-400">{f.text}</div>}
        {bt?.buttons?.map((x, i) => <div key={i} className="border-t border-slate-100 py-2 text-center text-[13px] font-medium text-sky-600">{x.text}</div>)}
      </div>
    </div>
  );
}

function Templates() {
  const sp = useSearchParams();
  const [items, setItems] = useState<T[] | null>(null);
  const [open, setOpen] = useState(sp.get("new") === "1");
  const [view, setView] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", language: "en", category: "MARKETING", headerType: "NONE", header: "", headerUrl: "", body: "", footer: "", samples: "" });
  const [btns, setBtns] = useState<Btn[]>([]);
  const load = useCallback(() => api<{ items: T[] }>("/api/templates").then((j) => setItems(j.items)), []);
  useEffect(() => { load(); }, [load]);

  const comps: Comp[] = [];
  if (f.headerType === "TEXT" && f.header) comps.push({ type: "HEADER", format: "TEXT", text: f.header });
  else if (f.headerType !== "NONE") comps.push({ type: "HEADER", format: f.headerType });
  comps.push({ type: "BODY", text: f.body });
  if (f.footer) comps.push({ type: "FOOTER", text: f.footer });
  if (btns.length) comps.push({ type: "BUTTONS", buttons: btns.map((b) => ({ type: b.type, text: b.text, ...(b.type === "URL" ? { url: b.value } : b.type === "PHONE_NUMBER" ? { phone_number: b.value } : {}) })) });

  async function sync() {
    setBusy(true);
    try { const r = await api<{ synced: number }>("/api/templates/sync", { method: "POST" }); toast(`Synced ${r.synced} templates from Meta`); load(); } catch (e) { toast((e as Error).message, "err"); }
    setBusy(false);
  }
  async function create() {
    setBusy(true);
    const nVars = (f.body.match(/\{\{\d+\}\}/g) || []).length;
    const samples = f.samples.split(",").map((s) => s.trim()).filter(Boolean);
    const metaComps = comps.map((c) => {
      if (c.type === "BODY" && nVars) return { ...c, example: { body_text: [Array.from({ length: nVars }, (_, i) => samples[i] || `sample${i + 1}`)] } };
      if (c.type === "HEADER" && c.format !== "TEXT" && f.headerUrl) return { ...c, example: { header_handle: [f.headerUrl] } };
      return c;
    });
    try { const r = await api<{ warning?: string }>("/api/templates", { method: "POST", json: { name: f.name, language: f.language, category: f.category, components: metaComps } }); toast(r.warning || "Submitted to Meta for approval"); setOpen(false); load(); } catch (e) { toast((e as Error).message, "err"); load(); }
    setBusy(false);
  }
  return (
    <div>
      <PageHero title="Message Templates" subtitle="Meta-approved templates for broadcasts and messaging outside the 24-hour window" icon={<I.FileText />}
        actions={<><button onClick={sync} disabled={busy} className="btn bg-white/15 text-white hover:bg-white/25">{busy ? <Spinner size={15} /> : <I.RefreshCw size={16} />} Sync from Meta</button><button onClick={() => setOpen(true)} className="btn bg-white text-emerald-700 hover:bg-emerald-50"><I.Plus size={16} /> Create Template</button></>} />
      {!items ? <div className="grid h-40 place-items-center text-emerald-600"><Spinner /></div> : !items.length ? <div className="card"><Empty text="No templates yet — sync from Meta or create one" icon={<I.FileText />} /></div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((t) => (
            <div key={t.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2"><div><div className="font-mono text-sm font-semibold">{t.name}</div><div className="text-xs text-slate-400">{t.language} · {t.category} · {fmtDate(t.updatedAt)}</div></div><Badge tone={statusTone(t.status)}>{t.status}</Badge></div>
              <p className="mt-3 line-clamp-4 flex-1 whitespace-pre-wrap text-sm text-slate-600">{t.components.find((c) => c.type === "BODY")?.text}</p>
              {t.rejectedReason && <div className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700">{t.rejectedReason}</div>}
              <div className="mt-4 flex gap-2"><button onClick={() => setView(t)} className="btn-ghost flex-1 py-1.5 text-xs"><I.Eye size={14} /> Preview</button><button onClick={async () => { if (confirm(`Delete ${t.name} (also from Meta)?`)) { await api(`/api/templates/${t.id}`, { method: "DELETE" }); load(); } }} className="btn-ghost py-1.5 text-xs text-rose-600"><I.Trash2 size={14} /></button></div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!view} onClose={() => setView(null)} title={view?.name || ""}>{view && <Preview comps={view.components} />}</Modal>
      <Modal open={open} onClose={() => setOpen(false)} title="Create template" wide>
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Name *"><input className="input font-mono" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="diwali_offer" /></Field>
              <Field label="Category"><select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{["MARKETING", "UTILITY", "AUTHENTICATION"].map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Language"><select className="input" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}>{["en", "en_US", "hi", "pa", "mr", "gu", "ta", "te", "bn", "ur"].map((c) => <option key={c}>{c}</option>)}</select></Field>
            </div>
            <Field label="Header"><div className="flex gap-2"><select className="input w-36" value={f.headerType} onChange={(e) => setF({ ...f, headerType: e.target.value })}>{["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"].map((c) => <option key={c}>{c}</option>)}</select>
              {f.headerType === "TEXT" && <input className="input" value={f.header} onChange={(e) => setF({ ...f, header: e.target.value })} maxLength={60} />}
              {["IMAGE", "VIDEO", "DOCUMENT"].includes(f.headerType) && <input className="input" value={f.headerUrl} onChange={(e) => setF({ ...f, headerUrl: e.target.value })} placeholder="Sample media handle/URL (required by Meta)" />}</div></Field>
            <Field label="Body *" help="Use {{1}}, {{2}} for variables"><textarea className="input min-h-[140px]" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={1024} placeholder={"Hi {{1}}, our Diwali sale is live! Get {{2}} off."} /></Field>
            {(f.body.match(/\{\{\d+\}\}/g) || []).length > 0 && <Field label="Sample values (comma separated)"><input className="input" value={f.samples} onChange={(e) => setF({ ...f, samples: e.target.value })} placeholder="Rahul, 20%" /></Field>}
            <Field label="Footer"><input className="input" value={f.footer} onChange={(e) => setF({ ...f, footer: e.target.value })} maxLength={60} placeholder="Reply STOP to unsubscribe" /></Field>
            <div><div className="label">Buttons</div>
              {btns.map((b, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <select className="input w-40" value={b.type} onChange={(e) => { const n = [...btns]; n[i] = { ...b, type: e.target.value as Btn["type"] }; setBtns(n); }}><option value="QUICK_REPLY">Quick reply</option><option value="URL">Website</option><option value="PHONE_NUMBER">Call</option></select>
                  <input className="input" placeholder="Button text" value={b.text} onChange={(e) => { const n = [...btns]; n[i] = { ...b, text: e.target.value }; setBtns(n); }} />
                  {b.type !== "QUICK_REPLY" && <input className="input" placeholder={b.type === "URL" ? "https://…" : "+91…"} value={b.value} onChange={(e) => { const n = [...btns]; n[i] = { ...b, value: e.target.value }; setBtns(n); }} />}
                  <button onClick={() => setBtns(btns.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600"><I.X size={16} /></button>
                </div>
              ))}
              {btns.length < 3 && <button onClick={() => setBtns([...btns, { type: "QUICK_REPLY", text: "", value: "" }])} className="btn-ghost py-1 text-xs"><I.Plus size={14} /> Add button</button>}
            </div>
          </div>
          <div><div className="label">Preview</div><Preview comps={comps} /><button onClick={create} disabled={busy || !f.name || !f.body} className="btn-primary mt-4 w-full">{busy && <Spinner size={14} />} Submit to Meta</button></div>
        </div>
      </Modal>
    </div>
  );
}

export default function Page() {
  return <Suspense><Templates /></Suspense>;
}
