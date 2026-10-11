import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const l = await prisma.trackedLink.findUnique({ where: { slug } });
  if (!l) return new NextResponse("Link not found", { status: 404 });
  await prisma.trackedLink.update({ where: { id: l.id }, data: { clicks: { increment: 1 } } });
  const msg = [l.message, `[ref:${l.slug}]`].filter(Boolean).join(" ");
  const to = l.targetUrl || `https://wa.me/${(l.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
  return NextResponse.redirect(to, 302);
}
