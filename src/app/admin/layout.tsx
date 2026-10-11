import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s || s.role !== "SUPER_ADMIN") redirect("/login");
  const b = await getSetting("branding");
  return (
    <Shell nav="admin" user={{ name: s.name, email: s.email, role: s.role }} brand={{ name: b.appName, logo: b.logoUrl }}
      topRight={<span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Super Admin</span>}>
      {children}
    </Shell>
  );
}
