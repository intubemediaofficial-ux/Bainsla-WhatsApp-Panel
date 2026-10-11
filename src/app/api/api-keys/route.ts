import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { audit, body, handle, hashKey, json, requireOwner } from "@/lib/api";

export const GET = handle(async () => {
  const s = await requireOwner();
  return json({ items: await prisma.apiKey.findMany({ where: { workspaceId: s.wid }, select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true }, orderBy: { createdAt: "desc" } }) });
});

export const POST = handle(async (req: NextRequest) => {
  const s = await requireOwner();
  const { name } = await body<{ name?: string }>(req);
  const key = `bwk_${randomBytes(24).toString("hex")}`;
  await prisma.apiKey.create({ data: { workspaceId: s.wid, name: name || "API key", prefix: key.slice(0, 10), keyHash: hashKey(key) } });
  await audit(s.wid, s.name, "apikey.create", name || "");
  return json({ key }, 201);
});
