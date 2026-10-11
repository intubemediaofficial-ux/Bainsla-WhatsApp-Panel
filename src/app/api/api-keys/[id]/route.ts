import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, json, requireOwner } from "@/lib/api";

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const s = await requireOwner();
  const { id } = await ctx.params;
  await prisma.apiKey.deleteMany({ where: { id, workspaceId: s.wid } });
  return json({ ok: true });
});
