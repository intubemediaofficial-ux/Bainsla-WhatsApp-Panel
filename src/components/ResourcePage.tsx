"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Download, Copy, ExternalLink } from "lucide-react";
import { RESOURCES, Field as F } from "@/lib/resources";
import { api, Badge, Empty, Field, Modal, PageHero, Spinner, statusTone, toast, fmtDate } from "./ui";

type Row = Record<string, unknown> & { id: string };

function Cell({ f, v, row, publicLink }: { f: F; v: unknown; row: Row; publicLink?: string }) {
  if (f.name === "slug" && publicLink && v) {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}${publicLink}${v}`;
    return (
      <div className="flex items-center gap-2">
        <a href={url} target="_blank" className="font-mono text-xs text-emerald-700 hover:underline">{publicLink}{String(v)}</a>
        <button onClick={() => { navigator.clipboard.writeText(url); toast("Link copied"); }} className="text-slate-400 hover:text-slate-700"><Copy size={13} /></button>
      </div>
    );
  }
  if (f.type === "boolean") return <Badge tone={v ? "green" : "slate"}>{v ? "Yes" : "No"}</Badge>;
  if (f.type === "color") return <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: String(v) }} />{String(v || "")}</span>;
  if (f.type === "tags") return <div className="flex flex-wrap gap-1">{((v as string[]) || []).slice(0, 6).map((t) => <Badge key={t} tone="blue">{t}</Badge>)}</div>;
  if (f.type === "date" || f.type === "datetime") return <span className="whitespace-nowrap text-slate-500">{v ? fmtDate(String(v)) : "—"}</span>;
  if (f.type === "select" && v) return <Badge tone={statusTone(String(v))}>{String(v)}</Badge>;
  if (f.name === "status" && v) return <Badge tone={statusTone(String(v))}>{String(v)}</Badge>;
  if (f.name === "url" && v) return <a href={String(v)} target="_blank" className="inline-flex items-center gap-1 text-emerald-700 hover:underline">Open <ExternalLink size={12} /></a>;
  if (f.type === "json") return <code className="text-xs text-slate-500">{JSON.stringify(v).slice(0, 60)}</code>;
  const s = v === null || v === undefined || v === "" ? "—" : String(v);
  void row;
  return <span className="line-clamp-2 max-w-xs">{s}</span>;
}

function toInput(f: F, v: unknown) {
  if (v === null || v === undefined) return f.type === "boolean" ? true : "";
  if (f.type === "tags") return ((v as string[]) || []).join(", ");
  if (f.type === "json") return JSON.stringify(v, null, 2);
  if (f.type === "datetime") return new Date(String(v)).toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).slice(0, 16).replace(" ", "T");
  if (f.type === "date") return String(v).slice(0, 10);
  return v;
}

export function FormFields({ fields, value, onChange }: { fields: F[]; value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.filter((f) => f.form !== false).map((f) => {
        const v = value[f.name];
        const set = (x: unknown) => onChange({ ...value, [f.name]: x });
        const wide = f.type === "textarea" || f.type === "json";
        return (
          <div key={f.name} className={wide ? "sm:col-span-2" : ""}>
            {f.type === "boolean" ? (
              <label className="mt-6 flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-emerald-600" /> {f.label}
              </label>
            ) : (
              <Field label={f.label + (f.required ? " *" : "")} help={f.help}>
                {f.type === "textarea" || f.type === "json" ? (
                  <textarea className="input min-h-[110px] font-[inherit]" value={String(v ?? "")} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} />
                ) : f.type === "select" ? (
                  <select className="input" value={String(v ?? "")} onChange={(e) => set(e.target.value)}>
                    {(f.options || []).map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                  </select>
                ) : (
                  <input
                    className="input"
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : f.type === "color" ? "color" : "text"}
                    value={String(v ?? (f.type === "color" ? "#10b981" : ""))}
                    placeholder={f.placeholder}
                    onChange={(e) => set(e.target.value)}
                  />
                )}
              </Field>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ResourcePage({ res, extraActions }: { res: string; extraActions?: React.ReactNode }) {
  const def = RESOURCES[res];
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const j = await api<{ items: Row[]; total: number }>(`/api/r/${res}?q=${encodeURIComponent(q)}&page=${page}`);
      setRows(j.items);
      setTotal(j.total);
    } catch (e) {
      toast((e as Error).message, "err");
    }
    setLoading(false);
  }, [res, q, page]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  function open(row?: Row) {
    const init: Record<string, unknown> = {};
    def.fields.forEach((f) => (init[f.name] = toInput(f, row ? row[f.name] : f.type === "select" ? f.options?.[0] : f.type === "boolean" ? true : undefined)));
    setForm(init);
    setEdit(row || ({ id: "" } as Row));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form };
      def.fields.forEach((f) => {
        if (f.type === "datetime" && payload[f.name]) payload[f.name] = new Date(String(payload[f.name]) + ":00+05:30").toISOString();
      });
      if (edit?.id) await api(`/api/r/${res}/${edit.id}`, { method: "PATCH", json: payload });
      else await api(`/api/r/${res}`, { method: "POST", json: payload });
      toast("Saved");
      setEdit(null);
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
    setSaving(false);
  }

  async function del(row: Row) {
    if (!confirm("Delete this item?")) return;
    try {
      await api(`/api/r/${res}/${row.id}`, { method: "DELETE" });
      toast("Deleted");
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }

  function exportCsv() {
    const cols = def.fields.filter((f) => f.table);
    const lines = [cols.map((c) => c.label).join(","), ...rows.map((r) => cols.map((c) => `"${String(Array.isArray(r[c.name]) ? (r[c.name] as string[]).join("; ") : r[c.name] ?? "").replace(/"/g, '""')}"`).join(","))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `${res}.csv`;
    a.click();
  }

  const cols = def.fields.filter((f) => f.table);
  const pages = Math.max(1, Math.ceil(total / 50));
  return (
    <div>
      <PageHero
        title={def.title}
        subtitle={def.subtitle}
        actions={
          <>
            {extraActions}
            <button onClick={exportCsv} className="btn bg-white/15 text-white hover:bg-white/25"><Download size={16} /> Export</button>
            {!def.readOnly && !def.noCreate && <button onClick={() => open()} className="btn bg-white text-emerald-700 hover:bg-emerald-50"><Plus size={16} /> Add New</button>}
          </>
        }
      />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search…" className="input py-1.5 pl-9" />
          </div>
          <div className="text-xs text-slate-500">{total} record{total === 1 ? "" : "s"}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/70">
              <tr>
                {cols.map((c) => <th key={c.name} className="th">{c.label}</th>)}
                {!def.readOnly && <th className="th text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  {cols.map((c) => <td key={c.name} className="td"><Cell f={c} v={r[c.name]} row={r} publicLink={def.publicLink} /></td>)}
                  {!def.readOnly && (
                    <td className="td whitespace-nowrap text-right">
                      <button onClick={() => open(r)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={15} /></button>
                      <button onClick={() => del(r)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {loading && !rows.length && <div className="flex justify-center py-10 text-emerald-600"><Spinner /></div>}
          {!loading && !rows.length && <Empty text={`No ${def.title.toLowerCase()} yet`} action={!def.readOnly && !def.noCreate ? <button onClick={() => open()} className="btn-primary"><Plus size={16} /> Add first</button> : undefined} />}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 text-sm">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-ghost py-1">Prev</button>
            <span>{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="btn-ghost py-1">Next</button>
          </div>
        )}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Edit` : `Add ${def.title.replace(/s$/, "")}`}>
        <FormFields fields={def.fields} value={form} onChange={setForm} />
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setEdit(null)} className="btn-ghost">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving && <Spinner size={14} />} Save</button>
        </div>
      </Modal>
    </div>
  );
}
