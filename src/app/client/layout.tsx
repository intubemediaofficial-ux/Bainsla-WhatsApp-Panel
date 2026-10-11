import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, Wifi, WifiOff } from "lucide-react";
import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s?.wid) redirect("/login");
  const [ws, b, connected] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: s.wid } }),
    getSetting("branding"),
    prisma.channel.count({ where: { workspaceId: s.wid, status: "CONNECTED" } }),
  ]);
  if (!ws) redirect("/login");
  return (
    <Shell
      nav="client"
      user={{ name: s.name, email: s.email, role: s.role }}
      brand={{ name: ws.brandName || b.appName, logo: ws.logoUrl || b.logoUrl }}
      impersonating={!!s.imp}
      topRight={
        <>
          <Link href="/client/whatsapp" className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex ${connected ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />} {connected ? `${connected} number${connected > 1 ? "s" : ""} live` : "WhatsApp not connected"}
          </Link>
          <Link href="/client/billing" className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <Wallet size={14} /> ₹{Number(ws.wallet).toLocaleString("en-IN")}
          </Link>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 lg:inline">{ws.name}</span>
        </>
      }
    >
      {children}
    </Shell>
  );
}
