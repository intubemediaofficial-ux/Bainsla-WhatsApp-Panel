import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { audit, body, handle, HttpError, json, requireOwner, requireWs } from "@/lib/api";
import { fetchPhoneInfo } from "@/lib/wa";
import { checkLimit } from "@/lib/workspace";

const safe = <T extends { accessToken?: string | null; appSecret?: string | null }>(c: T) => ({ ...c, accessToken: c.accessToken ? "••••" + c.accessToken.slice(-4) : null, appSecret: c.appSecret ? "••••" : null });

export const GET = handle(async () => {
  const s = await requireWs();
  const items = await prisma.channel.findMany({ where: { workspaceId: s.wid }, orderBy: { createdAt: "asc" } });
  return json({ items: items.map(safe), webhookUrl: `${process.env.APP_URL || ""}/api/webhooks/whatsapp`, globalVerify: !!process.env.WA_VERIFY_TOKEN });
});

export const POST = handle(async (req: NextRequest) => {
  const s = await requireOwner();
  const b = await body<{ name?: string; phoneNumberId: string; wabaId: string; accessToken: string }>(req);
  if (!b.phoneNumberId || !b.wabaId || !b.accessToken) throw new HttpError(400, "Phone Number ID, WABA ID and Access Token are required");
  if (await prisma.channel.findUnique({ where: { phoneNumberId: b.phoneNumberId.trim() } })) throw new HttpError(409, "This number is already connected");
  await checkLimit(s.wid, "numbers");
  const draft = { phoneNumberId: b.phoneNumberId.trim(), wabaId: b.wabaId.trim(), accessToken: b.accessToken.trim() };
  let info: Awaited<ReturnType<typeof fetchPhoneInfo>>;
  try {
    info = await fetchPhoneInfo(draft as never);
  } catch (e) {
    throw new HttpError(400, `Meta rejected the credentials: ${(e as Error).message}`);
  }
  const count = await prisma.channel.count({ where: { workspaceId: s.wid } });
  const ch = await prisma.channel.create({
    data: {
      workspaceId: s.wid, ...draft, name: b.name || info.verified_name || "WhatsApp", displayPhone: info.display_phone_number, verifiedName: info.verified_name,
      quality: info.quality_rating, status: "CONNECTED", isDefault: count === 0, config: { verifyToken: randomBytes(12).toString("hex") },
    },
  });
  await audit(s.wid, s.name, "channel.connect", ch.displayPhone || "");
  return json(safe(ch), 201);
});
