import { NextRequest } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { audit, handle, HttpError, json, requireWs } from "@/lib/api";
import { isValidPhone, normalizePhone } from "@/lib/phone";

export const POST = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const fd = await req.formData();
  const f = fd.get("file");
  if (!(f instanceof File)) throw new HttpError(400, "CSV file required");
  const extraTag = String(fd.get("tag") || "").trim();
  const ws = await prisma.workspace.findUnique({ where: { id: s.wid }, include: { plan: true } });
  const cc = (ws?.settings as { defaultCountryCode?: string })?.defaultCountryCode || "91";
  const limit = ((ws?.plan?.limits as { contacts?: number }) || {}).contacts ?? -1;
  let existingCount = await prisma.contact.count({ where: { workspaceId: s.wid } });
  const rows = Papa.parse<Record<string, string>>(await f.text(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() }).data;
  let created = 0, updated = 0, failed = 0;
  for (const r of rows) {
    const phone = normalizePhone(r.phone || r.mobile || r.number || r.whatsapp || "", cc);
    if (!isValidPhone(phone)) { failed++; continue; }
    const tags = (r.tags || r.labels || "").split(/[;,]/).map((t) => t.trim()).filter(Boolean);
    if (extraTag) tags.push(extraTag);
    const custom: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) if (!["phone", "mobile", "number", "whatsapp", "name", "email", "tags", "labels"].includes(k) && v) custom[k] = v;
    const ex = await prisma.contact.findUnique({ where: { workspaceId_phone: { workspaceId: s.wid, phone } } });
    if (ex) {
      await prisma.contact.update({ where: { id: ex.id }, data: { name: r.name || ex.name, email: r.email || ex.email, tags: Array.from(new Set([...ex.tags, ...tags])), customFields: { ...(ex.customFields as object), ...custom } } });
      updated++;
    } else {
      if (limit >= 0 && existingCount >= limit) { failed++; continue; }
      await prisma.contact.create({ data: { workspaceId: s.wid, phone, name: r.name || null, email: r.email || null, tags, customFields: custom, source: "import" } });
      existingCount++;
      created++;
    }
  }
  await prisma.importLog.create({ data: { workspaceId: s.wid, fileName: f.name, total: rows.length, created, updated, failed } });
  await audit(s.wid, s.name, "contact.import", `${f.name}: +${created} ~${updated} x${failed}`);
  return json({ total: rows.length, created, updated, failed });
});
