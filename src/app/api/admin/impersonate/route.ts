import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireAdmin } from "@/lib/api";
import { getSession, setSession } from "@/lib/auth";

export const POST = handle(async (req: NextRequest) => {
  const s = await requireAdmin();
  const { workspaceId } = await body<{ workspaceId: string }>(req);
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) throw new HttpError(404, "Vendor not found");
  await setSession({ uid: s.uid, role: "OWNER", wid: ws.id, name: `${s.name} (admin)`, email: s.email, imp: s.uid });
  await audit(ws.id, s.name, "admin.impersonate", ws.name);
  return json({ ok: true, redirect: "/client/dashboard" });
});

export const DELETE = handle(async () => {
  const s = await getSession();
  if (!s?.imp) throw new HttpError(400, "Not impersonating");
  const u = await prisma.user.findUnique({ where: { id: s.imp } });
  if (!u || u.role !== "SUPER_ADMIN") throw new HttpError(403, "Forbidden");
  await setSession({ uid: u.id, role: u.role, wid: null, name: u.name, email: u.email });
  return json({ ok: true });
});
