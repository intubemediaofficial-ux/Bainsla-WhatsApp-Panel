import { randomBytes } from "crypto";
import { prisma } from "./db";

export async function createWorkspace(name: string) {
  const plan = (await prisma.plan.findFirst({ where: { isDefault: true, active: true } })) || (await prisma.plan.findFirst({ where: { active: true }, orderBy: { price: "asc" } }));
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "ws";
  const ws = await prisma.workspace.create({
    data: {
      name,
      slug: `${base}-${randomBytes(2).toString("hex")}`,
      planId: plan?.id,
      planExpiresAt: plan ? new Date(Date.now() + plan.durationDays * 86400000) : null,
      webhookSecret: randomBytes(16).toString("hex"),
      settings: { defaultCountryCode: "91", optOutReply: "You have been unsubscribed. Reply START to subscribe again." },
    },
  });
  await prisma.stage.createMany({
    data: ["New", "Contacted", "Interested", "Negotiation", "Won", "Lost"].map((n, i) => ({ workspaceId: ws.id, name: n, sortOrder: i, color: ["#64748b", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"][i] })),
  });
  return ws;
}

type Limits = { contacts?: number; agents?: number; numbers?: number; broadcastsPerMonth?: number; botFlows?: number };

export async function checkLimit(workspaceId: string, key: keyof Limits) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, include: { plan: true } });
  const lim = ((ws?.plan?.limits as Limits) || {})[key];
  if (lim === undefined || lim === null || lim < 0) return;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const count =
    key === "contacts" ? await prisma.contact.count({ where: { workspaceId } })
    : key === "agents" ? await prisma.user.count({ where: { workspaceId, role: "AGENT" } })
    : key === "numbers" ? await prisma.channel.count({ where: { workspaceId } })
    : key === "botFlows" ? await prisma.botFlow.count({ where: { workspaceId } })
    : await prisma.broadcast.count({ where: { workspaceId, createdAt: { gte: monthStart } } });
  if (count >= lim) {
    const { HttpError } = await import("./api");
    throw new HttpError(402, `Plan limit reached (${key}: ${lim}). Upgrade your plan from Subscription & Plans.`);
  }
}
