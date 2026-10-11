"use client";
import { useCallback, useEffect, useState } from "react";
import * as I from "lucide-react";
import { api, Badge, Field, fmtDate, inr, Modal, PageHero, Spinner, toast } from "@/components/ui";

type Deal = { id: string; title: string; value: number; stage: string; status: string; phone?: string; source?: string; ownerName?: string; followUpAt?: string; notes?: string };

export default function Pipeline() {
  const [stages, setStages] = useState<{ name: string; color: string }[]>([]);
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [e, setE] = useState<Partial<Deal> | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [s, d] = await Promise.all([api<{ items: { name: string; color: string }[] }>("/api/r/stages?take=50"), api<{ items: Deal[] }>("/api/r/deals?take=500")]);
    setStages(s.items.length ? s.items : [{ name: "New", color: "#64748b" }]);
    setDeals(d.items);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function save() {
    if (!e) return;
    try {
      if (e.id) await api(`/api/r/deals/${e.id}`, { method: "PATCH", json: e });
      else await api("/api/r/deals", { method: "POST", json: e });
      setE(null); load();
    } catch (x) { toast((x as Error).message, "err"); }
  }
  async function move(id: string, stage: string) {
    setDeals((ds) => ds && ds.map((d) => (d.id === id ? { ...d, stage, status: /won/i.test(stage) ? "WON" : /lost/i.test(stage) ? "LOST" : "OPEN" } : d)));
    await api(`/api/r/deals/${id}`, { method: "PATCH", json: { stage, status: /won/i.test(stage) ? "WON" : /lost/i.test(stage) ? "LOST" : "OPEN" } }).catch((x) => toast(x.message, "err"));
  }
  if (!deals) return <div className="grid h-64 place-items-center text-emerald-600"><Spinner size={28} /></div>;
  const total = deals.filter((d) => d.status === "OPEN").reduce((a, d) => a + d.value, 0);
  return (
    <div>
      <PageHero title="Sales Pipeline" subtitle={`Drag deals across stages · open pipeline ${inr(total)}`} icon={<I.KanbanSquare />} actions={<button onClick={() => setE({ stage: stages[0]?.name, value: 0 })} className="btn bg-white text-emerald-700"><I.Plus size={16} /> New Deal</button>} />
      <div className="flex gap-4 overflow-x-auto pb-4 scroll-thin">
        {stages.map((s) => { const col = deals.filter((d) => d.stage === s.name); return (
          <div key={s.name} onDragOver={(x) => x.preventDefault()} onDrop={() => drag && move(drag, s.name)} className="w-72 shrink-0 rounded-2xl bg-slate-100/80 p-3">
            <div className="mb-3 flex items-center justify-between px-1"><div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.name} <span className="text-slate-400">{col.length}</span></div><span className="text-xs text-slate-500">{inr(col.reduce((a, d) => a + d.value, 0))}</span></div>
            <div className="min-h-[120px] space-y-2">{col.map((d) => (
              <div key={d.id} draggable onDragStart={() => setDrag(d.id)} onClick={() => setE(d)} className="cursor-grab rounded-xl bg-white p-3 shadow-sm hover:shadow">
                <div className="font-medium">{d.title}</div><div className="mt-1 flex items-center justify-between text-xs"><b className="text-emerald-700">{inr(d.value)}</b>{d.phone && <span className="text-slate-400">+{d.phone}</span>}</div>
                <div className="mt-2 flex flex-wrap gap-1">{d.source && <Badge>{d.source}</Badge>}{d.followUpAt && <Badge tone={new Date(d.followUpAt) < new Date() ? "red" : "amber"}><I.Clock size={10} /> {fmtDate(d.followUpAt)}</Badge>}</div>
              </div>))}</div>
          </div>); })}
      </div>
      <Modal open={!!e} onClose={() => setE(null)} title={e?.id ? "Edit deal" : "New deal"}>{e && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Deal title *"><input className="input" value={e.title || ""} onChange={(x) => setE({ ...e, title: x.target.value })} /></Field></div>
          <Field label="Value (₹)"><input type="number" className="input" value={e.value ?? 0} onChange={(x) => setE({ ...e, value: Number(x.target.value) })} /></Field>
          <Field label="Stage"><select className="input" value={e.stage} onChange={(x) => setE({ ...e, stage: x.target.value })}>{stages.map((s) => <option key={s.name}>{s.name}</option>)}</select></Field>
          <Field label="Customer phone"><input className="input" value={e.phone || ""} onChange={(x) => setE({ ...e, phone: x.target.value })} /></Field>
          <Field label="Source"><input className="input" value={e.source || ""} onChange={(x) => setE({ ...e, source: x.target.value })} /></Field>
          <Field label="Owner"><input className="input" value={e.ownerName || ""} onChange={(x) => setE({ ...e, ownerName: x.target.value })} /></Field>
          <Field label="Follow-up"><input type="datetime-local" className="input" value={e.followUpAt ? e.followUpAt.slice(0, 16) : ""} onChange={(x) => setE({ ...e, followUpAt: x.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Notes"><textarea className="input" value={e.notes || ""} onChange={(x) => setE({ ...e, notes: x.target.value })} /></Field></div>
          <div className="flex justify-end gap-2 sm:col-span-2">{e.id && <button onClick={async () => { await api(`/api/r/deals/${e.id}`, { method: "DELETE" }); setE(null); load(); }} className="btn-ghost mr-auto text-rose-600">Delete</button>}<button onClick={save} className="btn-primary">Save</button></div>
        </div>)}</Modal>
    </div>
  );
}
