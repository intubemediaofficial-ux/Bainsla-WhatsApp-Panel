import { NextRequest } from "next/server";
import { handle, json, requireAdmin, requireWs, body, audit, HttpError } from "@/lib/api";
import { cleanInput, delegate, getDef } from "@/lib/resource-server";

async function scoped(res: string, id: string) {
  const d = getDef(res);
  let wid: string | null = null;
  let name = "";
  if (d.adminOnly || d.scope === "global") name = (await requireAdmin()).name;
  else {
    const s = await requireWs();
    wid = s.wid;
    name = s.name;
  }
  const row = await delegate(d).findFirst({ where: wid ? { id, workspaceId: wid } : { id } });
  if (!row) throw new HttpError(404, "Not found");
  return { d, wid, name };
}

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const { res, id } = await ctx.params;
  const { d, wid, name } = await scoped(res, id);
  if (d.readOnly) return json({ error: "Read only" }, 405);
  const data = cleanInput(d, await body(req), false);
  if (res === "admin-support" && data.reply) data.status = data.status || "ANSWERED";
  const item = await delegate(d).update({ where: { id }, data });
  await audit(wid, name, `${res}.update`, id);
  return json(item);
});

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const { res, id } = await ctx.params;
  const { d, wid, name } = await scoped(res, id);
  if (d.readOnly) return json({ error: "Read only" }, 405);
  await delegate(d).delete({ where: { id } });
  await audit(wid, name, `${res}.delete`, id);
  return json({ ok: true });
});
