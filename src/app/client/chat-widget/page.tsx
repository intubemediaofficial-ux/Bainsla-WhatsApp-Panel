"use client";
import { useEffect, useState } from "react";
import * as I from "lucide-react";
import { Field, PageHero, Spinner, toast } from "@/components/ui";
import { useWorkspace } from "@/components/useWorkspace";

type W = { phone?: string; greeting?: string; color?: string; position?: string; cta?: string };

export default function Widget() {
  const { ws, save } = useWorkspace();
  const [w, setW] = useState<W>({});
  useEffect(() => { if (ws) setW((ws.settings.widget as W) || { color: "#25D366", greeting: "Hi! How can we help you?", cta: "Chat on WhatsApp", position: "right" }); }, [ws]);
  if (!ws) return <div className="grid h-64 place-items-center"><Spinner /></div>;
  const code = `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js?w=${ws.id}" async></script>`;
  return (
    <div>
      <PageHero title="Website Chat Widget" subtitle="Add a WhatsApp chat button to any website — leads land straight in your inbox" icon={<I.MessageSquareCode />} actions={<button onClick={() => save({ settings: { widget: w } })} className="btn bg-white text-emerald-700"><I.Save size={16} /> Save</button>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card space-y-4 p-5">
          <Field label="WhatsApp number"><input className="input" value={w.phone || ""} onChange={(e) => setW({ ...w, phone: e.target.value })} placeholder="919876543210" /></Field>
          <Field label="Greeting"><textarea className="input" value={w.greeting || ""} onChange={(e) => setW({ ...w, greeting: e.target.value })} /></Field>
          <Field label="Button text"><input className="input" value={w.cta || ""} onChange={(e) => setW({ ...w, cta: e.target.value })} /></Field>
          <div className="flex gap-4"><Field label="Colour"><input type="color" className="input h-10 w-20 p-1" value={w.color || "#25D366"} onChange={(e) => setW({ ...w, color: e.target.value })} /></Field><Field label="Position"><select className="input" value={w.position || "right"} onChange={(e) => setW({ ...w, position: e.target.value })}><option value="right">Bottom right</option><option value="left">Bottom left</option></select></Field></div>
          <div><div className="label">Embed code (paste before &lt;/body&gt;)</div><pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-emerald-200">{code}</pre><button onClick={() => { navigator.clipboard.writeText(code); toast("Copied"); }} className="btn-ghost mt-2 py-1 text-xs"><I.Copy size={14} /> Copy</button></div>
        </div>
        <div className="card relative min-h-[420px] overflow-hidden bg-slate-50 p-5"><div className="label">Live preview</div>
          <div className={`absolute bottom-5 ${w.position === "left" ? "left-5" : "right-5"} w-72`}>
            <div className="mb-3 overflow-hidden rounded-2xl bg-white shadow-xl"><div className="px-4 py-3 font-semibold text-white" style={{ background: w.color }}>{ws.brandName || ws.name}</div><div className="chat-bg p-4"><div className="w-fit max-w-[85%] rounded-lg bg-white px-3 py-2 text-sm shadow-sm">{w.greeting}</div></div><div className="py-3 text-center font-semibold text-white" style={{ background: w.color }}>{w.cta}</div></div>
            <div className={`grid h-14 w-14 place-items-center rounded-full text-white shadow-lg ${w.position === "left" ? "" : "ml-auto"}`} style={{ background: w.color }}><I.MessageCircle /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
