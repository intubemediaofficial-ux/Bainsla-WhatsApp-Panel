"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as I from "lucide-react";
import { api, Badge, Field, fmtDate, Modal, PageHero, Spinner, statusTone, toast } from "@/components/ui";

type U = { id: string; name: string; email: string; phone?: string; role: string; active: boolean; lastLoginAt?: string; createdAt: string; workspace?: { id: string; name: string; status: string } | null };

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<U[] | null>(null);
  const [pw, setPw] = useState<{ user: U; password: string } | null>(null);
  const load = useCallback(() => api<{ items: U[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`).then((r) => setItems(r.items)), [q]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  const patch = async (id: string, b: object) => { try { await api(`/api/admin/users/${id}`, { method: "PATCH", json: b }); toast("Updated"); load(); } catch (e) { toast((e as Error).message, "err"); } };
  return (
    <div>
      <PageHero title="All Users" subtitle="Every owner, agent and admin across all vendors — reset passwords, enable or disable logins" icon={<I.Users />} />
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3"><div className="relative max-w-xs"><I.Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or phone" className="input py-1.5 pl-9" /></div></div>
        {!items ? <div className="flex justify-center py-10"><Spinner /></div> : items.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No users found</div> : (
          <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50/70"><tr>{["User", "Role", "Vendor", "Last login", "Joined", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{items.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <td className="td"><div className="font-semibold">{u.name}</div><div className="text-xs text-slate-500">{u.email}</div>{u.phone && <div className="text-xs text-slate-400">{u.phone}</div>}</td>
                <td className="td"><Badge tone={u.role === "SUPER_ADMIN" ? "violet" : u.role === "OWNER" ? "emerald" : "slate"}>{u.role}</Badge></td>
                <td className="td">{u.workspace ? <Link href={`/admin/vendors/${u.workspace.id}`} className="hover:text-emerald-700 hover:underline">{u.workspace.name}</Link> : "—"}{u.workspace && u.workspace.status !== "ACTIVE" && <span className="ml-2"><Badge tone={statusTone(u.workspace.status)}>{u.workspace.status}</Badge></span>}</td>
                <td className="td text-xs">{fmtDate(u.lastLoginAt)}</td>
                <td className="td text-xs">{fmtDate(u.createdAt)}</td>
                <td className="td"><Badge tone={u.active ? "emerald" : "rose"}>{u.active ? "ACTIVE" : "DISABLED"}</Badge></td>
                <td className="td whitespace-nowrap text-right">
                  <button onClick={() => setPw({ user: u, password: "" })} title="Reset password" className="rounded-lg p-2 text-slate-400 hover:text-emerald-700"><I.KeyRound size={15} /></button>
                  {u.role !== "SUPER_ADMIN" && <button onClick={() => patch(u.id, { active: !u.active })} title={u.active ? "Disable" : "Enable"} className="rounded-lg p-2 text-slate-400 hover:text-amber-600"><I.Power size={15} /></button>}
                </td>
              </tr>))}</tbody></table></div>
        )}
      </div>
      <Modal open={!!pw} onClose={() => setPw(null)} title={`Reset password — ${pw?.user.email || ""}`}>{pw && (
        <div className="space-y-4">
          <Field label="New password (min 8 characters)"><input className="input" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></Field>
          <div className="flex justify-end"><button disabled={pw.password.length < 8} onClick={async () => { await patch(pw.user.id, { password: pw.password }); setPw(null); }} className="btn-primary">Save password</button></div>
        </div>)}</Modal>
    </div>
  );
}
