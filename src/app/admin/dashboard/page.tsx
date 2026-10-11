"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import * as I from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api, Badge, fmtDate, inr, PageHero, Section, Spinner, Stat, statusTone } from "@/components/ui";

type S = { vendors: number; active: number; suspended: number; channels: number; contacts: number; msgsToday: number; pending: number; revenue: number; recent: { id: string; name: string; status: string; createdAt: string }[]; byPlan: { name: string; value: number }[] };
const COLORS = ["#059669", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6"];

export default function AdminDash() {
  const [s, setS] = useState<S | null>(null);
  useEffect(() => { api<S>("/api/admin/stats").then(setS); }, []);
  if (!s) return <div className="grid h-64 place-items-center text-emerald-600"><Spinner size={28} /></div>;
  return (
    <div>
      <PageHero title="Platform Overview" subtitle="All vendors, numbers, revenue and approvals at a glance" icon={<I.LayoutDashboard />} actions={<Link href="/admin/vendors" className="btn bg-white text-emerald-700"><I.Building2 size={16} /> Manage vendors</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Vendors" value={s.vendors} hint={`${s.active} active · ${s.suspended} suspended`} icon={<I.Building2 />} />
        <Stat label="WhatsApp numbers" value={s.channels} icon={<I.Phone />} tone="teal" />
        <Stat label="Contacts (all)" value={s.contacts.toLocaleString("en-IN")} icon={<I.Users />} tone="blue" />
        <Stat label="Messages today" value={s.msgsToday.toLocaleString("en-IN")} icon={<I.MessageCircle />} tone="violet" />
        <Stat label="Revenue this month" value={inr(s.revenue)} icon={<I.IndianRupee />} tone="amber" />
        <Link href="/admin/payments"><Stat label="Pending payments" value={s.pending} hint="Click to review" icon={<I.Clock />} tone={s.pending ? "rose" : "slate"} /></Link>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><Section title="Newest vendors">
          <div className="divide-y divide-slate-100">{s.recent.map((v) => <div key={v.id} className="flex items-center justify-between py-2.5 text-sm"><Link href={`/admin/vendors?q=${encodeURIComponent(v.name)}`} className="font-medium hover:text-emerald-700">{v.name}</Link><div className="flex items-center gap-3"><Badge tone={statusTone(v.status)}>{v.status}</Badge><span className="text-xs text-slate-400">{fmtDate(v.createdAt)}</span></div></div>)}</div>
        </Section></div>
        <Section title="Vendors by plan">
          <div className="h-56"><ResponsiveContainer><PieChart><Pie data={s.byPlan} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>{s.byPlan.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          <div className="flex flex-wrap gap-2 text-xs">{s.byPlan.map((p, i) => <span key={p.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{p.name} ({p.value})</span>)}</div>
        </Section>
      </div>
    </div>
  );
}
