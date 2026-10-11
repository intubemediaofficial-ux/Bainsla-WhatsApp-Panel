import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireWs } from "@/lib/api";
import { checkLimit } from "@/lib/workspace";
import { Audience, audienceWhere, resolvePhones } from "./audience";

export const GET = handle(async () => {
  const s = await requireWs();
  return json({ items: await prisma.broadcast.findMany({ where: { workspaceId: s.wid }, orderBy: { createdAt: "desc" }, take: 200 }) });
});

export const POST = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const b = await body<{ name: string; templateId: string; variables?: object; audience: Audience; scheduledAt?: string; channelId?: string; delayMs?: number }>(req);
  const t = await prisma.template.findFirst({ where: { id: b.templateId, workspaceId: s.wid } });
  if (!t) throw new HttpError(400, "Choose a template");
  if (t.status !== "APPROVED") throw new HttpError(400, "Template is not approved by Meta yet");
  await checkLimit(s.wid, "broadcastsPerMonth");
  const contacts = b.audience.type === "phones" ? await resolvePhones(s.wid, b.audience.phones || "") : await prisma.contact.findMany({ where: await audienceWhere(s.wid, b.audience), select: { id: true, phone: true, name: true } });
  if (!contacts.length) throw new HttpError(400, "Audience is empty");
  const sched = b.scheduledAt ? new Date(b.scheduledAt) : null;
  const bc = await prisma.broadcast.create({
    data: {
      workspaceId: s.wid, name: b.name || t.name, templateId: t.id, templateName: t.name, language: t.language, channelId: b.channelId || t.channelId,
      variables: b.variables || {}, audience: b.audience as object, status: sched && sched > new Date() ? "SCHEDULED" : "RUNNING", scheduledAt: sched, startedAt: sched && sched > new Date() ? null : new Date(),
      delayMs: Math.max(100, b.delayMs || 300), total: contacts.length,
    },
  });
  for (let i = 0; i < contacts.length; i += 1000)
    await prisma.broadcastRecipient.createMany({ data: contacts.slice(i, i + 1000).map((c) => ({ broadcastId: bc.id, contactId: c.id, phone: c.phone, name: c.name })) });
  await audit(s.wid, s.name, "broadcast.create", `${bc.name} → ${contacts.length}`);
  return json(bc, 201);
});
