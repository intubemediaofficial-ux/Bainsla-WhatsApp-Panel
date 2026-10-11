"use client";
import { ReactNode, useEffect } from "react";
import { X, Loader2, Inbox } from "lucide-react";
import clsx from "clsx";

export function PageHero({ title, subtitle, actions, icon }: { title: string; subtitle?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="hero relative mb-6 overflow-hidden rounded-3xl px-6 py-7 text-white shadow-lg shadow-emerald-900/10 md:px-8">
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[40px] border-white/5" />
      <div className="pointer-events-none absolute -right-4 top-10 h-40 w-40 rounded-full border-[24px] border-white/5" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {icon && <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur">{icon}</div>}
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">{title}</h1>
            {subtitle && <p className="mt-1 max-w-2xl text-sm text-emerald-50/90">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const tones: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600", blue: "bg-sky-50 text-sky-600", violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600", slate: "bg-slate-100 text-slate-600", teal: "bg-teal-50 text-teal-600",
};

export function Stat({ label, value, icon, tone = "emerald", hint, href }: { label: string; value: ReactNode; icon?: ReactNode; tone?: string; hint?: string; href?: string }) {
  const inner = (
    <div className="card flex items-start justify-between gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <div className="text-[13px] font-medium text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
        {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
      </div>
      {icon && <div className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tones[tone])}>{icon}</div>}
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

export function Section({ title, icon, children, action }: { title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-3">
        {icon && <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">{icon}</div>}
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <div className="h-px flex-1 bg-slate-200" />
        {action}
      </div>
      {children}
    </section>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: string }) {
  const t: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600 ring-slate-200", green: "bg-emerald-50 text-emerald-700 ring-emerald-200", red: "bg-rose-50 text-rose-700 ring-rose-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200", blue: "bg-sky-50 text-sky-700 ring-sky-200", violet: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1", t[tone] || t.slate)}>{children}</span>;
}

export function statusTone(s?: string | null) {
  const v = String(s || "").toUpperCase();
  if (["ACTIVE", "CONNECTED", "APPROVED", "COMPLETED", "PAID", "SUCCESS", "DELIVERED", "READ", "WON", "CONFIRMED", "RESOLVED", "TRUE", "SENT"].includes(v)) return "green";
  if (["FAILED", "REJECTED", "SUSPENDED", "CANCELLED", "LOST", "EXPIRED", "URGENT", "HOT", "FALSE", "DISABLED"].includes(v)) return "red";
  if (["PENDING", "SCHEDULED", "PAUSED", "DRAFT", "WARM", "HIGH", "OPEN", "NEW", "UNPAID", "IN_PROGRESS"].includes(v)) return "amber";
  if (["RUNNING", "CONTACTED", "QUALIFIED", "SHIPPED", "COLD"].includes(v)) return "blue";
  return "slate";
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm md:p-10" onMouseDown={onClose}>
      <div className={clsx("card w-full p-0", wide ? "max-w-4xl" : "max-w-xl")} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 scroll-thin">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ text, icon, action }: { text: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-slate-400">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-slate-300">{icon || <Inbox size={26} />}</div>
      <p className="text-sm">{text}</p>
      {action}
    </div>
  );
}

export const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 size={size} className="animate-spin" />;

export function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {help && <span className="mt-1 block text-xs text-slate-400">{help}</span>}
    </label>
  );
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json", ...(init?.headers || {}) } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || `Error ${r.status}`);
  return j as T;
}

export function toast(msg: string, kind: "ok" | "err" = "ok") {
  const el = document.createElement("div");
  el.className = `fixed bottom-6 right-6 z-[100] max-w-sm rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${kind === "ok" ? "bg-emerald-600" : "bg-rose-600"}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export const fmtDate = (d?: string | Date | null) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
export const inr = (n: number | string) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
