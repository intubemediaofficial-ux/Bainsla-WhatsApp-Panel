"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as I from "lucide-react";
import { api, Badge, fmtDate, PageHero, Spinner, Stat, statusTone, toast } from "@/components/ui";

type R = { id: string; phone: string; name?: string; status: string; error?: string; sentAt?: string; deliveredAt?: string; readAt?: string; repliedAt?: string };
type B = { id: string; name: string; templateName: string; status: string; total: number; sent: number; delivered: number; read: number; replied: number; failed: number; createdAt: string; scheduledAt?: string; completedAt?: string };

export default function Report({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<{ broadcast: B; recipients: R[] } | null>(null);
  const [st, setSt] = useState("");
  const load = useCallback(() => api<NonNullable<typeof d>>(`/api/broadcasts/${id}?status=${st}`).then(setD), [id, st]);
  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, [load]);
  if (!d) return <div className="grid h-64 place-items-center text-emerald-600"><Spinner size={28} /></div>;
  const b = d.broadcast;
  const act = async (action: string) => { try { await api(`/api/broadcasts/${id}`, { method: "PATCH", json: { action } }); toast("Done"); load(); } catch (e) { toast((e as Error).message, "err"); } };
  const pct = (n: number) => (b.total ? `${Math.round((n / b.total) * 100)}%` : "0%");
  function csv() {
    const rows = [["phone", "name", "status", "sent", "delivered", "read", "replied", "error"], ...d!.recipients.map((r) => [r.phone, r.name || "", r.status, r.sentAt || "", r.deliveredAt || "", r.readAt || "", r.repliedAt || "", r.error || ""])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" }));
    a.download = `${b.name}-report.csv`;
    a.click();
  }
  return (
    <div>
      <Link href="/client/broadcasts" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-emerald-700"><I.ArrowLeft size={15} /> All broadcasts</Link>
      <PageHero title={b.name} subtitle={`Template ${b.templateName} · created ${fmtDate(b.createdAt)}${b.completedAt ? ` · completed ${fmtDate(b.completedAt)}` : ""}`} icon={<I.Send />}
        actions={<>
          <Badge tone={statusTone(b.status)}>{b.status}</Badge>
          {b.status === "RUNNING" && <button onClick={() => act("pause")} className="btn bg-white/15 text-white hover:bg-white/25"><I.Pause size={16} /> Pause</button>}
          {b.status === "PAUSED" && <button onClick={() => act("resume")} className="btn bg-white/15 text-white hover:bg-white/25"><I.Play size={16} /> Resume</button>}
          {["RUNNING", "PAUSED", "SCHEDULED"].includes(b.status) && <button onClick={() => confirm("Cancel remaining messages?") && act("cancel")} className="btn bg-white/15 text-white hover:bg-white/25"><I.XCircle size={16} /> Cancel</button>}
          {b.failed > 0 && b.status !== "RUNNING" && <button onClick={() => act("retryFailed")} className="btn bg-white/15 text-white hover:bg-white/25"><I.RotateCcw size={16} /> Retry failed</button>}
          <button onClick={csv} className="btn bg-white text-emerald-700"><I.Download size={16} /> CSV</button>
        </>} />
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Audience" value={b.total} icon={<I.Users />} tone="slate" />
        <Stat label="Sent" value={b.sent} hint={pct(b.sent)} icon={<I.Send />} />
        <Stat label="Delivered" value={b.delivered} hint={pct(b.delivered)} icon={<I.CheckCheck />} tone="blue" />
        <Stat label="Read" value={b.read} hint={pct(b.read)} icon={<I.Eye />} tone="violet" />
        <Stat label="Replied" value={b.replied} hint={pct(b.replied)} icon={<I.Reply />} tone="teal" />
        <Stat label="Failed" value={b.failed} hint={pct(b.failed)} icon={<I.AlertTriangle />} tone="rose" />
      </div>
      <div className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-4 py-3 text-xs">{["", "PENDING", "SENT", "DELIVERED", "READ", "REPLIED", "FAILED"].map((s) => <button key={s} onClick={() => setSt(s)} className={`rounded-full px-3 py-1 font-semibold ${st === s ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{s || "All"}</button>)}</div>
        <div className="max-h-[60vh] overflow-auto scroll-thin"><table className="w-full"><thead className="sticky top-0 bg-slate-50"><tr>{["Contact", "Status", "Sent", "Delivered", "Read", "Error"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{d.recipients.map((r) => <tr key={r.id}><td className="td"><div className="font-medium">{r.name || "—"}</div><div className="text-xs text-slate-500">+{r.phone}</div></td><td className="td"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td><td className="td text-xs">{fmtDate(r.sentAt)}</td><td className="td text-xs">{fmtDate(r.deliveredAt)}</td><td className="td text-xs">{fmtDate(r.readAt)}</td><td className="td max-w-xs text-xs text-rose-600">{r.error}</td></tr>)}</tbody></table></div>
      </div>
    </div>
  );
}
