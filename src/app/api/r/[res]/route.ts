import { NextRequest } from "next/server";
import { handle, json, requireAdmin, requireWs, body, audit } from "@/lib/api";
import { beforeCreate, cleanInput, delegate, getDef } from "@/lib/resource-server";

async function scope(res: string) {
  const d = getDef(res);
  if (d.adminOnly || d.scope === "global") {
    const s = await requireAdmin();
    return { d, s, where: {} as Record<string, unknown>, wid: null as string | null };
  }
  const s = await requireWs();
  return { d, s, where: { workspaceId: s.wid } as Record<string, unknown>, wid: s.wid };
}

export const GET = handle(async (req: NextRequest, ctx) => {
  const { res } = await ctx.params;
  const { d, where } = await scope(res);
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
  const take = Math.min(200, Number(req.nextUrl.searchParams.get("take") || 50));
  const w = { ...where, ...(q && d.search?.length ? { OR: d.search.map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) } : {}) };
  const [items, total] = await Promise.all([
    delegate(d).findMany({ where: w, orderBy: d.orderBy || { createdAt: "desc" }, skip: (page - 1) * take, take }),
    delegate(d).count({ where: w }),
  ]);
  return json({ items, total, page, take });
});

export const POST = handle(async (req: NextRequest, ctx) => {
  const { res } = await ctx.params;
  const { d, s, wid } = await scope(res);
  if (d.readOnly || d.noCreate) return json({ error: "Not allowed" }, 405);
  let data = cleanInput(d, await body(req), true);
  data = await beforeCreate(res, data, wid);
  const item = await delegate(d).create({ data: wid ? { ...data, workspaceId: wid } : data });
  await audit(wid, s.name, `${res}.create`, String(data.name || data.title || data.subject || data.code || ""));
  return json(item, 201);
});
