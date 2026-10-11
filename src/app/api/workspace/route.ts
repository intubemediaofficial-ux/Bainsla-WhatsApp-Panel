import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, json, requireOwner, requireWs } from "@/lib/api";

export const GET = handle(async () => {
  const s = await requireWs();
  const ws = await prisma.workspace.findUnique({ where: { id: s.wid }, include: { plan: true } });
  return json({ ...ws, aiApiKey: ws?.aiApiKey ? "••••" + ws.aiApiKey.slice(-4) : null, role: s.role });
});

export const PATCH = handle(async (req: NextRequest) => {
  const s = await requireOwner();
  const b = await body<Record<string, unknown>>(req);
  const data: Record<string, unknown> = {};
  for (const k of ["name", "brandName", "logoUrl", "primaryColor", "webhookUrl", "aiProvider", "aiModel", "aiPrompt"]) if (b[k] !== undefined) data[k] = b[k] || null;
  if (b.aiEnabled !== undefined) data.aiEnabled = !!b.aiEnabled;
  if (typeof b.aiApiKey === "string" && b.aiApiKey && !b.aiApiKey.startsWith("••••")) data.aiApiKey = b.aiApiKey;
  if (b.settings && typeof b.settings === "object") {
    const cur = await prisma.workspace.findUnique({ where: { id: s.wid } });
    data.settings = { ...((cur?.settings as object) || {}), ...(b.settings as object) };
  }
  await prisma.workspace.update({ where: { id: s.wid }, data });
  await audit(s.wid, s.name, "workspace.update", Object.keys(data).join(","));
  return json({ ok: true });
});
