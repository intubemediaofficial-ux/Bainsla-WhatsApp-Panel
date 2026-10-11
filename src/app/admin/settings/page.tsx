"use client";
import { useEffect, useState } from "react";
import * as I from "lucide-react";
import { api, Field, PageHero, Spinner, toast } from "@/components/ui";

type All = Record<"branding" | "pricing" | "payment" | "ai", Record<string, string | number | boolean>>;
const LABELS: Record<string, string> = { appName: "Panel name", tagline: "Tagline", logoUrl: "Logo URL", primaryColor: "Brand colour", supportPhone: "Support phone", supportEmail: "Support email", marketing: "Marketing msg (₹)", utility: "Utility msg (₹)", authentication: "Auth msg (₹)", service: "Service msg (₹)", enabled: "Deduct from wallet per message", upiId: "UPI ID", payeeName: "Payee name", qrUrl: "UPI QR image URL", instructions: "Instructions", gstPercent: "GST %", provider: "Provider", apiKey: "API key", model: "Model", baseUrl: "Base URL" };
const SECTIONS: [keyof All, string, keyof typeof I][] = [["branding", "White-label branding", "Palette"], ["payment", "Payment (UPI)", "IndianRupee"], ["pricing", "Per-message pricing", "Receipt"], ["ai", "Platform AI key", "Sparkles"]];

export default function AdminSettings() {
  const [d, setD] = useState<All | null>(null);
  useEffect(() => { api<All>("/api/admin/settings").then(setD); }, []);
  if (!d) return <div className="grid h-64 place-items-center"><Spinner /></div>;
  const save = async (key: keyof All) => { try { await api("/api/admin/settings", { method: "PATCH", json: { key, value: d[key] } }); toast("Saved"); } catch (e) { toast((e as Error).message, "err"); } };
  return (
    <div>
      <PageHero title="Platform Settings" subtitle="Branding, payments, pricing and AI for the whole panel" icon={<I.Settings />} />
      <div className="grid gap-5 lg:grid-cols-2">{SECTIONS.map(([k, t, ic]) => { const Ic = I[ic] as React.ComponentType<{ size?: number; className?: string }>; return (
        <div key={k} className="card space-y-4 p-5"><h3 className="flex items-center gap-2 font-semibold"><Ic size={18} className="text-emerald-600" /> {t}</h3>
          {Object.entries(d[k]).map(([f, v]) => <Field key={f} label={LABELS[f] || f}>{typeof v === "boolean" ? <input type="checkbox" checked={v} onChange={(e) => setD({ ...d, [k]: { ...d[k], [f]: e.target.checked } })} className="h-4 w-4 accent-emerald-600" /> : f === "primaryColor" ? <input type="color" className="input h-10 w-20 p-1" value={String(v)} onChange={(e) => setD({ ...d, [k]: { ...d[k], [f]: e.target.value } })} /> : f === "instructions" ? <textarea className="input" value={String(v)} onChange={(e) => setD({ ...d, [k]: { ...d[k], [f]: e.target.value } })} /> : <input className="input" type={typeof v === "number" ? "number" : "text"} step="any" value={String(v)} onChange={(e) => setD({ ...d, [k]: { ...d[k], [f]: e.target.value } })} />}</Field>)}
          <button onClick={() => save(k)} className="btn-primary">Save {t.toLowerCase()}</button>
        </div>); })}</div>
    </div>
  );
}
