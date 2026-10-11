"use client";
import { ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import * as I from "lucide-react";

type Item = { label: string; href: string };
type Group = { label: string; icon: keyof typeof I; href?: string; items?: Item[] };

export const CLIENT_NAV: Group[] = [
  { label: "Dashboard", icon: "LayoutDashboard", href: "/client/dashboard" },
  { label: "Analytics", icon: "BarChart3", href: "/client/analytics" },
  { label: "Inbox", icon: "MessageCircle", href: "/client/chat" },
  { label: "Campaigns", icon: "Send", items: [
    { label: "Message Templates", href: "/client/templates" }, { label: "Broadcast", href: "/client/broadcasts" },
    { label: "Drip Campaigns", href: "/client/drip" }, { label: "Follow-up Sequences", href: "/client/sequence-campaigns" } ] },
  { label: "Contacts", icon: "Users", items: [
    { label: "Contact Directory", href: "/client/contacts" }, { label: "Segments", href: "/client/segments" }, { label: "Labels", href: "/client/tags" },
    { label: "Stage/Pipeline", href: "/client/stages" }, { label: "Custom Fields", href: "/client/custom-fields" }, { label: "Import Logs", href: "/client/import-logs" } ] },
  { label: "Pipeline Board", icon: "Kanban", href: "/client/pipelines" },
  { label: "Automation", icon: "Zap", items: [
    { label: "Bot Flow Builder", href: "/client/bot-flows" }, { label: "Keyword Triggers", href: "/client/keywords" }, { label: "Automations", href: "/client/automations" },
    { label: "Quick Replies", href: "/client/quick-replies" }, { label: "Appointments", href: "/client/appointments" }, { label: "Tickets", href: "/client/tickets" } ] },
  { label: "Leads & Commerce", icon: "ShoppingBag", items: [
    { label: "All Leads", href: "/client/leads" }, { label: "Lead Gen Forms", href: "/client/forms" }, { label: "Product Catalog", href: "/client/catalogs" }, { label: "Order Management", href: "/client/orders" } ] },
  { label: "Channels", icon: "Plug", items: [{ label: "WhatsApp Numbers", href: "/client/whatsapp" }, { label: "Chat Widget", href: "/client/chat-widget" }] },
  { label: "AI", icon: "Bot", items: [{ label: "AI Settings", href: "/client/ai-settings" }, { label: "Knowledge Base", href: "/client/knowledge-base" }] },
  { label: "Settings", icon: "Settings", items: [
    { label: "Business Settings", href: "/client/settings" }, { label: "Teams & Agents", href: "/client/agents" }, { label: "API & Webhooks", href: "/client/integrations" }, { label: "Audit Log", href: "/client/audit-log" } ] },
  { label: "Subscription & Wallet", icon: "Wallet", items: [
    { label: "Plans", href: "/client/subscriptions" }, { label: "Wallet", href: "/client/billing" }, { label: "Transactions", href: "/client/transactions" }, { label: "Invoices", href: "/client/invoices" } ] },
  { label: "Media Library", icon: "Image", href: "/client/media-library" },
  { label: "Lead Source & QR", icon: "QrCode", href: "/client/tracked-links" },
  { label: "API Docs", icon: "Code2", href: "/client/api-docs" },
  { label: "Support", icon: "LifeBuoy", href: "/client/support" },
];

export const ADMIN_NAV: Group[] = [
  { label: "Dashboard", icon: "LayoutDashboard", href: "/admin/dashboard" },
  { label: "Vendors", icon: "Store", href: "/admin/vendors" },
  { label: "All Users", icon: "Users", href: "/admin/users" },
  { label: "WhatsApp Numbers", icon: "Phone", href: "/admin/numbers" },
  { label: "Payments", icon: "IndianRupee", href: "/admin/payments" },
  { label: "Plans", icon: "Layers", href: "/admin/plans" },
  { label: "Coupons", icon: "Ticket", href: "/admin/coupons" },
  { label: "Announcements", icon: "Megaphone", href: "/admin/announcements" },
  { label: "Inquiries", icon: "Mail", href: "/admin/inquiries" },
  { label: "Support Tickets", icon: "LifeBuoy", href: "/admin/support" },
  { label: "Platform Settings", icon: "Settings", href: "/admin/settings" },
  { label: "System Health", icon: "Activity", href: "/admin/system" },
  { label: "Audit Log", icon: "ScrollText", href: "/admin/audit" },
];

function Icon({ name, size = 18 }: { name: keyof typeof I; size?: number }) {
  const C = I[name] as React.ComponentType<{ size?: number }>;
  return C ? <C size={size} /> : null;
}

export default function Shell({ nav, user, brand, children, topRight, impersonating }: {
  nav: "client" | "admin"; user: { name: string; email: string; role: string }; brand: { name: string; logo?: string | null };
  children: ReactNode; topRight?: ReactNode; impersonating?: boolean;
}) {
  const groups = nav === "admin" ? ADMIN_NAV : CLIENT_NAV;
  const path = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mobile, setMobile] = useState(false);
  const activeGroup = groups.find((g) => g.items?.some((i) => path.startsWith(i.href)))?.label;
  const [open, setOpen] = useState<string | undefined>(activeGroup);
  const filtered = useMemo(() => {
    if (!q) return groups;
    const s = q.toLowerCase();
    return groups
      .map((g) => ({ ...g, items: g.items?.filter((i) => i.label.toLowerCase().includes(s)) }))
      .filter((g) => g.label.toLowerCase().includes(s) || g.items?.length);
  }, [q, groups]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  async function stopImp() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    window.location.href = "/admin/vendors";
  }

  const side = (
    <aside className="flex h-full w-[260px] flex-col border-r border-slate-200 bg-white">
      <Link href={nav === "admin" ? "/admin/dashboard" : "/client/dashboard"} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        {brand.logo ? <img src={brand.logo} alt="" className="h-9 w-9 rounded-xl object-cover" /> : (
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow"><I.MessageCircle size={20} /></div>
        )}
        <div className="leading-tight">
          <div className="font-bold text-slate-900">{brand.name}</div>
          <div className="text-[11px] font-medium text-emerald-600">{nav === "admin" ? "Super Admin" : "WhatsApp Business API"}</div>
        </div>
      </Link>
      <div className="px-3 py-3">
        <div className="relative">
          <I.Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menu…" className="input rounded-full py-1.5 pl-9" />
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 scroll-thin">
        {filtered.map((g) => {
          const active = g.href ? path.startsWith(g.href) : g.label === activeGroup;
          const isOpen = !!q || open === g.label;
          if (g.href)
            return (
              <Link key={g.label} href={g.href} onClick={() => setMobile(false)} className={clsx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition", active ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50")}>
                <Icon name={g.icon} /> {g.label}
              </Link>
            );
          return (
            <div key={g.label}>
              <button onClick={() => setOpen(isOpen ? undefined : g.label)} className={clsx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition", active ? "text-emerald-700" : "text-slate-700 hover:bg-slate-50")}>
                <Icon name={g.icon} /> <span className="flex-1 text-left">{g.label}</span>
                <I.ChevronRight size={15} className={clsx("text-slate-400 transition", isOpen && "rotate-90")} />
              </button>
              {isOpen && (
                <div className="mb-1 ml-5 border-l border-slate-200 pl-3">
                  {g.items!.map((i) => (
                    <Link key={i.href} href={i.href} onClick={() => setMobile(false)} className={clsx("block rounded-lg px-3 py-1.5 text-[13px] font-medium transition", path.startsWith(i.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:text-slate-800")}>
                      {i.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">{user.name[0]?.toUpperCase()}</div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{user.name}</div>
          <div className="truncate text-[11px] text-slate-400">{user.email}</div>
        </div>
        <button onClick={logout} title="Logout" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"><I.LogOut size={17} /></button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:block">{side}</div>
      {mobile && <div className="fixed inset-0 z-40 flex md:hidden" onClick={() => setMobile(false)}><div onClick={(e) => e.stopPropagation()}>{side}</div><div className="flex-1 bg-black/30" /></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        {impersonating && (
          <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-1.5 text-sm font-medium text-white">
            Viewing as vendor (admin login) <button onClick={stopImp} className="rounded-md bg-white/20 px-2 py-0.5 hover:bg-white/30">Back to admin</button>
          </div>
        )}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur md:px-6">
          <button className="rounded-lg p-2 hover:bg-slate-100 md:hidden" onClick={() => setMobile(true)}><I.Menu size={20} /></button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <I.Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input placeholder="Search contacts…" className="input rounded-full py-1.5 pl-9" onKeyDown={(e) => { if (e.key === "Enter" && nav === "client") router.push(`/client/contacts?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`); }} />
          </div>
          <div className="ml-auto flex items-center gap-2">{topRight}</div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 scroll-thin md:p-6">{children}</main>
      </div>
    </div>
  );
}
