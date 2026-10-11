"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as I from "lucide-react";
import clsx from "clsx";
import { api, Badge, Empty, fmtDate, Modal, Spinner, toast } from "@/components/ui";

type Contact = { id: string; name?: string | null; phone: string; tags: string[]; optedOut: boolean; email?: string | null; stage?: string | null; notes?: string | null };
type Conv = { id: string; contact: Contact; unread: number; lastPreview?: string | null; lastMessageAt: string; status: string; labels: string[]; assignedTo?: { id: string; name: string } | null; botPaused: boolean };
type Msg = { id: string; direction: string; type: string; body?: string | null; mediaUrl?: string | null; status: string; error?: string | null; sentBy?: string | null; createdAt: string };
type Tpl = { id: string; name: string; language: string; components: { type: string; text?: string; format?: string }[] };

const ticks = (s: string) => s === "read" ? <I.CheckCheck size={14} className="text-sky-500" /> : s === "delivered" ? <I.CheckCheck size={14} className="text-slate-400" /> : s === "failed" ? <I.AlertCircle size={14} className="text-rose-500" /> : <I.Check size={14} className="text-slate-400" />;
const initials = (c: Contact) => (c.name || c.phone).slice(0, 2).toUpperCase();

function Bubble({ m }: { m: Msg }) {
  const out = m.direction === "out";
  const media = m.mediaUrl && (
    m.type === "image" || m.type === "sticker" ? <a href={m.mediaUrl} target="_blank"><img src={m.mediaUrl} alt="" className="mb-1 max-h-64 rounded-lg" /></a>
    : m.type === "video" ? <video src={m.mediaUrl} controls className="mb-1 max-h-64 rounded-lg" />
    : m.type === "audio" ? <audio src={m.mediaUrl} controls className="mb-1" />
    : <a href={m.mediaUrl} target="_blank" className="mb-1 flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-sm"><I.FileText size={18} /> {m.body || "Document"}</a>
  );
  return (
    <div className={clsx("flex", out ? "justify-end" : "justify-start")}>
      <div className={clsx("max-w-[75%] rounded-xl px-3 py-2 text-[14px] shadow-sm", out ? "rounded-tr-none bg-[#d9fdd3]" : "rounded-tl-none bg-white")}>
        {m.type === "template" && <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Template</div>}
        {media}
        {m.body && !(m.type === "document" && m.mediaUrl) && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
          {out && m.sentBy && <span className="mr-1">{m.sentBy}</span>}
          {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} {out && ticks(m.status)}
        </div>
        {m.error && <div className="mt-1 text-[11px] text-rose-600">{m.error}</div>}
      </div>
    </div>
  );
}

function Inbox() {
  const sp = useSearchParams();
  const [filter, setFilter] = useState(sp.get("filter") || "all");
  const [q, setQ] = useState("");
  const [list, setList] = useState<Conv[]>([]);
  const [counts, setCounts] = useState({ all: 0, unread: 0 });
  const [sel, setSel] = useState<string | null>(sp.get("c"));
  const [data, setData] = useState<{ conversation: Conv & { contact: Contact }; messages: Msg[]; notes: { id: string; userName: string; body: string; createdAt: string }[]; windowOpen: boolean } | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [qr, setQr] = useState<{ shortcut: string; body: string }[]>([]);
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplSel, setTplSel] = useState<Tpl | null>(null);
  const [tplVars, setTplVars] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [side, setSide] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(async () => {
    const j = await api<{ items: Conv[]; counts: typeof counts }>(`/api/conversations?filter=${filter}&q=${encodeURIComponent(q)}`);
    setList(j.items);
    setCounts(j.counts);
  }, [filter, q]);
  const loadConv = useCallback(async (id: string) => {
    const j = await api<NonNullable<typeof data>>(`/api/conversations/${id}`);
    setData(j);
    setTimeout(() => endRef.current?.scrollIntoView(), 50);
  }, []);

  useEffect(() => { const t = setTimeout(loadList, 200); return () => clearTimeout(t); }, [loadList]);
  useEffect(() => { if (sel) loadConv(sel); }, [sel, loadConv]);
  useEffect(() => {
    api<{ items: { id: string; name: string }[] }>("/api/agents").then((j) => setAgents(j.items));
    api<{ items: { shortcut: string; body: string }[] }>("/api/r/quick-replies?take=200").then((j) => setQr(j.items));
    api<{ items: Tpl[] }>("/api/templates?status=APPROVED").then((j) => setTpls(j.items));
  }, []);
  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      loadList();
      if (ev.conversationId && ev.conversationId === selRef.current) loadConv(ev.conversationId);
    };
    return () => es.close();
  }, [loadList, loadConv]);
  const selRef = useRef(sel);
  selRef.current = sel;

  async function send(body: object) {
    if (!sel) return;
    setSending(true);
    try {
      await api(`/api/conversations/${sel}/send`, { method: "POST", json: body });
      setText("");
      loadConv(sel);
      loadList();
    } catch (e) { toast((e as Error).message, "err"); }
    setSending(false);
  }
  async function upload(f: File) {
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await api<{ url: string }>("/api/upload", { method: "POST", body: fd });
      const mt = f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : f.type.startsWith("audio/") ? "audio" : "document";
      const absolute = r.url.startsWith("http") ? r.url : window.location.origin + r.url;
      await send({ kind: "media", mediaType: mt, url: absolute, filename: f.name, text: text || undefined });
    } catch (e) { toast((e as Error).message, "err"); }
  }
  async function patch(d: object) {
    if (!sel) return;
    await api(`/api/conversations/${sel}`, { method: "PATCH", json: d });
    loadConv(sel);
    loadList();
  }
  async function addNote() {
    if (!note.trim() || !sel) return;
    await api(`/api/conversations/${sel}/notes`, { method: "POST", json: { text: note } });
    setNote("");
    loadConv(sel);
  }
  const bodyText = tplSel?.components.find((c) => c.type === "BODY")?.text || "";
  const nVars = (bodyText.match(/\{\{\d+\}\}/g) || []).length;
  const slash = text.startsWith("/") ? qr.filter((r) => r.shortcut.toLowerCase().startsWith(text.slice(1).toLowerCase())).slice(0, 6) : [];
  const c = data?.conversation;

  return (
    <div className="-m-4 flex h-[calc(100vh-61px)] md:-m-6">
      <div className={clsx("flex w-full flex-col border-r border-slate-200 bg-white md:w-[340px]", sel && "hidden md:flex")}>
        <div className="border-b border-slate-100 p-3">
          <div className="relative"><I.Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or number" className="input py-1.5 pl-9" /></div>
          <div className="mt-2 flex gap-1 overflow-x-auto text-xs">
            {[["all", `All ${counts.all}`], ["unread", `Unread ${counts.unread}`], ["mine", "Mine"], ["unassigned", "Unassigned"], ["open", "Open"], ["closed", "Closed"]].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={clsx("whitespace-nowrap rounded-full px-3 py-1 font-semibold", filter === k ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600")}>{l}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin">
          {list.map((v) => (
            <button key={v.id} onClick={() => setSel(v.id)} className={clsx("flex w-full gap-3 border-b border-slate-50 px-3 py-3 text-left hover:bg-slate-50", sel === v.id && "bg-emerald-50/60")}>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white">{initials(v.contact)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{v.contact.name || `+${v.contact.phone}`}</span><span className="shrink-0 text-[11px] text-slate-400">{new Date(v.lastMessageAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span></div>
                <div className="flex items-center justify-between gap-2"><span className="truncate text-[13px] text-slate-500">{v.lastPreview || "—"}</span>{v.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">{v.unread}</span>}</div>
                <div className="mt-1 flex flex-wrap gap-1">{v.status === "CLOSED" && <Badge>closed</Badge>}{v.assignedTo && <Badge tone="violet">{v.assignedTo.name}</Badge>}{v.labels.slice(0, 2).map((l) => <Badge key={l} tone="blue">{l}</Badge>)}</div>
              </div>
            </button>
          ))}
          {!list.length && <Empty text="No conversations yet — messages from customers appear here" icon={<I.MessageCircle />} />}
        </div>
      </div>
      {!c ? (
        <div className="hidden flex-1 items-center justify-center bg-slate-50 md:flex"><Empty text="Select a chat to start messaging" icon={<I.MessagesSquare size={28} />} /></div>
      ) : (
        <div className={clsx("flex min-w-0 flex-1 flex-col", !sel && "hidden md:flex")}>
          <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
            <button className="md:hidden" onClick={() => { setSel(null); setData(null); }}><I.ArrowLeft size={20} /></button>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white">{initials(c.contact)}</div>
            <div className="min-w-0 flex-1"><div className="truncate font-semibold">{c.contact.name || `+${c.contact.phone}`}</div><div className="text-xs text-slate-500">+{c.contact.phone} · {data.windowOpen ? <span className="text-emerald-600">24h window open</span> : <span className="text-amber-600">window closed — template only</span>}</div></div>
            <select value={c.assignedTo?.id || ""} onChange={(e) => patch({ assignedToId: e.target.value || null })} className="input hidden w-40 py-1.5 text-xs lg:block"><option value="">Unassigned</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
            <button onClick={() => patch({ botPaused: !c.botPaused })} title="Toggle bot" className={clsx("btn-ghost px-2.5 py-1.5 text-xs", c.botPaused && "border-amber-300 text-amber-700")}><I.Bot size={15} /> {c.botPaused ? "Bot paused" : "Bot on"}</button>
            <button onClick={() => patch({ status: c.status === "OPEN" ? "CLOSED" : "OPEN" })} className="btn-ghost px-2.5 py-1.5 text-xs">{c.status === "OPEN" ? <><I.CheckCircle2 size={15} /> Resolve</> : <><I.RotateCcw size={15} /> Reopen</>}</button>
            <button onClick={() => setSide(!side)} className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 xl:block"><I.PanelRight size={18} /></button>
          </div>
          <div className="chat-bg flex-1 space-y-2 overflow-y-auto p-4 scroll-thin">
            {data.messages.map((m) => <Bubble key={m.id} m={m} />)}
            <div ref={endRef} />
          </div>
          <div className="relative border-t border-slate-200 bg-white p-3">
            {slash.length > 0 && (
              <div className="absolute bottom-full left-3 mb-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">{slash.map((r) => <button key={r.shortcut} onClick={() => setText(r.body)} className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50"><b>/{r.shortcut}</b> <span className="text-slate-500">{r.body.slice(0, 60)}</span></button>)}</div>
            )}
            {c.contact.optedOut && <div className="mb-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">This contact replied STOP — messaging is blocked until they send START.</div>}
            <div className="flex items-end gap-2">
              <button onClick={() => fileRef.current?.click()} disabled={!data.windowOpen} className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40" title="Attach"><I.Paperclip size={19} /></button>
              <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
              <button onClick={() => setTplOpen(true)} className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100" title="Send template"><I.FileText size={19} /></button>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} disabled={!data.windowOpen} placeholder={data.windowOpen ? "Type a message — / for quick replies" : "24h window closed — send a template"} className="input max-h-36 min-h-[42px] flex-1 resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) send({ kind: "text", text }); } }} />
              <button disabled={sending || !text.trim()} onClick={() => send({ kind: "text", text })} className="btn-primary h-[42px] px-4">{sending ? <Spinner size={16} /> : <I.SendHorizonal size={18} />}</button>
            </div>
          </div>
        </div>
      )}
      {c && side && (
        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4 scroll-thin xl:block">
          <div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xl font-bold text-white">{initials(c.contact)}</div><div className="mt-2 font-semibold">{c.contact.name || "Unknown"}</div><div className="text-sm text-slate-500">+{c.contact.phone}</div>{c.contact.email && <div className="text-xs text-slate-400">{c.contact.email}</div>}</div>
          <div className="mt-5"><div className="label">Chat labels</div>
            <div className="flex flex-wrap gap-1">{c.labels.map((l) => <button key={l} onClick={() => patch({ labels: c.labels.filter((x) => x !== l) })}><Badge tone="blue">{l} ×</Badge></button>)}</div>
            <input placeholder="Add label + Enter" className="input mt-2 py-1.5 text-xs" onKeyDown={(e) => { const v = (e.target as HTMLInputElement).value.trim(); if (e.key === "Enter" && v) { patch({ labels: Array.from(new Set([...c.labels, v])) }); (e.target as HTMLInputElement).value = ""; } }} />
          </div>
          <div className="mt-4"><div className="label">Contact tags</div><div className="flex flex-wrap gap-1">{c.contact.tags.length ? c.contact.tags.map((t) => <Badge key={t} tone="green">{t}</Badge>) : <span className="text-xs text-slate-400">none</span>}</div></div>
          <a href={`/client/contacts?open=${c.contact.id}`} className="btn-ghost mt-3 w-full py-1.5 text-xs"><I.UserCog size={14} /> Edit contact</a>
          <div className="mt-5"><div className="label">Internal notes</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only your team sees this" className="input min-h-[70px] text-sm" />
            <button onClick={addNote} className="btn-primary mt-2 w-full py-1.5 text-xs">Add note</button>
            <div className="mt-3 space-y-2">{data.notes.map((n) => <div key={n.id} className="rounded-lg bg-amber-50 p-2 text-xs"><div className="whitespace-pre-wrap text-slate-700">{n.body}</div><div className="mt-1 text-[10px] text-slate-400">{n.userName} · {fmtDate(n.createdAt)}</div></div>)}</div>
          </div>
        </aside>
      )}
      <Modal open={tplOpen} onClose={() => { setTplOpen(false); setTplSel(null); }} title="Send template">
        {!tpls.length ? <Empty text="No approved templates. Create one in Message Templates and sync." /> : (
          <div className="space-y-4">
            <select className="input" value={tplSel?.id || ""} onChange={(e) => { const t = tpls.find((x) => x.id === e.target.value) || null; setTplSel(t); setTplVars([]); }}><option value="">Choose template…</option>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.language})</option>)}</select>
            {tplSel && <div className="whitespace-pre-wrap rounded-xl bg-[#d9fdd3] p-3 text-sm">{bodyText}</div>}
            {Array.from({ length: nVars }).map((_, i) => <input key={i} className="input" placeholder={`{{${i + 1}}} — e.g. {{name}} or text`} value={tplVars[i] || ""} onChange={(e) => { const v = [...tplVars]; v[i] = e.target.value; setTplVars(v); }} />)}
            <button disabled={!tplSel || sending} onClick={async () => { await send({ kind: "template", templateId: tplSel!.id, vars: { body: tplVars } }); setTplOpen(false); }} className="btn-primary w-full">Send template</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function Page() {
  return <Suspense><Inbox /></Suspense>;
}
