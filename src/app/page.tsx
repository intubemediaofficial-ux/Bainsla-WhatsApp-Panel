import Link from "next/link";
import * as I from "lucide-react";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/db";
import Inquiry from "@/components/Inquiry";

export const dynamic = "force-dynamic";

const FEATURES: [keyof typeof I, string, string][] = [
  ["MessageCircle", "Team Inbox", "Shared live inbox for all agents — assign chats, labels, notes, quick replies, media."],
  ["Send", "Broadcast Campaigns", "Send approved templates to thousands with scheduling & delivered/read/replied reports."],
  ["Workflow", "Bot Flow Builder", "Drag-and-drop chatbot with buttons, lists, questions, conditions, AI and handover."],
  ["Bot", "AI Chatbot", "Answers customers 24×7 from your own knowledge base — FAQs, price lists, PDFs."],
  ["Repeat", "Drip & Follow-ups", "Multi-step sequences that stop automatically when the customer replies."],
  ["Users", "Contacts CRM", "Tags, segments, custom fields, stages, lead score, CSV import & STOP opt-out."],
  ["Kanban", "Sales Pipeline", "Deals board, leads, appointments with WhatsApp reminders and tickets."],
  ["ShoppingBag", "Catalog & Orders", "Products and orders inside chat with abandoned-payment reminders."],
  ["QrCode", "Lead Source & QR", "Click-tracked wa.me links, QR codes, lead forms and a website chat widget."],
  ["Code2", "REST API & Webhooks", "Send messages and sync contacts from your own apps and CRMs."],
  ["Palette", "White-label", "Your brand, logo and colours — for every client workspace."],
  ["ShieldCheck", "Official Cloud API", "Built on Meta's official WhatsApp Business Cloud API — no ban risk."],
];

export default async function Home() {
  const [b, plans] = await Promise.all([getSetting("branding"), prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }).catch(() => [])]);
  const Ic = ({ n, s = 22 }: { n: keyof typeof I; s?: number }) => { const C = I[n] as React.ComponentType<{ size?: number }>; return <C size={s} />; };
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold">
            {b.logoUrl ? <img src={b.logoUrl} alt="" className="h-9 w-9 rounded-xl" /> : <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><I.MessageCircle size={20} /></span>}
            {b.appName}
          </Link>
          <nav className="hidden gap-7 text-sm font-medium text-slate-600 md:flex"><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#contact">Contact</a></nav>
          <div className="flex gap-2"><Link href="/login" className="btn-ghost">Login</Link><Link href="/signup" className="btn-primary">Start Free</Link></div>
        </div>
      </header>
      <section className="hero relative overflow-hidden text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full border-[80px] border-white/5" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><I.BadgeCheck size={14} /> Official WhatsApp Business API</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-6xl">Sell, support & automate on WhatsApp</h1>
            <p className="mt-5 max-w-xl text-lg text-emerald-50/90">{b.tagline}. Team inbox, broadcasts, chatbots, AI and CRM — one panel.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="btn bg-white px-6 py-3 text-emerald-700 hover:bg-emerald-50">Get started free <I.ArrowRight size={16} /></Link><a href="#features" className="btn border border-white/30 px-6 py-3 text-white hover:bg-white/10">See features</a></div>
            <div className="mt-8 flex gap-8 text-sm text-emerald-50/80"><div><b className="block text-2xl text-white">24×7</b>AI replies</div><div><b className="block text-2xl text-white">∞</b>Agents & numbers</div><div><b className="block text-2xl text-white">0%</b>Ban risk</div></div>
          </div>
          <div className="relative">
            <div className="card mx-auto max-w-sm overflow-hidden rounded-[2rem] border-8 border-slate-900 p-0 shadow-2xl">
              <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white"><div className="grid h-9 w-9 place-items-center rounded-full bg-white/20"><I.Store size={18} /></div><div><div className="text-sm font-semibold">{b.appName}</div><div className="text-[11px] text-emerald-100">online</div></div></div>
              <div className="chat-bg space-y-2 p-4 text-sm text-slate-800">
                <div className="ml-auto w-fit max-w-[80%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 shadow-sm">Hi, price list bhejo</div>
                <div className="w-fit max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">Namaste! 🙏 Please choose a category:</div>
                <div className="grid max-w-[85%] gap-1">{["Wedding Packages", "Corporate Events", "Talk to Agent"].map((t) => <div key={t} className="rounded-lg bg-white py-1.5 text-center text-[13px] font-medium text-sky-600 shadow-sm">{t}</div>)}</div>
                <div className="ml-auto w-fit rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 shadow-sm">Wedding Packages</div>
                <div className="w-fit max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">📄 Here is our 2026 wedding brochure. An expert will call you shortly!</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="mx-auto max-w-7xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center"><h2 className="text-3xl font-bold md:text-4xl">Everything you need on WhatsApp</h2><p className="mt-3 text-slate-500">One platform for marketing, sales and support teams.</p></div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([ic, t, d]) => (
            <div key={t} className="card p-6 transition hover:-translate-y-1 hover:shadow-lg"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Ic n={ic} /></div><h3 className="mt-4 font-semibold">{t}</h3><p className="mt-1.5 text-sm text-slate-500">{d}</p></div>
          ))}
        </div>
      </section>
      <section id="pricing" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="text-center"><h2 className="text-3xl font-bold md:text-4xl">Simple pricing</h2><p className="mt-3 text-slate-500">Meta conversation charges are billed from your wallet at cost.</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p, i) => (
              <div key={p.id} className={`card flex flex-col p-7 ${i === 2 ? "ring-2 ring-emerald-500" : ""}`}>
                {i === 2 && <span className="mb-3 w-fit rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white">Most popular</span>}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-2 text-4xl font-extrabold">₹{p.price.toLocaleString("en-IN")}<span className="text-base font-medium text-slate-400">/{p.durationDays}d</span></div>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">{((p.features as string[]) || []).map((f) => <li key={f} className="flex gap-2"><I.Check size={16} className="mt-0.5 text-emerald-600" />{f}</li>)}</ul>
                <Link href="/signup" className={`${i === 2 ? "btn-primary" : "btn-ghost"} mt-6`}>Choose {p.name}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="contact" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2">
        <div><h2 className="text-3xl font-bold">Talk to us</h2><p className="mt-3 text-slate-500">Want a demo, Meta verification help or a custom setup? Leave your details and our team will WhatsApp you.</p>
          <div className="mt-6 space-y-2 text-sm text-slate-600">{b.supportPhone && <div className="flex items-center gap-2"><I.Phone size={16} /> {b.supportPhone}</div>}<div className="flex items-center gap-2"><I.Mail size={16} /> {b.supportEmail}</div></div></div>
        <Inquiry />
      </section>
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">© {new Date().getFullYear()} {b.appName}. WhatsApp is a trademark of Meta Platforms, Inc.</footer>
    </div>
  );
}
