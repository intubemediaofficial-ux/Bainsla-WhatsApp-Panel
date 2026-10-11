"use client";
import { useCallback, useEffect, useState } from "react";
import * as I from "lucide-react";
import { api, fmtDate, inr, PageHero, Spinner } from "@/components/ui";
import { PayModal, type Billing } from "@/components/PayModal";

const LIM: Record<string, string> = { contacts: "Contacts", agents: "Agents", numbers: "WhatsApp numbers", broadcastsPerMonth: "Broadcasts / month", flows: "Bot flows" };

export default function Plans() {
  const [b, setB] = useState<Billing | null>(null);
  const [buy, setBuy] = useState<string | null>(null);
  const load = useCallback(() => api<Billing>("/api/billing").then(setB), []);
  useEffect(() => { load(); }, [load]);
  if (!b) return <div className="grid h-64 place-items-center text-emerald-600"><Spinner size={28} /></div>;
  return (
    <div>
      <PageHero title="Plans & Subscription" subtitle={b.plan ? `You are on ${b.plan.name}${b.planExpiresAt ? ` · valid till ${fmtDate(b.planExpiresAt)}` : ""}` : "Choose a plan"} icon={<I.Crown />} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{b.plans.map((p) => { const cur = b.plan?.id === p.id; return (
        <div key={p.id} className={`card flex flex-col p-6 ${cur ? "ring-2 ring-emerald-500" : ""}`}>
          <div className="text-sm font-semibold text-emerald-700">{p.name}</div>
          <div className="mt-2 text-3xl font-bold">{p.price ? inr(p.price) : "Free"}<span className="text-sm font-normal text-slate-400"> / {p.durationDays} days</span></div>
          {p.description && <p className="mt-2 text-sm text-slate-500">{p.description}</p>}
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {Object.entries(p.limits || {}).map(([k, v]) => <li key={k} className="flex items-center gap-2"><I.Check size={15} className="text-emerald-600" />{v < 0 ? "Unlimited" : Number(v).toLocaleString("en-IN")} {LIM[k] || k}</li>)}
            {(p.features || []).map((f) => <li key={f} className="flex items-center gap-2"><I.Check size={15} className="text-emerald-600" />{f}</li>)}
          </ul>
          <button disabled={!p.price} onClick={() => setBuy(p.id)} className={`mt-5 w-full ${cur ? "btn-ghost" : "btn-primary"}`}>{cur ? "Renew" : p.price ? "Upgrade" : "Included"}</button>
        </div>); })}</div>
      <PayModal b={b} open={!!buy} planId={buy || undefined} onClose={() => setBuy(null)} done={load} />
    </div>
  );
}
