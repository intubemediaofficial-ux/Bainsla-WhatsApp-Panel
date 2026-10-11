"use client";
import { useCallback, useEffect, useState } from "react";
import * as I from "lucide-react";
import { api, Badge, Empty, fmtDate, inr, PageHero, Spinner, statusTone, toast } from "@/components/ui";

type P = { id: string; workspaceName: string; planName?: string; purpose: string; amount: number; utr?: string; couponCode?: string; status: string; adminNote?: string; createdAt: string };

export default function Payments() {
  const [st, setSt] = useState("PENDING");
  const [items, setItems] = useState<P[] | null>(null);
  const load = useCallback(() => api<{ items: P[] }>(`/api/admin/payments?status=${st}`).then((j) => setItems(j.items)), [st]);
  useEffect(() => { load(); }, [load]);
  async function act(id: string, action: "approve" | "reject") {
    const note = action === "reject" ? prompt("Reason (shown to vendor)") : "";
    if (note === null) return;
    try { await api(`/api/admin/payments/${id}`, { method: "PATCH", json: { action, note } }); toast(action === "approve" ? "Approved — plan/wallet updated & invoice created" : "Rejected"); load(); } catch (e) { toast((e as Error).message, "err"); }
  }
  return (
    <div>
      <PageHero title="Payment Approvals" subtitle="Verify UPI/UTR against your bank statement, then approve" icon={<I.IndianRupee />} />
      <div className="card overflow-hidden">
        <div className="flex gap-1 border-b border-slate-100 px-4 py-3 text-xs">{["PENDING", "APPROVED", "REJECTED", ""].map((s) => <button key={s} onClick={() => setSt(s)} className={`rounded-full px-3 py-1 font-semibold ${st === s ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{s || "All"}</button>)}</div>
        {!items ? <div className="flex justify-center py-10"><Spinner /></div> : !items.length ? <Empty text="Nothing here" icon={<I.CheckCircle2 />} /> : (
          <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50/70"><tr>{["Vendor", "For", "Amount", "UTR", "Status", "Date", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{items.map((p) => (
              <tr key={p.id}><td className="td font-medium">{p.workspaceName}</td><td className="td">{p.purpose === "PLAN" ? `Plan: ${p.planName}` : "Wallet recharge"}{p.couponCode && <Badge tone="violet">{p.couponCode}</Badge>}</td><td className="td font-semibold">{inr(p.amount)}</td><td className="td font-mono text-xs">{p.utr}</td><td className="td"><Badge tone={statusTone(p.status)}>{p.status}</Badge>{p.adminNote && <div className="text-[11px] text-slate-400">{p.adminNote}</div>}</td><td className="td text-xs">{fmtDate(p.createdAt)}</td>
                <td className="td whitespace-nowrap text-right">{p.status === "PENDING" && <><button onClick={() => act(p.id, "approve")} className="btn-primary px-3 py-1 text-xs">Approve</button> <button onClick={() => act(p.id, "reject")} className="btn-ghost px-3 py-1 text-xs text-rose-600">Reject</button></>}</td></tr>
            ))}</tbody></table></div>
        )}
      </div>
    </div>
  );
}
