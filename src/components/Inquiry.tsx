"use client";
import { useState } from "react";
import { api, Spinner } from "./ui";

export default function Inquiry() {
  const [v, setV] = useState({ name: "", phone: "", email: "", message: "" });
  const [st, setSt] = useState<"" | "busy" | "done">("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSt("busy");
    try { await api("/api/public/inquiry", { method: "POST", json: v }); setSt("done"); } catch (e) { setErr((e as Error).message); setSt(""); }
  }
  if (st === "done") return <div className="card grid place-items-center p-10 text-center"><div className="text-lg font-semibold text-emerald-700">Thanks! We&apos;ll contact you soon.</div></div>;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form onSubmit={submit} className="card grid gap-3 p-6 sm:grid-cols-2">
      <input required placeholder="Name" className="input py-2.5" value={v.name} onChange={set("name")} />
      <input required placeholder="WhatsApp number" className="input py-2.5" value={v.phone} onChange={set("phone")} />
      <input placeholder="Email" type="email" className="input py-2.5 sm:col-span-2" value={v.email} onChange={set("email")} />
      <textarea placeholder="How can we help?" className="input min-h-[100px] sm:col-span-2" value={v.message} onChange={set("message")} />
      {err && <div className="text-sm text-rose-600 sm:col-span-2">{err}</div>}
      <button disabled={st === "busy"} className="btn-primary py-2.5 sm:col-span-2">{st === "busy" && <Spinner size={15} />} Request a demo</button>
    </form>
  );
}
