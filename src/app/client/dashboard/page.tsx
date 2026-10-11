"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import * as I from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, Badge, PageHero, Section, Stat, statusTone, Spinner } from "@/components/ui";

type S = { contacts: number; newContacts: number; open: number; unread: number; sentToday: number; recvToday: number; broadcasts: number; flows: number; leads: number; orders: number; appts: number; status: Record<string, number>; series: { day: string; sent: number; received: number }[]; tags: { name: string; value: number }[]; recentBroadcasts: { id: string; name: string; status: string; total: number; sent: number; read: number; failed: number }[] };
type W = { name: string; plan?: { name: string } | null; planExpiresAt?: string; settings?: Record<string, unknown> };
const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6", "#ec4899", "#64748b"];

function useAnnouncements() {
  const [a, setA] = useState<{ id: string; title: string; body: string; level: string }[]>([]);
  useEffect(() => { api<{ items: typeof a }>("/api/announcements").then((j) => setA(j.items)).catch(() => {}); }, []);
  return a;
}

export default function Dashboard() {
  const [s, setS] = useState<S | null>(null);
  const [w, setW] = useState<W | null>(null);
  const ann = useAnnouncements();
  useEffect(() => { api<S>("/api/stats").then(setS); api<W>("/api/workspace").then(setW); }, []);
  if (!s) return <div className="grid h-64 place-items-center text-emerald-600"><Spinner size={28} /></div>;
  const delivered = (s.status.delivered || 0) + (s.status.read || 0);
  const sent = Object.values(s.status).reduce((a, b) => a + b, 0);
  const days = w?.planExpiresAt ? Math.ceil((new Date(w.planExpiresAt).getTime() - Date.now()) / 86400000) : null;
  return (
    <div>
      {ann.map((a) => (
        <div key={a.id} className={`mb-3 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${a.level === "warning" ? "bg-amber-50 text-amber-800" : a.level === "success" ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800"}`}>
          <I.Megaphone size={18} className="mt-0.5 shrink-0" /><div><b>{a.title}</b> — {a.body}</div>
        </div>
      ))}
      <PageHero title={`Welcome back${w ? `, ${w.name}` : ""}`} subtitle="Here's what's happening on your WhatsApp today" icon={<I.LayoutDashboard />}
        actions={<><Link href="/client/broadcasts?new=1" className="btn bg-white text-emerald-700 hover:bg-emerald-50"><I.Send size={16} /> New Broadcast</Link><Link href="/client/chat" className="btn bg-white/15 text-white hover:bg-white/25"><I.MessageCircle size={16} /> Open Inbox</Link></>} />
      {days !== null && days <= 5 && (
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700"><span><b>{w?.plan?.name}</b> plan {days <= 0 ? "has expired" : `expires in ${days} day${days > 1 ? "s" : ""}`}.</span><Link href="/client/subscriptions" className="btn-danger py-1.5">Renew now</Link></div>
      )}
      <Section title="Messaging" icon={<I.MessageCircle size={16} />}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Open Chats" value={s.open} icon={<I.MessagesSquare />} href="/client/chat" />
          <Stat label="Unread" value={s.unread} icon={<I.BellDot />} tone="rose" href="/client/chat?filter=unread" />
          <Stat label="Sent Today" value={s.sentToday} icon={<I.Send />} tone="blue" />
          <Stat label="Received Today" value={s.recvToday} icon={<I.Inbox />} tone="violet" />
        </div>
      </Section>
      <Section title="Growth" icon={<I.TrendingUp size={16} />}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total Contacts" value={s.contacts.toLocaleString("en-IN")} hint={`+${s.newContacts} in 14 days`} icon={<I.Users />} tone="teal" href="/client/contacts" />
          <Stat label="Leads" value={s.leads} icon={<I.Target />} tone="amber" href="/client/leads" />
          <Stat label="Orders" value={s.orders} icon={<I.ShoppingBag />} tone="emerald" href="/client/orders" />
          <Stat label="Upcoming Appointments" value={s.appts} icon={<I.CalendarDays />} tone="blue" href="/client/appointments" />
        </div>
      </Section>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Messages — last 14 days</h3><Link href="/client/analytics" className="text-sm font-medium text-emerald-700">Analytics →</Link></div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={s.series}>
              <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity={0.35} /><stop offset="1" stopColor="#10b981" stopOpacity={0} /></linearGradient><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="1" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="day" fontSize={11} stroke="#94a3b8" /><YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} /><Tooltip />
              <Area type="monotone" dataKey="sent" stroke="#10b981" fill="url(#g1)" strokeWidth={2} /><Area type="monotone" dataKey="received" stroke="#3b82f6" fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="mb-2 font-semibold">Delivery rate</h3>
          <div className="text-4xl font-extrabold text-emerald-600">{sent ? Math.round((delivered / sent) * 100) : 0}%</div>
          <div className="mt-1 text-xs text-slate-400">{delivered} of {sent} outgoing delivered</div>
          <div className="mt-5 space-y-2">{["sent", "delivered", "read", "failed"].map((k) => (
            <div key={k} className="flex items-center justify-between text-sm"><Badge tone={statusTone(k)}>{k}</Badge><b>{s.status[k] || 0}</b></div>
          ))}</div>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Recent broadcasts</h3><Link href="/client/broadcasts" className="text-sm font-medium text-emerald-700">All →</Link></div>
          {s.recentBroadcasts.length ? (
            <table className="w-full"><thead><tr><th className="th">Name</th><th className="th">Status</th><th className="th">Sent</th><th className="th">Read</th><th className="th">Failed</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{s.recentBroadcasts.map((b) => <tr key={b.id}><td className="td"><Link href={`/client/broadcasts/${b.id}`} className="font-medium text-emerald-700">{b.name}</Link></td><td className="td"><Badge tone={statusTone(b.status)}>{b.status}</Badge></td><td className="td">{b.sent}/{b.total}</td><td className="td">{b.read}</td><td className="td">{b.failed}</td></tr>)}</tbody></table>
          ) : <p className="py-8 text-center text-sm text-slate-400">No broadcasts yet</p>}
        </div>
        <div className="card p-5">
          <h3 className="mb-2 font-semibold">Top labels</h3>
          {s.tags.length ? (
            <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={s.tags} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{s.tags.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
          ) : <p className="py-8 text-center text-sm text-slate-400">Add labels to contacts to see this</p>}
        </div>
      </div>
      <Section title="Quick start" icon={<I.Rocket size={16} />}>
        <div className="mt-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[["Connect WhatsApp number", "/client/whatsapp", "Plug"], ["Import contacts (CSV)", "/client/contacts?import=1", "Upload"], ["Create a template", "/client/templates?new=1", "FileText"], ["Build a chatbot", "/client/bot-flows", "Workflow"]].map(([t, h, ic]) => {
            const C = I[ic as keyof typeof I] as React.ComponentType<{ size?: number }>;
            return <Link key={t} href={h} className="card flex items-center gap-3 p-4 font-medium hover:border-emerald-300"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><C size={18} /></span>{t}<I.ChevronRight size={16} className="ml-auto text-slate-300" /></Link>;
          })}
        </div>
      </Section>
    </div>
  );
}
