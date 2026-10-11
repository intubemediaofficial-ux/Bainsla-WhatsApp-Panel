import * as I from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHero } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function System() {
  const [db, users, ws, msgs, pendingB, enroll] = await Promise.all([
    prisma.$queryRaw<{ v: string }[]>`select version() as v`.then((r) => r[0]?.v.split(" ").slice(0, 2).join(" ")).catch(() => "unreachable"),
    prisma.user.count(), prisma.workspace.count(), prisma.message.count(),
    prisma.broadcast.count({ where: { status: { in: ["RUNNING", "SCHEDULED"] } } }),
    prisma.sequenceEnrollment.count({ where: { status: "ACTIVE" } }),
  ]);
  const env = [["APP_URL", !!process.env.APP_URL], ["WA_VERIFY_TOKEN", !!process.env.WA_VERIFY_TOKEN], ["META_APP_SECRET", !!process.env.META_APP_SECRET], ["JWT_SECRET", !!process.env.JWT_SECRET], ["OPENAI_API_KEY", !!process.env.OPENAI_API_KEY]] as const;
  const rows: [string, string | number][] = [["Node.js", process.version], ["Database", db], ["Uptime", `${Math.round(process.uptime() / 60)} min`], ["Memory (RSS)", `${Math.round(process.memoryUsage().rss / 1048576)} MB`], ["Users", users], ["Workspaces", ws], ["Messages stored", msgs], ["Active/scheduled broadcasts", pendingB], ["Active drip enrollments", enroll], ["Background worker", process.env.DISABLE_WORKER === "1" ? "disabled" : "running (15s tick)"]];
  return (
    <div>
      <PageHero title="System Health" subtitle="Server, database, worker and configuration status" icon={<I.Activity />} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card divide-y divide-slate-100 p-2">{rows.map(([k, v]) => <div key={k} className="flex justify-between px-3 py-2.5 text-sm"><span className="text-slate-500">{k}</span><b>{v}</b></div>)}</div>
        <div className="card divide-y divide-slate-100 p-2">{env.map(([k, ok]) => <div key={k} className="flex items-center justify-between px-3 py-2.5 text-sm"><code>{k}</code>{ok ? <span className="flex items-center gap-1 text-emerald-600"><I.CheckCircle2 size={15} /> set</span> : <span className="flex items-center gap-1 text-amber-600"><I.AlertTriangle size={15} /> not set</span>}</div>)}</div>
      </div>
    </div>
  );
}
