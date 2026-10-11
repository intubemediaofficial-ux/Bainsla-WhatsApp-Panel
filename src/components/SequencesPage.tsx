"use client";
import { useCallback, useEffect, useState } from "react";
import * as I from "lucide-react";
import { api, Badge, Empty, Field, Modal, PageHero, Spinner, toast } from "./ui";

type Step = { delayMinutes: number; type: "text" | "template"; text?: string; templateId?: string; vars?: { body?: string[] } };
type Seq = { id?: string; name: string; kind: string; trigger: string; triggerValue?: string; steps: Step[]; active: boolean; enrolled?: number };

export default function SequencesPage({ kind }: { kind: "DRIP" | "FOLLOWUP" }) {
  const [items, setItems] = useState<Seq[] | null>(null);
  const [e, setE] = useState<Seq | null>(null);
  const [tpls, setTpls] = useState<{ id: string; name: string }[]>([]);
  const load = useCallback(() => api<{ items: Seq[] }>(`/api/sequences?kind=${kind}`).then((j) => setItems(j.items)), [kind]);
  useEffect(() => { load(); api<{ items: { id: string; name: string }[] }>("/api/templates?status=APPROVED").then((j) => setTpls(j.items)); }, [load]);
  async function save() {
    if (!e) return;
    try {
      if (e.id) await api(`/api/sequences/${e.id}`, { method: "PATCH", json: e });
      else await api("/api/sequences", { method: "POST", json: e });
      toast("Saved"); setE(null); load();
    } catch (x) { toast((x as Error).message, "err"); }
  }
  const setStep = (i: number, s: Partial<Step>) => e && setE({ ...e, steps: e.steps.map((x, j) => (j === i ? { ...x, ...s } : x)) });
  const title = kind === "DRIP" ? "Drip Campaigns" : "Follow-up Sequences";
  return (
    <div>
      <PageHero title={title} subtitle={kind === "DRIP" ? "Multi-day message series that start on new contact, keyword or label" : "Automatic follow-ups that stop as soon as the customer replies"} icon={<I.Repeat />}
        actions={<button onClick={() => setE({ name: "", kind, trigger: "NEW_CONTACT", steps: [{ delayMinutes: 60, type: "text", text: "" }], active: true })} className="btn bg-white text-emerald-700"><I.Plus size={16} /> New</button>} />
      {!items ? <div className="flex justify-center py-10"><Spinner /></div> : !items.length ? <div className="card"><Empty text={`No ${title.toLowerCase()} yet`} icon={<I.Repeat />} /></div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((s) => (
          <div key={s.id} className="card p-5"><div className="flex items-start justify-between"><h3 className="font-semibold">{s.name}</h3><Badge tone={s.active ? "green" : "slate"}>{s.active ? "Active" : "Off"}</Badge></div>
            <div className="mt-1 text-xs text-slate-500">Trigger: {s.trigger}{s.triggerValue ? ` "${s.triggerValue}"` : ""} · {s.steps.length} steps · {s.enrolled || 0} enrolled</div>
            <div className="mt-3 space-y-1">{s.steps.slice(0, 4).map((st, i) => <div key={i} className="flex items-center gap-2 text-xs text-slate-600"><span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">+{st.delayMinutes >= 1440 ? `${Math.round(st.delayMinutes / 1440)}d` : st.delayMinutes >= 60 ? `${Math.round(st.delayMinutes / 60)}h` : `${st.delayMinutes}m`}</span><span className="truncate">{st.type === "template" ? `Template: ${tpls.find((t) => t.id === st.templateId)?.name || "?"}` : st.text}</span></div>)}</div>
            <div className="mt-4 flex gap-2"><button onClick={() => setE(s)} className="btn-ghost flex-1 py-1.5 text-xs"><I.Pencil size={14} /> Edit</button><button onClick={async () => { if (confirm("Delete?")) { await api(`/api/sequences/${s.id}`, { method: "DELETE" }); load(); } }} className="btn-ghost py-1.5 text-xs text-rose-600"><I.Trash2 size={14} /></button></div></div>
        ))}</div>
      )}
      <Modal open={!!e} onClose={() => setE(null)} title={e?.id ? "Edit sequence" : "New sequence"} wide>{e && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name"><input className="input" value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} /></Field>
            <Field label="Start when"><select className="input" value={e.trigger} onChange={(x) => setE({ ...e, trigger: x.target.value })}><option value="NEW_CONTACT">New contact</option><option value="KEYWORD">Keyword received</option><option value="TAG_ADDED">Label added</option><option value="MANUAL">Manual / automation</option></select></Field>
            {(e.trigger === "KEYWORD" || e.trigger === "TAG_ADDED") && <Field label={e.trigger === "KEYWORD" ? "Keyword" : "Label"}><input className="input" value={e.triggerValue || ""} onChange={(x) => setE({ ...e, triggerValue: x.target.value })} /></Field>}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={e.active} onChange={(x) => setE({ ...e, active: x.target.checked })} className="accent-emerald-600" /> Active</label>
          <div className="text-xs text-slate-500">Free-text steps only deliver inside the 24h window; use templates for later steps.</div>
          {e.steps.map((s, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2"><b className="text-sm">Step {i + 1}</b><span className="text-xs text-slate-500">wait</span><input type="number" min={0} className="input w-24 py-1" value={s.delayMinutes} onChange={(x) => setStep(i, { delayMinutes: Number(x.target.value) })} /><span className="text-xs text-slate-500">minutes, then send</span>
                <select className="input w-32 py-1" value={s.type} onChange={(x) => setStep(i, { type: x.target.value as Step["type"] })}><option value="text">Text</option><option value="template">Template</option></select>
                <button onClick={() => setE({ ...e, steps: e.steps.filter((_, j) => j !== i) })} className="ml-auto text-slate-400 hover:text-rose-600"><I.X size={16} /></button></div>
              {s.type === "text" ? <textarea className="input min-h-[70px]" value={s.text || ""} onChange={(x) => setStep(i, { text: x.target.value })} placeholder="Hi {{name}}, just checking in…" />
                : <div className="flex gap-2"><select className="input" value={s.templateId || ""} onChange={(x) => setStep(i, { templateId: x.target.value })}><option value="">Choose template…</option>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><input className="input" placeholder="Variables: {{name}}, 20%" value={(s.vars?.body || []).join(", ")} onChange={(x) => setStep(i, { vars: { body: x.target.value.split(",").map((v) => v.trim()) } })} /></div>}
            </div>
          ))}
          <button onClick={() => setE({ ...e, steps: [...e.steps, { delayMinutes: 1440, type: "template" }] })} className="btn-ghost"><I.Plus size={16} /> Add step</button>
          <div className="flex justify-end"><button onClick={save} className="btn-primary">Save</button></div>
        </div>)}</Modal>
    </div>
  );
}
