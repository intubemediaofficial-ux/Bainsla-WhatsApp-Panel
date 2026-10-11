"use client";
import { useEffect, useState } from "react";
import * as I from "lucide-react";
import { Field, PageHero, Spinner } from "@/components/ui";
import { useWorkspace } from "@/components/useWorkspace";

type BH = { enabled: boolean; start: string; end: string; days: number[] };
type S = { defaultCountryCode?: string; welcomeMessage?: string; awayMessage?: string; businessHours?: BH; optOutReply?: string; optInReply?: string; birthdayMessage?: string; anniversaryMessage?: string; dailySummaryTo?: string; roundRobin?: boolean };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Settings() {
  const { ws, save } = useWorkspace();
  const [b, setB] = useState({ name: "", brandName: "", logoUrl: "", primaryColor: "#059669" });
  const [s, setS] = useState<S>({});
  useEffect(() => { if (ws) { setB({ name: ws.name, brandName: ws.brandName || "", logoUrl: ws.logoUrl || "", primaryColor: ws.primaryColor || "#059669" }); setS(ws.settings as S); } }, [ws]);
  if (!ws) return <div className="grid h-64 place-items-center text-emerald-600"><Spinner size={28} /></div>;
  const owner = ws.role !== "AGENT";
  const bh: BH = { enabled: false, start: "09:00", end: "19:00", days: [1, 2, 3, 4, 5, 6], ...(s.businessHours || {}) };
  const setBh = (v: Partial<BH>) => setS({ ...s, businessHours: { ...bh, ...v } });
  return (
    <div>
      <PageHero title="Business Settings" subtitle="Branding, auto-replies, business hours and opt-out messages" icon={<I.Settings />} actions={owner && <button onClick={() => save({ ...b, settings: s as Record<string, unknown> })} className="btn bg-white text-emerald-700"><I.Save size={16} /> Save all</button>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card space-y-4 p-5"><h3 className="flex items-center gap-2 font-semibold"><I.Palette size={18} className="text-emerald-600" /> Branding (white-label)</h3>
          <Field label="Business name"><input className="input" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></Field>
          <Field label="Panel brand name"><input className="input" value={b.brandName} onChange={(e) => setB({ ...b, brandName: e.target.value })} placeholder="Shown in sidebar" /></Field>
          <Field label="Logo URL"><input className="input" value={b.logoUrl} onChange={(e) => setB({ ...b, logoUrl: e.target.value })} /></Field>
          <Field label="Default country code"><input className="input" value={s.defaultCountryCode || "91"} onChange={(e) => setS({ ...s, defaultCountryCode: e.target.value.replace(/\D/g, "") })} /></Field>
        </div>
        <div className="card space-y-4 p-5"><h3 className="flex items-center gap-2 font-semibold"><I.Clock size={18} className="text-emerald-600" /> Business hours & away message</h3>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={bh.enabled} onChange={(e) => setBh({ enabled: e.target.checked })} className="h-4 w-4 accent-emerald-600" /> Enable business hours (away message outside hours)</label>
          <div className="flex gap-3"><Field label="Opens"><input type="time" className="input" value={bh.start} onChange={(e) => setBh({ start: e.target.value })} /></Field><Field label="Closes"><input type="time" className="input" value={bh.end} onChange={(e) => setBh({ end: e.target.value })} /></Field></div>
          <div className="flex flex-wrap gap-1">{DAYS.map((d, i) => { const on = bh.days.includes(i); return <button key={d} onClick={() => setBh({ days: on ? bh.days.filter((x) => x !== i) : [...bh.days, i] })} className={`rounded-lg px-3 py-1 text-xs font-semibold ${on ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>{d}</button>; })}</div>
          <textarea className="input min-h-[70px]" value={s.awayMessage || ""} onChange={(e) => setS({ ...s, awayMessage: e.target.value })} placeholder="Thanks for messaging! We're closed now and will reply at 9 AM." />
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={!!s.roundRobin} onChange={(e) => setS({ ...s, roundRobin: e.target.checked })} className="h-4 w-4 accent-emerald-600" /> Auto-assign new chats to agents (round robin)</label>
        </div>
        <div className="card space-y-4 p-5"><h3 className="flex items-center gap-2 font-semibold"><I.Hand size={18} className="text-emerald-600" /> Welcome message</h3>
          <div className="text-xs text-slate-500">Sent to first-time contacts. Leave empty to disable.</div>
          <textarea className="input min-h-[70px]" value={s.welcomeMessage || ""} onChange={(e) => setS({ ...s, welcomeMessage: e.target.value })} placeholder="Hi {{name}}! Welcome to …" />
          <h3 className="flex items-center gap-2 pt-2 font-semibold"><I.Cake size={18} className="text-emerald-600" /> Birthday & anniversary wishes</h3>
          <textarea className="input min-h-[60px]" value={s.birthdayMessage || ""} onChange={(e) => setS({ ...s, birthdayMessage: e.target.value })} placeholder="Happy birthday {{name}}! 🎂 (leave empty to disable)" />
          <textarea className="input min-h-[60px]" value={s.anniversaryMessage || ""} onChange={(e) => setS({ ...s, anniversaryMessage: e.target.value })} placeholder="Happy anniversary {{name}}! 💐" />
        </div>
        <div className="card space-y-4 p-5"><h3 className="flex items-center gap-2 font-semibold"><I.BellOff size={18} className="text-emerald-600" /> Opt-out (STOP / START)</h3>
          <Field label="Reply on STOP"><textarea className="input min-h-[60px]" value={s.optOutReply || ""} onChange={(e) => setS({ ...s, optOutReply: e.target.value })} /></Field>
          <Field label="Reply on START"><textarea className="input min-h-[60px]" value={s.optInReply || ""} onChange={(e) => setS({ ...s, optInReply: e.target.value })} placeholder="You're subscribed again ✅" /></Field>
          <Field label="Daily summary to WhatsApp number" help="Gets a daily report of chats, contacts & orders at 9 PM"><input className="input" value={s.dailySummaryTo || ""} onChange={(e) => setS({ ...s, dailySummaryTo: e.target.value })} placeholder="919876543210" /></Field>
        </div>
      </div>
    </div>
  );
}
