import { prisma } from "@/lib/db";
import { handle, json, requireWs } from "@/lib/api";

export const GET = handle(async () => {
  await requireWs();
  return json({ items: await prisma.announcement.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, take: 3 }) });
});
