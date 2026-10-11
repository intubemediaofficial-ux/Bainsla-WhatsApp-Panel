"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as I from "lucide-react";
import { api, Badge, Empty, Field, fmtDate, Modal, PageHero, Spinner, statusTone, toast } from "@/components/ui";

type C = { id: string; phone: string; name?: string | null; email?: string | null; tags: string[]; stage?: string | null; leadScore?: string | null; source?: string | null; optedOut: boolean; notes?: string | null; customFields: Record<string, string>; birthday?: string | null; anniversary?: string | null; createdAt: string; lastMessageAt?: string | null };

function Contacts() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get("q") || "");
  const [tag, setTag] = useState("");
  const [stage, setStage] = useState("");
  const [page, setPage] = useState(1);
  const [d, setD] = useState<{ items: C[]; total: number; tags: { name: string; color: string }[]; stages: { name: string }[] } | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [edit, setEdit] = useState<Partial<C> | null>(null);
  const [imp, setImp] = useState(sp.get("import") === "1");
  const [file, setFile] = useState<File | null>(null);
  const [impTag, setImpTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<{ key: string; label: string }[]>([]);

  const load = useCallback(async () => {
    const j = await api<NonNullable<typeof d>>(`/api/contacts?q=${encodeURIComponent(q)}&tag=${encodeURIComponent(tag)}&stage=${encodeURIComponent(stage)}&page=${page}`);
    setD(j);
  }, [q, tag, stage, page]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api<{ items: { key: string; label: string }[] }>("/api/r/custom-fields?take=100").then((j) => setFields(j.items)); }, []);
  useEffect(() => { const o = sp.get("open"); if (o) api<C>(`/api/contacts/${o}`).then(setEdit).catch(() => {}); }, [sp]);

  async function save() {
    if (!edit) return;
    setBusy(true);
    try {
      const payload = { ...edit, tags: typeof edit.tags === "string" ? edit.tags : (edit.tags || []).join(",") };
      if (edit.id) await api(`/api/contacts/${edit.id}`, { method: "PATCH", json: payload });
      else await api("/api/contacts", { method: "POST", json: payload });
      toast("Contact saved");
      setEdit(null);
      load();
    } catch (e) { toast((e as Error).message, "err"); }
    setBusy(false);
  }
  async function bulk(action: string, value?: string) {
    if (action === "delete" && !confirm(`Delete ${sel.length} contacts?`)) return;
    const r = await api<{ count: number }>("/api/contacts/bulk", { method: "POST", json: { ids: sel, action, value } });
    toast(`${r.count} updated`);
    setSel([]);
    load();
  }
  async function doImport() {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tag", impTag);
    try {
      const r = await api<{ total: number; created: number; updated: number; failed: number }>("/api/contacts/import", { method: "POST", body: fd });
      toast(`Imported: ${r.created} new, ${r.updated} updated, ${r.failed} failed`);
      setImp(false); setFile(null); load();
    } catch (e) { toast((e as Error).message, "err"); }
    setBusy(false);
  }
  async function openChat(c: C) {
    const j = await api<{ conversations: { id: string }[] }>(`/api/contacts/${c.id}`);
    if (j.conversations[0]) router.push(`/client/chat?c=${j.conversations[0].id}`);
    else toast("No chat yet — send a template from Broadcast or wait for them to message", "err");
  }
  function exportCsv() {
    if (!d) return;
    const rows = [["phone", "name", "email", "tags", "stage", "source", "opted_out", "created"], ...d.items.map((c) => [c.phone, c.name || "", c.email || "", c.tags.join(";"), c.stage || "", c.source || "", c.optedOut ? "yes" : "no", c.createdAt])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" }));
    a.download = "contacts.csv";
    a.click();
  }
  const pages = d ? Math.max(1, Math.ceil(d.total / 50)) : 1;
  const set = (k: keyof C, v: unknown) => setEdit({ ...edit, [k]: v });

  return (
    <div>
      <PageHero title="Contact Directory" subtitle="Your WhatsApp audience — tags, stages, custom fields and opt-out status" icon={<I.Users />}
        actions={<><button onClick={() => setImp(true)} className="btn bg-white/15 text-white hover:bg-white/25"><I.Upload size={16} /> Import CSV</button><button onClick={exportCsv} className="btn bg-white/15 text-white hover:bg-white/25"><I.Download size={16} /> Export</button><button onClick={() => setEdit({ tags: [], customFields: {} })} className="btn bg-white text-emerald-700 hover:bg-emerald-50"><I.UserPlus size={16} /> Add Contact</button></>} />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="relative w-full max-w-xs"><I.Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, phone or email" className="input py-1.5 pl-9" /></div>
          <select value={tag} onChange={(e) => { setTag(e.target.value); setPage(1); }} className="input w-auto py-1.5"><option value="">All labels</option>{d?.tags.map((t) => <option key={t.name}>{t.name}</option>)}</select>
          <select value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }} className="input w-auto py-1.5"><option value="">All stages</option>{d?.stages.map((t) => <option key={t.name}>{t.name}</option>)}</select>
          <span className="ml-auto text-xs text-slate-500">{d?.total ?? 0} contacts</span>
        </div>
        {sel.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-emerald-50 px-4 py-2 text-sm">
            <b>{sel.length} selected</b>
            <button onClick={() => { const v = prompt("Label to add"); if (v) bulk("addTag", v); }} className="btn-ghost py-1 text-xs">Add label</button>
            <button onClick={() => { const v = prompt("Label to remove"); if (v) bulk("removeTag", v); }} className="btn-ghost py-1 text-xs">Remove label</button>
            <select onChange={(e) => e.target.value && bulk("setStage", e.target.value)} className="input w-auto py-1 text-xs" defaultValue=""><option value="">Set stage…</option>{d?.stages.map((s) => <option key={s.name}>{s.name}</option>)}</select>
            <button onClick={() => bulk("optOut")} className="btn-ghost py-1 text-xs">Opt-out</button>
            <button onClick={() => bulk("optIn")} className="btn-ghost py-1 text-xs">Opt-in</button>
            <button onClick={() => bulk("delete")} className="btn-danger py-1 text-xs">Delete</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/70"><tr><th className="th w-8"><input type="checkbox" checked={!!d?.items.length && sel.length === d.items.length} onChange={(e) => setSel(e.target.checked ? d!.items.map((c) => c.id) : [])} className="accent-emerald-600" /></th><th className="th">Contact</th><th className="th">Labels</th><th className="th">Stage</th><th className="th">Source</th><th className="th">Last message</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {d?.items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="td"><input type="checkbox" checked={sel.includes(c.id)} onChange={(e) => setSel(e.target.checked ? [...sel, c.id] : sel.filter((x) => x !== c.id))} className="accent-emerald-600" /></td>
                  <td className="td"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{(c.name || c.phone).slice(0, 2).toUpperCase()}</div><div><div className="font-semibold text-slate-800">{c.name || "—"} {c.optedOut && <Badge tone="red">STOP</Badge>}</div><div className="text-xs text-slate-500">+{c.phone}</div></div></div></td>
                  <td className="td"><div className="flex flex-wrap gap-1">{c.tags.map((t) => <Badge key={t} tone="blue">{t}</Badge>)}</div></td>
                  <td className="td">{c.stage ? <Badge tone="violet">{c.stage}</Badge> : "—"} {c.leadScore && <Badge tone={statusTone(c.leadScore)}>{c.leadScore}</Badge>}</td>
                  <td className="td text-xs text-slate-500">{c.source || "—"}</td>
                  <td className="td text-xs text-slate-500">{fmtDate(c.lastMessageAt)}</td>
                  <td className="td whitespace-nowrap text-right">
                    <button onClick={() => openChat(c)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700" title="Open chat"><I.MessageCircle size={15} /></button>
                    <button onClick={() => setEdit(c)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"><I.Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!d && <div className="flex justify-center py-10 text-emerald-600"><Spinner /></div>}
          {d && !d.items.length && <Empty text="No contacts yet" icon={<I.Users />} action={<button onClick={() => setImp(true)} className="btn-primary"><I.Upload size={16} /> Import CSV</button>} />}
        </div>
        {pages > 1 && <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 text-sm"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-ghost py-1">Prev</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="btn-ghost py-1">Next</button></div>}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit contact" : "Add contact"}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone (with country code) *"><input className="input" disabled={!!edit.id} value={edit.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="919876543210" /></Field>
            <Field label="Name"><input className="input" value={edit.name || ""} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Email"><input className="input" value={edit.email || ""} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Labels (comma separated)"><input className="input" value={Array.isArray(edit.tags) ? edit.tags.join(", ") : String(edit.tags || "")} onChange={(e) => set("tags", e.target.value as unknown as string[])} /></Field>
            <Field label="Stage"><select className="input" value={edit.stage || ""} onChange={(e) => set("stage", e.target.value)}><option value="">—</option>{d?.stages.map((s) => <option key={s.name}>{s.name}</option>)}</select></Field>
            <Field label="Lead score"><select className="input" value={edit.leadScore || ""} onChange={(e) => set("leadScore", e.target.value)}>{["", "HOT", "WARM", "COLD"].map((s) => <option key={s} value={s}>{s || "—"}</option>)}</select></Field>
            <Field label="Birthday"><input type="date" className="input" value={edit.birthday?.slice(0, 10) || ""} onChange={(e) => set("birthday", e.target.value)} /></Field>
            <Field label="Anniversary"><input type="date" className="input" value={edit.anniversary?.slice(0, 10) || ""} onChange={(e) => set("anniversary", e.target.value)} /></Field>
            {fields.map((f) => <Field key={f.key} label={f.label}><input className="input" value={edit.customFields?.[f.key] || ""} onChange={(e) => set("customFields", { ...(edit.customFields || {}), [f.key]: e.target.value })} /></Field>)}
            <div className="sm:col-span-2"><Field label="Notes"><textarea className="input min-h-[80px]" value={edit.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field></div>
            {edit.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit.optedOut} onChange={(e) => set("optedOut", e.target.checked)} className="accent-rose-600" /> Opted out (STOP)</label>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              {edit.id && <button onClick={async () => { if (confirm("Delete contact?")) { await api(`/api/contacts/${edit.id}`, { method: "DELETE" }); setEdit(null); load(); } }} className="btn-ghost mr-auto text-rose-600">Delete</button>}
              <button onClick={() => setEdit(null)} className="btn-ghost">Cancel</button><button onClick={save} disabled={busy} className="btn-primary">{busy && <Spinner size={14} />} Save</button>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={imp} onClose={() => setImp(false)} title="Import contacts from CSV">
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">CSV must have a <b>phone</b> column (with country code, e.g. 919876543210). Optional: <b>name, email, tags</b>. Any other column is saved as a custom field. Existing numbers are updated, not duplicated.
            <a className="mt-2 block font-semibold text-emerald-700" href={"data:text/csv;charset=utf-8," + encodeURIComponent("phone,name,email,tags,city\n919876543210,Rahul Sharma,rahul@example.com,vip;delhi,Delhi\n")} download="contacts-sample.csv">Download sample CSV</a></div>
          <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input" />
          <Field label="Add this label to all imported (optional)"><input className="input" value={impTag} onChange={(e) => setImpTag(e.target.value)} placeholder="import-oct" /></Field>
          <button disabled={!file || busy} onClick={doImport} className="btn-primary w-full">{busy && <Spinner size={14} />} Import</button>
        </div>
      </Modal>
    </div>
  );
}

export default function Page() {
  return <Suspense><Contacts /></Suspense>;
}
