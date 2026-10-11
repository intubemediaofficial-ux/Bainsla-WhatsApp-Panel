"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as I from "lucide-react";
import { api, Badge, Field, fmtDate, inr, Modal, PageHero, Section, Spinner, Stat, statusTone, toast } from "@/components/ui";

type U = { id: string; name: string; email: string; phone?: string; role: string; active: boolean; lastLoginAt?: string };
type D = {
  id: string; name: string; slug: string; status: string; wallet: string; planExpiresAt?: string; createdAt: string; aiEnabled: boolean; webhookUrl?: string;
  plan?: { id: string; name: string; price: number } | null;
  users: U[];
  channels: { id: string; name: string; displayPhone?: string; verifiedName?: string; quality?: string; status: string; isDefault: boolean }[];
  txns: { id: string; amount: string; type: string; description?: string; createdAt: string }[];
  payments: { id: string; purpose: string; amount: number; utr?: string; status: string; createdAt: string }[];
  invoices: { id: string; number: string; amount: number; status: string; createdAt: string }[];
  logs: { id: string; userName?: string; action: string; detail?: string; createdAt: string }[];
  usage: Record<"contacts" | "conversations" | "messages" | "messagesMonth" | "broadcasts" | "templates" | "botFlows", number>;
};

function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <div className="px-4 py-6 text-center text-sm text-slate-400">{empty}</div>;
  return (
    <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50/70"><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="td">{c}</td>)}</tr>)}</tbody></table></div>
  );
}

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<D | null>(null);
  const [pw, setPw] = useState<{ user: U; password: string } | null>(null);
  const load = useCallback(() => api<D>(`/api/admin/vendors/${id}`).then(setD).catch((e) => toast((e as Error).message, "err")), [id]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <div className="grid h-64 place-items-center"><Spinner /></div>;
  const patch = async (b: object) => { try { await api(`/api/admin/vendors/${id}`, { method: "PATCH", json: b }); toast("Updated"); load(); } catch (e) { toast((e as Error).message, "err"); } };
  const patchUser = async (uid: string, b: object) => { try { await api(`/api/admin/users/${uid}`, { method: "PATCH", json: b }); toast("Updated"); load(); } catch (e) { toast((e as Error).message, "err"); } };
  const loginAs = async () => { await api("/api/admin/impersonate", { method: "POST", json: { workspaceId: id } }); window.location.href = "/client/dashboard"; };
  const expired = d.planExpiresAt && new Date(d.planExpiresAt) < new Date();
  return (
    <div className="space-y-6">
      <PageHero title={d.name} subtitle={`Vendor since ${fmtDate(d.createdAt)} · ${d.slug}`} icon={<I.Building2 />} actions={<div className="flex flex-wrap gap-2">
        <Link href="/admin/vendors" className="btn bg-white/15 text-white hover:bg-white/25"><I.ArrowLeft size={16} /> Back</Link>
        <button onClick={loginAs} className="btn bg-white text-emerald-700"><I.LogIn size={16} /> Login as vendor</button>
        {d.status !== "DELETED" && <button onClick={() => patch({ status: d.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })} className="btn bg-white/15 text-white hover:bg-white/25"><I.Power size={16} /> {d.status === "ACTIVE" ? "Suspend" : "Activate"}</button>}
      </div>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Status" value={<Badge tone={statusTone(d.status)}>{d.status}</Badge>} icon={<I.ShieldCheck />} />
        <Stat label="Plan" value={d.plan?.name || "—"} hint={d.planExpiresAt ? `${expired ? "Expired" : "Expires"} ${fmtDate(d.planExpiresAt)}` : "No expiry"} icon={<I.Layers />} tone="sky" />
        <Stat label="Wallet" value={inr(Number(d.wallet))} icon={<I.Wallet />} tone="amber" />
        <Stat label="Messages this month" value={d.usage.messagesMonth.toLocaleString("en-IN")} hint={`${d.usage.messages.toLocaleString("en-IN")} total`} icon={<I.MessageCircle />} tone="violet" />
        <Stat label="Contacts" value={d.usage.contacts.toLocaleString("en-IN")} icon={<I.Users />} />
        <Stat label="Conversations" value={d.usage.conversations.toLocaleString("en-IN")} icon={<I.MessagesSquare />} tone="sky" />
        <Stat label="Broadcasts" value={d.usage.broadcasts} icon={<I.Megaphone />} tone="amber" />
        <Stat label="Templates / Bot flows" value={`${d.usage.templates} / ${d.usage.botFlows}`} icon={<I.Workflow />} tone="violet" />
      </div>
      <Section title="Users & agents" icon={<I.Users size={18} />}>
        <div className="card overflow-hidden"><Table empty="No users" head={["Name", "Email", "Role", "Last login", "Status", ""]} rows={d.users.map((u) => [
          <span key="n" className="font-medium">{u.name}</span>, u.email, <Badge key="r">{u.role}</Badge>, fmtDate(u.lastLoginAt), <Badge key="s" tone={u.active ? "emerald" : "rose"}>{u.active ? "ACTIVE" : "DISABLED"}</Badge>,
          <div key="a" className="flex justify-end gap-1 whitespace-nowrap">
            <button onClick={() => setPw({ user: u, password: "" })} title="Reset password" className="rounded-lg p-2 text-slate-400 hover:text-emerald-700"><I.KeyRound size={15} /></button>
            <button onClick={() => patchUser(u.id, { active: !u.active })} title={u.active ? "Disable" : "Enable"} className="rounded-lg p-2 text-slate-400 hover:text-amber-600"><I.Power size={15} /></button>
          </div>,
        ])} /></div>
      </Section>
      <Section title="WhatsApp numbers" icon={<I.Phone size={18} />}>
        <div className="card overflow-hidden"><Table empty="No WhatsApp number connected yet" head={["Name", "Number", "Verified name", "Quality", "Status"]} rows={d.channels.map((c) => [
          <span key="n" className="font-medium">{c.name}{c.isDefault && <span className="ml-2 text-[10px] font-semibold uppercase text-emerald-600">default</span>}</span>, c.displayPhone || "—", c.verifiedName || "—", c.quality || "—", <Badge key="s" tone={statusTone(c.status)}>{c.status}</Badge>,
        ])} /></div>
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Payment requests" icon={<I.IndianRupee size={18} />}>
          <div className="card overflow-hidden"><Table empty="No payments" head={["Date", "Purpose", "Amount", "UTR", "Status"]} rows={d.payments.map((p) => [fmtDate(p.createdAt), p.purpose, inr(p.amount), p.utr || "—", <Badge key="s" tone={statusTone(p.status)}>{p.status}</Badge>])} /></div>
        </Section>
        <Section title="Wallet transactions" icon={<I.Wallet size={18} />}>
          <div className="card overflow-hidden"><Table empty="No transactions" head={["Date", "Type", "Amount", "Note"]} rows={d.txns.map((t) => [fmtDate(t.createdAt), <Badge key="t" tone={t.type === "CREDIT" ? "emerald" : "rose"}>{t.type}</Badge>, inr(Number(t.amount)), t.description || "—"])} /></div>
        </Section>
        <Section title="Invoices" icon={<I.FileText size={18} />}>
          <div className="card overflow-hidden"><Table empty="No invoices" head={["Invoice #", "Date", "Amount", "Status"]} rows={d.invoices.map((v) => [v.number, fmtDate(v.createdAt), inr(v.amount), <Badge key="s" tone={statusTone(v.status)}>{v.status}</Badge>])} /></div>
        </Section>
        <Section title="Recent activity" icon={<I.ScrollText size={18} />}>
          <div className="card overflow-hidden"><Table empty="No activity yet" head={["Time", "User", "Action", "Detail"]} rows={d.logs.map((l) => [fmtDate(l.createdAt), l.userName || "—", l.action, <span key="d" className="line-clamp-2 text-xs text-slate-500">{l.detail}</span>])} /></div>
        </Section>
      </div>
      <Modal open={!!pw} onClose={() => setPw(null)} title={`Reset password — ${pw?.user.email || ""}`}>{pw && (
        <div className="space-y-4">
          <Field label="New password (min 8 characters)"><input className="input" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></Field>
          <div className="flex justify-end"><button disabled={pw.password.length < 8} onClick={async () => { await patchUser(pw.user.id, { password: pw.password }); setPw(null); }} className="btn-primary">Save password</button></div>
        </div>)}</Modal>
    </div>
  );
}
