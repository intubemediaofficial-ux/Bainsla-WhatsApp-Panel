import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { body, handle, json } from "@/lib/api";
import { createWorkspace } from "@/lib/workspace";

const S = z.object({ name: z.string().min(2), business: z.string().min(2), email: z.string().email(), phone: z.string().optional(), password: z.string().min(6) });

export const POST = handle(async (req: NextRequest) => {
  const d = S.parse(await body(req));
  const email = d.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) return json({ error: "Email already registered — please login" }, 409);
  const ws = await createWorkspace(d.business);
  const user = await prisma.user.create({
    data: { email, name: d.name, phone: d.phone, passwordHash: await bcrypt.hash(d.password, 10), role: "OWNER", workspaceId: ws.id },
  });
  await setSession({ uid: user.id, role: "OWNER", wid: ws.id, name: user.name, email });
  return json({ ok: true, redirect: "/client/dashboard" });
});
