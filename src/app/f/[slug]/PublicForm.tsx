"use client";
import { useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { api, Spinner } from "@/components/ui";

export default function PublicForm({ slug, name, description, fields, brand, logo }: { slug: string; name: string; description?: string | null; fields: string[]; brand: string; logo?: string | null }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api(`/api/public/forms/${slug}`, { method: "POST", json: v });
      setDone(true);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }
  const inp = (k: string, ph: string, type = "text", req = false) => <input required={req} type={type} placeholder={ph} className="input py-2.5" value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} />;
  return (
    <div className="hero flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-7">
        <div className="mb-5 flex items-center gap-3">
          {logo ? <img src={logo} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white"><MessageCircle size={20} /></div>}
          <div><div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{brand}</div><h1 className="text-xl font-bold">{name}</h1></div>
        </div>
        {done ? (
          <div className="py-8 text-center"><CheckCircle2 size={48} className="mx-auto text-emerald-500" /><h2 className="mt-3 text-lg font-semibold">Thank you!</h2><p className="text-sm text-slate-500">We&apos;ll reach out to you on WhatsApp shortly.</p></div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {description && <p className="mb-2 text-sm text-slate-500">{description}</p>}
            {inp("name", "Full name", "text", true)}
            {inp("phone", "WhatsApp number (with country code)", "tel", true)}
            {inp("email", "Email (optional)", "email")}
            {fields.map((f) => <div key={f}>{inp(f, f)}</div>)}
            {err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
            <button disabled={busy} className="btn-primary w-full py-2.5">{busy && <Spinner size={15} />} Submit</button>
          </form>
        )}
      </div>
    </div>
  );
}
