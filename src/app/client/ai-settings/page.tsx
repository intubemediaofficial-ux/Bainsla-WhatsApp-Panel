"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import * as I from "lucide-react";
import { api, Field, PageHero, Spinner, toast } from "@/components/ui";
import { useWorkspace } from "@/components/useWorkspace";

export default function AiSettings() {
  const { ws, save } = useWorkspace();
  const [f, setF] = useState({ aiEnabled: false, aiProvider: "openai", aiModel: "", aiApiKey: "", aiPrompt: "" });
  const [docs, setDocs] = useState(0);
  const [up, setUp] = useState(false);
  useEffect(() => { if (ws) setF({ aiEnabled: ws.aiEnabled, aiProvider: ws.aiProvider, aiModel: ws.aiModel || "", aiApiKey: ws.aiApiKey || "", aiPrompt: ws.aiPrompt || "" }); }, [ws]);
  useEffect(() => { api<{ total: number }>("/api/r/knowledge-base?take=1").then((j) => setDocs(j.total)); }, [up]);
  if (!ws) return <div className="grid h-64 place-items-center text-emerald-600"><Spinner size={28} /></div>;
  async function upload(file: File) {
    setUp(true);
    const fd = new FormData(); fd.append("file", file);
    try { const r = await api<{ chars: number }>("/api/kb/upload", { method: "POST", body: fd }); toast(`Added ${r.chars.toLocaleString()} characters to knowledge base`); } catch (e) { toast((e as Error).message, "err"); }
    setUp(false);
  }
  return (
    <div>
      <PageHero title="AI Chatbot" subtitle="Let AI answer customer messages 24×7 using your knowledge base. Humans can take over anytime." icon={<I.Bot />} actions={<button onClick={() => save(f)} className="btn bg-white text-emerald-700"><I.Save size={16} /> Save</button>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <label className="flex items-center justify-between rounded-xl bg-emerald-50 p-4"><div><div className="font-semibold">AI auto-reply</div><div className="text-xs text-slate-500">Replies when no keyword or bot flow matches (and bot isn&apos;t paused for that chat)</div></div><input type="checkbox" checked={f.aiEnabled} onChange={(e) => setF({ ...f, aiEnabled: e.target.checked })} className="h-5 w-5 accent-emerald-600" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider"><select className="input" value={f.aiProvider} onChange={(e) => setF({ ...f, aiProvider: e.target.value })}><option value="openai">OpenAI</option><option value="gemini">Google Gemini (OpenAI-compatible)</option><option value="platform">Use platform key</option></select></Field>
            <Field label="Model"><input className="input" value={f.aiModel} onChange={(e) => setF({ ...f, aiModel: e.target.value })} placeholder="gpt-4o-mini" /></Field>
          </div>
          {f.aiProvider !== "platform" && <Field label="API key" help="Stored on the server only — never shown to agents"><input className="input font-mono" value={f.aiApiKey} onChange={(e) => setF({ ...f, aiApiKey: e.target.value })} placeholder="sk-…" /></Field>}
          <Field label="Instructions / persona" help="Tell the AI who it is, tone, language, what to sell and when to hand over to a human"><textarea className="input min-h-[180px]" value={f.aiPrompt} onChange={(e) => setF({ ...f, aiPrompt: e.target.value })} placeholder={"You are the friendly assistant of Bainsla Events, Jaipur. Reply in Hinglish, short and polite. If customer asks for booking, collect name, date and city. If unsure, say an expert will call."} /></Field>
        </div>
        <div className="card h-fit space-y-3 p-5">
          <h3 className="flex items-center gap-2 font-semibold"><I.BookOpen size={18} className="text-emerald-600" /> Knowledge base</h3>
          <div className="text-3xl font-bold">{docs}</div><div className="-mt-2 text-xs text-slate-400">documents</div>
          <label className="btn-primary w-full cursor-pointer">{up ? <Spinner size={14} /> : <I.Upload size={16} />} Upload PDF / TXT / CSV<input type="file" hidden accept=".pdf,.txt,.csv,.md" onChange={(e) => { const x = e.target.files?.[0]; if (x) upload(x); e.target.value = ""; }} /></label>
          <Link href="/client/knowledge-base" className="btn-ghost w-full">Manage documents</Link>
        </div>
      </div>
    </div>
  );
}
