"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as I from "lucide-react";
import { api, Badge, fmtDate, inr, PageHero, Spinner, Stat, statusTone } from "@/components/ui";
import { PayModal, type Billing } from "@/components/PayModal";

export default function Wallet() {
  const [b, setB] = useState<Billing | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => api<Billing>("/api/billing").then(setB), []);
  useEffect(() => { load(); }, [load]);
  if (!b) return <div className="grid h-64 place-items-center text-emerald-600"><Spinner size={28} /></div>;
  return (
    <div>
      <PageHero title="Wallet & Billing" subtitle="Recharge your wallet for message credits and track payment requests" icon={<I.Wallet />} actions={<button onClick={() => setOpen(true)} className="btn bg-white text-emerald-700"><I.Plus size={16} /> Recharge</button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Wallet balance" value={inr(Number(b.wallet))} icon={<I.Wallet />} />
        <Link href="/client/subscriptions"><Stat label="Current plan" value={b.plan?.name || "—"} hint={b.planExpiresAt ? `valid till ${fmtDate(b.planExpiresAt)}` : ""} icon={<I.Crown />} tone="violet" /></Link>
        <Stat label="Pending requests" value={b.requests.filter((r) => r.status === "PENDING").length} icon={<I.Clock />} tone="amber" />
      </div>
      <div className="card mt-5 overflow-hidden"><div className="border-b border-slate-100 px-5 py-3 font-semibold">Payment requests</div>
        <table className="w-full"><thead className="bg-slate-50/70"><tr>{["Date", "For", "Amount", "UTR", "Status"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{b.requests.map((r) => <tr key={r.id}><td className="td text-xs">{fmtDate(r.createdAt)}</td><td className="td">{r.purpose === "PLAN" ? "Plan" : "Wallet"}</td><td className="td font-semibold">{inr(r.amount)}</td><td className="td font-mono text-xs">{r.utr}</td><td className="td"><Badge tone={statusTone(r.status)}>{r.status}</Badge>{r.adminNote && <div className="text-[11px] text-slate-400">{r.adminNote}</div>}</td></tr>)}</tbody></table>
        {!b.requests.length && <div className="py-8 text-center text-sm text-slate-400">No payments yet</div>}
      </div>
      <PayModal b={b} open={open} onClose={() => setOpen(false)} done={load} />
    </div>
  );
}
