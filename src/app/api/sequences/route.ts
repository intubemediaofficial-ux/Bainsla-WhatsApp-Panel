import { pick } from "./pick";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, json, requireWs } from "@/lib/api";


export const GET = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const kind = req.nextUrl.searchParams.get("kind");
  return json({ items: await prisma.sequence.findMany({ where: { workspaceId: s.wid, ...(kind ? { kind } : {}) }, orderBy: { createdAt: "desc" } }) });
});

export const POST = handle(async (req: NextRequest) => {
  const s = await requireWs();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = await body<any>(req);
  const item = await prisma.sequence.create({ data: { ...pick(b), workspaceId: s.wid } });
  await audit(s.wid, s.name, "sequences.create", item.name);
  return json(item, 201);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
