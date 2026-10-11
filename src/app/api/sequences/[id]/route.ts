import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireWs } from "@/lib/api";
import { pick } from "../pick";

export const GET = handle(async (_req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  const item = await prisma.sequence.findFirst({ where: { id, workspaceId: s.wid } });
  if (!item) throw new HttpError(404, "Not found");
  return json(item);
});

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  if (!(await prisma.sequence.findFirst({ where: { id, workspaceId: s.wid } }))) throw new HttpError(404, "Not found");
  return json(await prisma.sequence.update({ where: { id }, data: pick(await body(req)) }));
});

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const s = await requireWs();
  const { id } = await ctx.params;
  await prisma.sequence.deleteMany({ where: { id, workspaceId: s.wid } });
  await audit(s.wid, s.name, "sequences.delete", id);
  return json({ ok: true });
});
