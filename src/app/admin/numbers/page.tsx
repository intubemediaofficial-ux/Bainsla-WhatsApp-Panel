"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import * as I from "lucide-react";
import { api, Badge, fmtDate, PageHero, Spinner, Stat, statusTone } from "@/components/ui";

type N = { id: string; name: string; displayPhone?: string; verifiedName?: string; phoneNumberId?: string; wabaId?: string; quality?: string; status: string; isDefault: boolean; createdAt: string; workspace: { id: string; name: string; status: string } };

export default function AdminNumbers() {
  const [items, setItems] = useState<N[] | null>(null);
  useEffect(() => { api<{ items: N[] }>("/api/admin/numbers").then((r) => setItems(r.items)); }, []);
  const by = (s: string) => items?.filter((n) => n.status === s).length ?? 0;
  return (
    <div className="space-y-6">
      <PageHero title="WhatsApp Numbers" subtitle="Every WhatsApp Business number connected on the platform, with health and quality" icon={<I.Phone />} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total numbers" value={items?.length ?? "—"} icon={<I.Phone />} />
        <Stat label="Connected" value={by("CONNECTED")} icon={<I.CheckCircle2 />} tone="sky" />
        <Stat label="Needs attention" value={(items?.length ?? 0) - by("CONNECTED")} icon={<I.AlertTriangle />} tone="amber" />
      </div>
      <div className="card overflow-hidden">
        {!items ? <div className="flex justify-center py-10"><Spinner /></div> : items.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No vendor has connected a WhatsApp number yet</div> : (
          <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50/70"><tr>{["Number", "Vendor", "Phone Number ID / WABA ID", "Quality", "Status", "Connected"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{items.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50/60">
                <td className="td"><div className="font-semibold">{n.displayPhone || n.name}</div><div className="text-xs text-slate-500">{n.verifiedName || n.name}</div></td>
                <td className="td"><Link href={`/admin/vendors/${n.workspace.id}`} className="hover:text-emerald-700 hover:underline">{n.workspace.name}</Link></td>
                <td className="td font-mono text-[11px] text-slate-500"><div>{n.phoneNumberId}</div><div>{n.wabaId}</div></td>
                <td className="td">{n.quality ? <Badge tone={n.quality === "GREEN" ? "emerald" : n.quality === "YELLOW" ? "amber" : "rose"}>{n.quality}</Badge> : "—"}</td>
                <td className="td"><Badge tone={statusTone(n.status)}>{n.status}</Badge></td>
                <td className="td text-xs">{fmtDate(n.createdAt)}</td>
              </tr>))}</tbody></table></div>
        )}
      </div>
    </div>
  );
}
