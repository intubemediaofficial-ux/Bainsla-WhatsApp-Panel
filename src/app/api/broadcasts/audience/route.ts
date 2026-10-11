import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { body, handle, json, requireWs } from "@/lib/api";
import { Audience, audienceWhere } from "../audience";

export const POST = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const a = await body<Audience>(req);
  if (a.type === "phones") return json({ count: (a.phones || "").split(/[\s,;]+/).filter((x) => x.replace(/\D/g, "").length >= 10).length });
  return json({ count: await prisma.contact.count({ where: await audienceWhere(s.wid, a) }) });
});
