import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { body, handle, HttpError, json } from "@/lib/api";

export const POST = handle(async (req: NextRequest) => {
  const b = await body<{ name: string; phone: string; email?: string; message?: string }>(req);
  if (!b.name || !b.phone) throw new HttpError(400, "Name and phone required");
  await prisma.inquiry.create({ data: { name: b.name.slice(0, 120), phone: b.phone.slice(0, 20), email: b.email?.slice(0, 120), message: b.message?.slice(0, 2000) || "" } });
  return json({ ok: true });
});
