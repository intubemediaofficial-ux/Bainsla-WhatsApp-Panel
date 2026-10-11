import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireOwner } from "@/lib/api";
import { fetchPhoneInfo } from "@/lib/wa";

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const s = await requireOwner();
  const { id } = await ctx.params;
  const ch = await prisma.channel.findFirst({ where: { id, workspaceId: s.wid } });
  if (!ch) throw new HttpError(404, "Not found");
  const b = await body<{ action?: "refresh" | "default"; name?: string; accessToken?: string }>(req);
  if (b.action === "default") {
    await prisma.channel.updateMany({ where: { workspaceId: s.wid }, data: { isDefault: false } });
    await prisma.channel.update({ where: { id }, data: { isDefault: true } });
    return json({ ok: true });
  }
  const data: Record<string, unknown> = {};
  if (b.name) data.name = b.name;
  if (b.accessToken) data.accessToken = b.accessToken.trim();
  try {
    const info = await fetchPhoneInfo({ ...ch, ...data } as never);
    Object.assign(data, { displayPhone: info.display_phone_number, verifiedName: info.verified_name, quality: info.quality_rating, status: "CONNECTED" });
  } catch (e) {
    data.status = "ERROR";
    data.config = { ...(ch.config as object), lastError: (e as Error).message };
  }
  await prisma.channel.update({ where: { id }, data });
  return json({ ok: true, status: data.status });
});

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const s = await requireOwner();
  const { id } = await ctx.params;
  await prisma.channel.deleteMany({ where: { id, workspaceId: s.wid } });
  await audit(s.wid, s.name, "channel.delete", id);
  return json({ ok: true });
});
