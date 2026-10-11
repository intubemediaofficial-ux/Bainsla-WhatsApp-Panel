"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as I from "lucide-react";
import { api, Badge, Field, fmtDate, inr, Modal, PageHero, Spinner, statusTone, toast } from "@/components/ui";

type V = { id: string; name: string; status: string; wallet: string | number; planExpiresAt?: string; createdAt: string; plan?: { name: string } | null; users: { name: string; email: string; phone?: string }[]; _count: { contacts: number; channels: number } };
type P = { id: string; name: string; price: number };

function Vendors() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const [d, setD] = useState<{ items: V[]; plans: P[] } | null>(null);
  const [edit, setEdit] = useState<V | null>(null);
  const [add, setAdd] = useState<{ business: string; name: string; email: string; phone: string; password: string; planId: string } | null>(null);
  const [f, setF] = useState({ planId: "", extendDays: 0, walletAdjust: 0, note: "" });
  const load = useCallback(() => api<NonNullable<typeof d>>(`/api/admin/vendors?q=${encodeURIComponent(q)}`).then(setD), [q]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  async function patch(id: string, b: object) { try { await api(`/api/admin/vendors/${id}`, { method: "PATCH", json: b }); toast("Updated"); load(); } catch (e) { toast((e as Error).message, "err"); } }
  async function login(id: string) { await api("/api/admin/impersonate", { method: "POST", json: { workspaceId: id } }); window.location.href = "/client/dashboard"; }
  return (
    <div>
      <PageHero title="Vendors" subtitle="Every business using your panel — plans, wallet, status and login-as" icon={<I.Building2 />} actions={<button onClick={() => setAdd({ business: "", name: "", email: "", phone: "", password: "", planId: "" })} className="btn bg-white text-emerald-700"><I.Plus size={16} /> Add Vendor</button>} />
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3"><div className="relative max-w-xs"><I.Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Business or owner email" className="input py-1.5 pl-9" /></div></div>
        {!d ? <div className="flex justify-center py-10"><Spinner /></div> : (
          <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50/70"><tr>{["Business", "Owner", "Plan", "Expires", "Wallet", "Numbers", "Contacts", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{d.items.map((v) => { const o = v.users[0]; const exp = v.planExpiresAt && new Date(v.planExpiresAt) < new Date(); return (
              <tr key={v.id} className="hover:bg-slate-50/60"><td className="td"><div className="font-semibold">{v.name}</div><div className="text-[11px] text-slate-400">since {fmtDate(v.createdAt)}</div></td>
                <td className="td text-xs"><div>{o?.name}</div><div className="text-slate-500">{o?.email}</div>{o?.phone && <div className="text-slate-400">{o.phone}</div>}</td>
                <td className="td">{v.plan?.name || "—"}</td><td className={`td text-xs ${exp ? "text-rose-600" : ""}`}>{fmtDate(v.planExpiresAt)}</td><td className="td">{inr(Number(v.wallet))}</td><td className="td">{v._count.channels}</td><td className="td">{v._count.contacts}</td><td className="td"><Badge tone={statusTone(v.status)}>{v.status}</Badge></td>
                <td className="td whitespace-nowrap text-right">
                  <button onClick={() => login(v.id)} title="Login as vendor" className="rounded-lg p-2 text-slate-400 hover:text-emerald-700"><I.LogIn size={15} /></button>
                  <button onClick={() => { setEdit(v); setF({ planId: "", extendDays: 0, walletAdjust: 0, note: "" }); }} className="rounded-lg p-2 text-slate-400 hover:text-emerald-700"><I.Settings2 size={15} /></button>
                  <button onClick={() => patch(v.id, { status: v.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })} title={v.status === "ACTIVE" ? "Suspend" : "Activate"} className="rounded-lg p-2 text-slate-400 hover:text-amber-600"><I.Power size={15} /></button>
                </td></tr>); })}</tbody></table></div>
        )}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Manage ${edit?.name || ""}`}>{edit && d && (
        <div className="space-y-4">
          <Field label="Change plan (resets expiry)"><select className="input" value={f.planId} onChange={(e) => setF({ ...f, planId: e.target.value })}><option value="">— keep {edit.plan?.name || "none"} —</option>{d.plans.map((p) => <option key={p.id} value={p.id}>{p.name} ({inr(p.price)})</option>)}</select></Field>
          <Field label="Extend validity by days"><input type="number" className="input" value={f.extendDays} onChange={(e) => setF({ ...f, extendDays: Number(e.target.value) })} /></Field>
          <Field label="Wallet adjustment (₹, negative to debit)"><input type="number" className="input" value={f.walletAdjust} onChange={(e) => setF({ ...f, walletAdjust: Number(e.target.value) })} /></Field>
          <Field label="Note"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <div className="flex justify-between gap-2">
            <button onClick={async () => { if (confirm("Archive vendor? Data is kept, logins disabled.")) { await api(`/api/admin/vendors/${edit.id}`, { method: "DELETE" }); setEdit(null); load(); } }} className="btn-ghost text-rose-600">Archive</button>
            <button onClick={async () => { await patch(edit.id, { ...(f.planId ? { planId: f.planId } : {}), ...(f.extendDays ? { extendDays: f.extendDays } : {}), ...(f.walletAdjust ? { walletAdjust: f.walletAdjust, note: f.note } : {}) }); setEdit(null); }} className="btn-primary">Apply</button>
          </div>
        </div>)}</Modal>
      <Modal open={!!add} onClose={() => setAdd(null)} title="Add vendor">{add && d && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(["business", "name", "email", "phone", "password"] as const).map((k) => <Field key={k} label={k === "business" ? "Business name" : k === "name" ? "Owner name" : k[0].toUpperCase() + k.slice(1)}><input className="input" value={add[k]} onChange={(e) => setAdd({ ...add, [k]: e.target.value })} /></Field>)}
          <Field label="Plan"><select className="input" value={add.planId} onChange={(e) => setAdd({ ...add, planId: e.target.value })}><option value="">Default</option>{d.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <div className="flex justify-end sm:col-span-2"><button onClick={async () => { try { await api("/api/admin/vendors", { method: "POST", json: add }); toast("Vendor created"); setAdd(null); load(); } catch (e) { toast((e as Error).message, "err"); } }} className="btn-primary">Create</button></div>
        </div>)}</Modal>
    </div>
  );
}

export default function Page() {
  return <Suspense><Vendors /></Suspense>;
}
