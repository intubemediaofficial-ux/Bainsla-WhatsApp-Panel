"use client";
import { useCallback, useEffect, useState } from "react";
import * as I from "lucide-react";
import { api, Badge, Field, fmtDate, Modal, PageHero, Spinner, toast } from "@/components/ui";

type A = { id: string; name: string; email: string; role: string; active: boolean; lastLoginAt?: string; permissions: string[] };
const PERMS = ["inbox", "contacts", "broadcasts", "templates", "automation", "leads", "orders", "analytics"];

export default function Agents() {
  const [items, setItems] = useState<A[] | null>(null);
  const [f, setF] = useState<{ id?: string; name: string; email: string; password: string; permissions: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<{ items: A[] }>("/api/agents").then((j) => setItems(j.items)), []);
  useEffect(() => { load(); }, [load]);
  async function save() {
    if (!f) return;
    setBusy(true);
    try {
      if (f.id) await api(`/api/agents/${f.id}`, { method: "PATCH", json: { name: f.name, permissions: f.permissions, ...(f.password ? { password: f.password } : {}) } });
      else await api("/api/agents", { method: "POST", json: f });
      toast("Saved"); setF(null); load();
    } catch (e) { toast((e as Error).message, "err"); }
    setBusy(false);
  }
  return (
    <div>
      <PageHero title="Teams & Agents" subtitle="Give your team their own login to reply from the shared inbox" icon={<I.UsersRound />} actions={<button onClick={() => setF({ name: "", email: "", password: "", permissions: ["inbox", "contacts"] })} className="btn bg-white text-emerald-700"><I.UserPlus size={16} /> Add Agent</button>} />
      <div className="card overflow-hidden">{!items ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <table className="w-full"><thead className="bg-slate-50/70"><tr>{["Member", "Role", "Permissions", "Last login", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{items.map((a) => (
            <tr key={a.id}><td className="td"><div className="font-semibold">{a.name}</div><div className="text-xs text-slate-500">{a.email}</div></td><td className="td"><Badge tone={a.role === "OWNER" ? "violet" : "blue"}>{a.role}</Badge></td>
              <td className="td"><div className="flex flex-wrap gap-1">{a.role === "OWNER" ? <Badge tone="green">full access</Badge> : (a.permissions || []).map((p) => <Badge key={p}>{p}</Badge>)}</div></td>
              <td className="td text-xs">{fmtDate(a.lastLoginAt)}</td><td className="td"><Badge tone={a.active ? "green" : "red"}>{a.active ? "Active" : "Disabled"}</Badge></td>
              <td className="td whitespace-nowrap text-right">{a.role === "AGENT" && <>
                <button onClick={() => setF({ id: a.id, name: a.name, email: a.email, password: "", permissions: a.permissions || [] })} className="rounded-lg p-2 text-slate-400 hover:text-emerald-700"><I.Pencil size={15} /></button>
                <button onClick={async () => { await api(`/api/agents/${a.id}`, { method: "PATCH", json: { active: !a.active } }); load(); }} className="rounded-lg p-2 text-slate-400 hover:text-amber-600"><I.Power size={15} /></button>
                <button onClick={async () => { if (confirm("Remove agent?")) { await api(`/api/agents/${a.id}`, { method: "DELETE" }); load(); } }} className="rounded-lg p-2 text-slate-400 hover:text-rose-600"><I.Trash2 size={15} /></button></>}</td></tr>
          ))}</tbody></table>)}</div>
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? "Edit agent" : "Add agent"}>{f && (
        <div className="space-y-4">
          <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Email (login)"><input className="input" disabled={!!f.id} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label={f.id ? "New password (optional)" : "Password"}><input className="input" type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <div><div className="label">Permissions</div><div className="grid grid-cols-2 gap-2">{PERMS.map((p) => <label key={p} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={f.permissions.includes(p)} onChange={(e) => setF({ ...f, permissions: e.target.checked ? [...f.permissions, p] : f.permissions.filter((x) => x !== p) })} className="accent-emerald-600" />{p}</label>)}</div></div>
          <button onClick={save} disabled={busy} className="btn-primary w-full">{busy && <Spinner size={14} />} Save</button>
        </div>)}</Modal>
    </div>
  );
}
