import { prisma } from "@/lib/db";
import { maskSecret } from "@/lib/secret";

export async function vendorDetail(id: string) {
  const ws = await prisma.workspace.findUnique({ where: { id }, include: { plan: true } });
  if (!ws) return null;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [users, channels, txns, payments, invoices, logs, counts] = await Promise.all([
    prisma.user.findMany({ where: { workspaceId: id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, phone: true, role: true, active: true, lastLoginAt: true, createdAt: true } }),
    prisma.channel.findMany({ where: { workspaceId: id }, orderBy: { createdAt: "asc" } }),
    prisma.walletTxn.findMany({ where: { workspaceId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.paymentRequest.findMany({ where: { workspaceId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.invoice.findMany({ where: { workspaceId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.auditLog.findMany({ where: { workspaceId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    Promise.all([
      prisma.contact.count({ where: { workspaceId: id } }),
      prisma.conversation.count({ where: { workspaceId: id } }),
      prisma.message.count({ where: { workspaceId: id } }),
      prisma.message.count({ where: { workspaceId: id, createdAt: { gte: monthStart } } }),
      prisma.broadcast.count({ where: { workspaceId: id } }),
      prisma.template.count({ where: { workspaceId: id } }),
      prisma.botFlow.count({ where: { workspaceId: id } }),
    ]),
  ]);
  const [contacts, conversations, messages, messagesMonth, broadcasts, templates, botFlows] = counts;
  return {
    ...ws,
    aiApiKey: maskSecret(ws.aiApiKey),
    users,
    channels: channels.map((c) => ({ ...c, accessToken: maskSecret(c.accessToken), appSecret: c.appSecret ? "••••" : null })),
    txns, payments, invoices, logs,
    usage: { contacts, conversations, messages, messagesMonth, broadcasts, templates, botFlows },
  };
}
