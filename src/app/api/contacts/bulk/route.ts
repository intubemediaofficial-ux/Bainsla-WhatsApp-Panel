import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, json, requireWs } from "@/lib/api";

export const POST = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const b = await body<{ ids: string[]; action: "addTag" | "removeTag" | "delete" | "setStage" | "optOut" | "optIn"; value?: string }>(req);
  const where = { workspaceId: s.wid, id: { in: b.ids || [] } };
  let n = 0;
  if (b.action === "delete") n = (await prisma.contact.deleteMany({ where })).count;
  else if (b.action === "setStage") n = (await prisma.contact.updateMany({ where, data: { stage: b.value || null } })).count;
  else if (b.action === "optOut" || b.action === "optIn") n = (await prisma.contact.updateMany({ where, data: { optedOut: b.action === "optOut" } })).count;
  else {
    const list = await prisma.contact.findMany({ where, select: { id: true, tags: true } });
    for (const c of list) {
      const tags = b.action === "addTag" ? Array.from(new Set([...c.tags, b.value!])) : c.tags.filter((t) => t !== b.value);
      await prisma.contact.update({ where: { id: c.id }, data: { tags } });
    }
    n = list.length;
  }
  await audit(s.wid, s.name, `contact.bulk.${b.action}`, `${n} contacts`);
  return json({ ok: true, count: n });
});
