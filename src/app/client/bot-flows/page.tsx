"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as I from "lucide-react";
import { api, Badge, Empty, fmtDate, PageHero, Spinner, toast } from "@/components/ui";

type F = { id: string; name: string; triggers: string[]; active: boolean; nodes: unknown[]; updatedAt: string };

export default function Flows() {
  const router = useRouter();
  const [items, setItems] = useState<F[] | null>(null);
  const load = useCallback(() => api<{ items: F[] }>("/api/flows").then((j) => setItems(j.items)), []);
  useEffect(() => { load(); }, [load]);
  async function create() {
    const name = prompt("Flow name", "Welcome menu");
    if (!name) return;
    try {
      const f = await api<{ id: string }>("/api/flows", { method: "POST", json: { name, triggers: ["hi", "hello"], nodes: [{ id: "start", type: "start", position: { x: 80, y: 160 }, data: {} }], edges: [], active: false } });
      router.push(`/client/bot-flows/${f.id}`);
    } catch (e) { toast((e as Error).message, "err"); }
  }
  return (
    <div>
      <PageHero title="Bot Flow Builder" subtitle="Drag-and-drop chatbots with buttons, lists, questions, conditions, AI and human handover" icon={<I.Workflow />} actions={<button onClick={create} className="btn bg-white text-emerald-700"><I.Plus size={16} /> New Flow</button>} />
      {!items ? <div className="flex justify-center py-10"><Spinner /></div> : !items.length ? <div className="card"><Empty text="No bot flows yet" icon={<I.Workflow />} action={<button onClick={create} className="btn-primary"><I.Plus size={16} /> Build your first bot</button>} /></div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((f) => (
          <div key={f.id} className="card p-5">
            <div className="flex items-start justify-between"><h3 className="font-semibold">{f.name}</h3><Badge tone={f.active ? "green" : "slate"}>{f.active ? "Live" : "Draft"}</Badge></div>
            <div className="mt-2 flex flex-wrap gap-1">{f.triggers.map((t) => <Badge key={t} tone="blue">{t}</Badge>)}</div>
            <div className="mt-2 text-xs text-slate-400">{f.nodes.length} nodes · updated {fmtDate(f.updatedAt)}</div>
            <div className="mt-4 flex gap-2">
              <Link href={`/client/bot-flows/${f.id}`} className="btn-primary flex-1 py-1.5 text-xs"><I.PenTool size={14} /> Open builder</Link>
              <button onClick={async () => { await api(`/api/flows/${f.id}`, { method: "PATCH", json: { active: !f.active } }); load(); }} className="btn-ghost py-1.5 text-xs">{f.active ? "Pause" : "Go live"}</button>
              <button onClick={async () => { if (confirm("Delete flow?")) { await api(`/api/flows/${f.id}`, { method: "DELETE" }); load(); } }} className="btn-ghost py-1.5 text-xs text-rose-600"><I.Trash2 size={14} /></button>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
