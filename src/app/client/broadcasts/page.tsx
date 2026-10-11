"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as I from "lucide-react";
import { api, Badge, Empty, Field, fmtDate, Modal, PageHero, Spinner, statusTone, toast } from "@/components/ui";

type B = { id: string; name: string; templateName: string; status: string; total: number; sent: number; delivered: number; read: number; replied: number; failed: number; scheduledAt?: string; createdAt: string };
type T = { id: string; name: string; language: string; components: { type: string; text?: string; format?: string }[] };

function Broadcasts() {
  const sp = useSearchParams();
  const [items, setItems] = useState<B[] | null>(null);
  const [open, setOpen] = useState(sp.get("new") === "1");
  const [tpls, setTpls] = useState<T[]>([]);
  const [tags, setTags] = useState<{ name: string }[]>([]);
  const [segs, setSegs] = useState<{ id: string; name: string }[]>([]);
  const [f, setF] = useState({ name: "", templateId: "", type: "all", tags: [] as string[], segmentId: "", phones: "", when: "now", scheduledAt: "", headerUrl: "" });
  const [vars, setVars] = useState<string[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<{ items: B[] }>("/api/broadcasts").then((j) => setItems(j.items)), []);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    api<{ items: T[] }>("/api/templates?status=APPROVED").then((j) => setTpls(j.items));
    api<{ items: { name: string }[] }>("/api/r/tags?take=200").then((j) => setTags(j.items));
    api<{ items: { id: string; name: string }[] }>("/api/r/segments?take=200").then((j) => setSegs(j.items));
  }, []);
  const audience = { type: f.type, tags: f.tags, segmentId: f.segmentId, phones: f.phones };
  useEffect(() => { if (!open) return; const t = setTimeout(() => api<{ count: number }>("/api/broadcasts/audience", { method: "POST", json: audience }).then((j) => setCount(j.count)).catch(() => setCount(null)), 300); return () => clearTimeout(t); }, [open, f.type, f.tags, f.segmentId, f.phones]); // eslint-disable-line react-hooks/exhaustive-deps
  const tpl = tpls.find((t) => t.id === f.templateId);
  const body = tpl?.components.find((c) => c.type === "BODY")?.text || "";
  const header = tpl?.components.find((c) => c.type === "HEADER");
  const nVars = (body.match(/\{\{\d+\}\}/g) || []).length;
  async function create() {
    setBusy(true);
    try {
      await api("/api/broadcasts", { method: "POST", json: { name: f.name, templateId: f.templateId, audience, variables: { body: vars, ...(header && header.format !== "TEXT" && f.headerUrl ? { header: f.headerUrl } : {}) }, scheduledAt: f.when === "later" && f.scheduledAt ? new Date(f.scheduledAt + ":00+05:30").toISOString() : undefined } });
      toast(f.when === "later" ? "Broadcast scheduled" : "Broadcast started");
      setOpen(false); load();
    } catch (e) { toast((e as Error).message, "err"); }
    setBusy(false);
  }
  return (
    <div>
      <PageHero title="Broadcast Campaigns" subtitle="Send approved templates to your audience — live delivery, read and reply tracking" icon={<I.Send />}
        actions={<button onClick={() => setOpen(true)} className="btn bg-white text-emerald-700 hover:bg-emerald-50"><I.Plus size={16} /> New Broadcast</button>} />
      <div className="card overflow-hidden">
        {!items ? <div className="flex justify-center py-10 text-emerald-600"><Spinner /></div> : !items.length ? <Empty text="No broadcasts yet" icon={<I.Send />} action={<button onClick={() => setOpen(true)} className="btn-primary"><I.Plus size={16} /> Create first broadcast</button>} /> : (
          <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50/70"><tr>{["Campaign", "Status", "Progress", "Delivered", "Read", "Replied", "Failed", "Created"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{items.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/60">
                <td className="td"><Link href={`/client/broadcasts/${b.id}`} className="font-semibold text-emerald-700 hover:underline">{b.name}</Link><div className="font-mono text-xs text-slate-400">{b.templateName}</div></td>
                <td className="td"><Badge tone={statusTone(b.status)}>{b.status}</Badge>{b.scheduledAt && b.status === "SCHEDULED" && <div className="mt-1 text-[11px] text-slate-400">{fmtDate(b.scheduledAt)}</div>}</td>
                <td className="td w-40"><div className="text-xs">{b.sent + b.failed}/{b.total}</div><div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${b.total ? ((b.sent + b.failed) / b.total) * 100 : 0}%` }} /></div></td>
                <td className="td">{b.delivered}</td><td className="td">{b.read}</td><td className="td">{b.replied}</td><td className="td text-rose-600">{b.failed}</td><td className="td text-xs text-slate-500">{fmtDate(b.createdAt)}</td>
              </tr>))}</tbody></table></div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="New broadcast" wide>
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <Field label="Campaign name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Diwali offer — VIPs" /></Field>
            <Field label="Template *">{tpls.length ? <select className="input" value={f.templateId} onChange={(e) => { setF({ ...f, templateId: e.target.value }); setVars([]); }}><option value="">Choose approved template…</option>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.language})</option>)}</select> : <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No approved templates. <Link href="/client/templates" className="font-semibold underline">Create / sync templates</Link></div>}</Field>
            {header && header.format !== "TEXT" && <Field label={`Header ${header.format?.toLowerCase()} URL *`}><input className="input" value={f.headerUrl} onChange={(e) => setF({ ...f, headerUrl: e.target.value })} placeholder="https://…" /></Field>}
            {Array.from({ length: nVars }).map((_, i) => <Field key={i} label={`Variable {{${i + 1}}}`} help="Use {{name}}, {{phone}} or {{field.city}} for personalisation"><input className="input" value={vars[i] || ""} onChange={(e) => { const v = [...vars]; v[i] = e.target.value; setVars(v); }} /></Field>)}
            <Field label="Audience"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["all", "All contacts"], ["tags", "By labels"], ["segment", "Segment"], ["phones", "Paste numbers"]].map(([k, l]) => <button key={k} onClick={() => setF({ ...f, type: k })} className={`rounded-xl border px-3 py-2 text-sm font-medium ${f.type === k ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200"}`}>{l}</button>)}</div></Field>
            {f.type === "tags" && <div className="flex flex-wrap gap-2">{tags.map((t) => <button key={t.name} onClick={() => setF({ ...f, tags: f.tags.includes(t.name) ? f.tags.filter((x) => x !== t.name) : [...f.tags, t.name] })} className={`rounded-full px-3 py-1 text-xs font-semibold ${f.tags.includes(t.name) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{t.name}</button>)}{!tags.length && <span className="text-xs text-slate-400">No labels yet</span>}</div>}
            {f.type === "segment" && <select className="input" value={f.segmentId} onChange={(e) => setF({ ...f, segmentId: e.target.value })}><option value="">Choose segment…</option>{segs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
            {f.type === "phones" && <textarea className="input min-h-[100px] font-mono text-xs" value={f.phones} onChange={(e) => setF({ ...f, phones: e.target.value })} placeholder={"919876543210\n919812345678"} />}
            <Field label="When"><div className="flex gap-2"><button onClick={() => setF({ ...f, when: "now" })} className={`btn ${f.when === "now" ? "btn-primary" : "btn-ghost"}`}>Send now</button><button onClick={() => setF({ ...f, when: "later" })} className={`btn ${f.when === "later" ? "btn-primary" : "btn-ghost"}`}>Schedule</button>{f.when === "later" && <input type="datetime-local" className="input w-auto" value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} />}</div></Field>
          </div>
          <div>
            <div className="label">Preview</div>
            <div className="chat-bg rounded-2xl p-4"><div className="whitespace-pre-wrap rounded-xl rounded-tl-none bg-white p-3 text-sm shadow-sm">{body.replace(/\{\{(\d+)\}\}/g, (_, n) => vars[Number(n) - 1] || `{{${n}}}`) || "Select a template"}</div></div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Recipients</span><b>{count ?? "…"}</b></div><div className="mt-1 text-xs text-slate-400">Opted-out (STOP) contacts are excluded automatically.</div></div>
            <button disabled={busy || !f.templateId || !count} onClick={create} className="btn-primary mt-4 w-full">{busy && <Spinner size={14} />} {f.when === "later" ? "Schedule broadcast" : "Send broadcast"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function Page() {
  return <Suspense><Broadcasts /></Suspense>;
}
