"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, CheckCircle2 } from "lucide-react";
import { api, Spinner } from "./ui";

export default function AuthForm({ mode, brand }: { mode: "login" | "signup"; brand: { name: string; tagline: string } }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [f, setF] = useState({ name: "", business: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const j = await api<{ redirect: string }>(`/api/auth/${mode}`, { method: "POST", json: f });
      router.push(sp.get("next") || j.redirect);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full border-[60px] border-white/5" />
        <Link href="/" className="flex items-center gap-3 text-xl font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><MessageCircle /></span>{brand.name}</Link>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Grow your business on WhatsApp</h2>
          <p className="mt-3 max-w-md text-emerald-50/90">{brand.tagline}</p>
          <ul className="mt-8 space-y-3 text-emerald-50">
            {["Official WhatsApp Cloud API — multiple numbers", "Team inbox with agents, labels & notes", "Broadcasts, drip campaigns & delivery reports", "Chatbot flow builder + AI replies from your knowledge base"].map((t) => (
              <li key={t} className="flex items-center gap-3"><CheckCircle2 size={18} className="text-emerald-200" /> {t}</li>
            ))}
          </ul>
        </div>
        <div className="text-sm text-emerald-100/70">© {new Date().getFullYear()} {brand.name}</div>
      </div>
      <div className="flex items-center justify-center bg-white p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="text-sm text-slate-500">{mode === "login" ? `Sign in to your ${brand.name} account` : "Start free — connect your WhatsApp number in minutes"}</p>
          </div>
          {mode === "signup" && (
            <>
              <input required className="input py-2.5" placeholder="Your name" value={f.name} onChange={set("name")} />
              <input required className="input py-2.5" placeholder="Business name" value={f.business} onChange={set("business")} />
              <input className="input py-2.5" placeholder="Mobile number" value={f.phone} onChange={set("phone")} />
            </>
          )}
          <input required type="email" className="input py-2.5" placeholder="Email" value={f.email} onChange={set("email")} />
          <input required type="password" minLength={6} className="input py-2.5" placeholder="Password" value={f.password} onChange={set("password")} />
          {err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
          <button disabled={busy} className="btn-primary w-full py-2.5">{busy && <Spinner size={15} />} {mode === "login" ? "Sign In" : "Create Account"}</button>
          <p className="text-center text-sm text-slate-500">
            {mode === "login" ? <>Don&apos;t have an account? <Link href="/signup" className="font-semibold text-emerald-700">Sign up</Link></> : <>Already registered? <Link href="/login" className="font-semibold text-emerald-700">Sign in</Link></>}
          </p>
        </form>
      </div>
    </div>
  );
}
