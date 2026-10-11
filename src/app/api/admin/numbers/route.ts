import { prisma } from "@/lib/db";
import { handle, json, requireAdmin } from "@/lib/api";

export const GET = handle(async () => {
  await requireAdmin();
  const items = await prisma.channel.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, displayPhone: true, verifiedName: true, phoneNumberId: true, wabaId: true, quality: true, status: true, isDefault: true, createdAt: true, workspace: { select: { id: true, name: true, status: true } } },
  });
  return json({ items });
});
