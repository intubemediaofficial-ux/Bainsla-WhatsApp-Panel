import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, json, requireAdmin } from "@/lib/api";

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin();
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const items = await prisma.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {},
    orderBy: { createdAt: "desc" }, take: 500,
    select: { id: true, name: true, email: true, phone: true, role: true, active: true, lastLoginAt: true, createdAt: true, workspace: { select: { id: true, name: true, status: true } } },
  });
  return json({ items });
});
