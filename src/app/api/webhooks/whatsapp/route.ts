import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { handleWebhook } from "@/lib/inbound";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const token = p.get("hub.verify_token");
  const want = process.env.WA_VERIFY_TOKEN;
  const ok = p.get("hub.mode") === "subscribe" && token && (token === want || (await prisma.channel.findFirst({ where: { config: { path: ["verifyToken"], equals: token } } })));
  if (ok) return new NextResponse(p.get("hub.challenge") || "", { status: 200 });
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.META_APP_SECRET;
  if (secret) {
    const sig = req.headers.get("x-hub-signature-256") || "";
    const exp = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
    if (sig.length !== exp.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return new NextResponse("Bad signature", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }
  handleWebhook(payload as Parameters<typeof handleWebhook>[0]).catch((e) => console.error("webhook", e));
  return NextResponse.json({ ok: true });
}
