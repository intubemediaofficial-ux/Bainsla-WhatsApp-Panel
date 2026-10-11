"use client";
import { useEffect, useState } from "react";
import * as I from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, PageHero, Spinner, Stat } from "@/components/ui";

type S = { contacts: number; newContacts: number; leads: number; orders: number; status: Record<string, number>; series: { day: string; sent: number; received: number }[]; tags: { name: string; value: number }[] };

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<S | null>(null);
  useEffect(() => { setS(null); api<S>(`/api/stats?days=${days}`).then(setS); }, [days]);
  const tot = s ? Object.values(s.status).reduce((a, b) => a + b, 0) : 0;
  const pct = (k: string) => (tot && s ? Math.round(((s.status[k] || 0) / tot) * 100) : 0);
  return (
    <div>
      <PageHero title="Analytics" subtitle="Messaging volume, delivery performance and audience growth" icon={<I.BarChart3 />}
        actions={<select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input w-auto bg-white">{[7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>Last {d} days</option>)}</select>} />
      {!s ? <div className="grid h-64 place-items-center text-emerald-600"><Spinner size={28} /></div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Messages sent" value={s.series.reduce((a, b) => a + b.sent, 0)} icon={<I.Send />} />
            <Stat label="Messages received" value={s.series.reduce((a, b) => a + b.received, 0)} icon={<I.Inbox />} tone="blue" />
            <Stat label="Read rate" value={`${pct("read")}%`} icon={<I.CheckCheck />} tone="violet" />
            <Stat label="New contacts" value={s.newContacts} icon={<I.UserPlus />} tone="amber" />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="card p-5"><h3 className="mb-4 font-semibold">Daily volume</h3><ResponsiveContainer width="100%" height={280}><BarChart data={s.series}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="sent" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="received" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            <div className="card p-5"><h3 className="mb-4 font-semibold">Conversation trend</h3><ResponsiveContainer width="100%" height={280}><LineChart data={s.series}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="received" stroke="#8b5cf6" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
          </div>
          <div className="card mt-5 p-5"><h3 className="mb-4 font-semibold">Delivery funnel</h3>
            <div className="space-y-3">{["sent", "delivered", "read", "failed"].map((k) => (
              <div key={k}><div className="mb-1 flex justify-between text-sm"><span className="capitalize">{k}</span><b>{s.status[k] || 0} · {pct(k)}%</b></div><div className="h-2.5 rounded-full bg-slate-100"><div className={`h-2.5 rounded-full ${k === "failed" ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${pct(k)}%` }} /></div></div>
            ))}</div>
          </div>
        </>
      )}
    </div>
  );
}
