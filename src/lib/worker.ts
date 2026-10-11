import { prisma } from "./db";
import { sendToContact, sendText } from "./messaging";
import { buildTemplateComponents, templatePayload, renderTemplateText, TemplateVars } from "./wa";
import { getSetting, wsSettings } from "./settings";

const g = globalThis as unknown as { __worker?: boolean; __busy?: Set<string> };
const busy = (g.__busy ??= new Set());
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function startWorker() {
  if (g.__worker) return;
  g.__worker = true;
  console.log("[worker] started");
  setInterval(() => tick().catch((e) => console.error("[worker]", e)), 15000);
  setTimeout(() => tick().catch(() => {}), 3000);
}

async function tick() {
  const now = new Date();
  await prisma.broadcast.updateMany({ where: { status: "SCHEDULED", scheduledAt: { lte: now } }, data: { status: "RUNNING", startedAt: now } });
  const running = await prisma.broadcast.findMany({ where: { status: "RUNNING" } });
  for (const b of running) if (!busy.has(b.id)) runBroadcast(b.id).catch((e) => console.error("[broadcast]", e));
  await runSequences();
  await runReminders();
  await runDaily();
}

export async function runBroadcast(id: string) {
  if (busy.has(id)) return;
  busy.add(id);
  try {
    const b = await prisma.broadcast.findUnique({ where: { id } });
    if (!b || b.status !== "RUNNING") return;
    const tpl = b.templateId ? await prisma.template.findUnique({ where: { id: b.templateId } }) : null;
    if (!tpl) {
      await prisma.broadcast.update({ where: { id }, data: { status: "FAILED", completedAt: new Date() } });
      return;
    }
    const pricing = await getSetting("pricing");
    const unit = pricing.enabled ? Number(pricing[(tpl.category.toLowerCase() as "marketing") || "marketing"] ?? pricing.marketing) || 0 : 0;
    for (;;) {
      const fresh = await prisma.broadcast.findUnique({ where: { id }, select: { status: true } });
      if (fresh?.status !== "RUNNING") return;
      const batch = await prisma.broadcastRecipient.findMany({ where: { broadcastId: id, status: "PENDING" }, take: 50 });
      if (!batch.length) break;
      for (const r of batch) {
        const contact = await prisma.contact.findUnique({ where: { id: r.contactId } });
        if (!contact || contact.optedOut) {
          await prisma.broadcastRecipient.update({ where: { id: r.id }, data: { status: "SKIPPED", error: contact ? "Opted out" : "Contact deleted" } });
          continue;
        }
        if (unit > 0) {
          const ws = await prisma.workspace.findUnique({ where: { id: b.workspaceId }, select: { wallet: true } });
          if (Number(ws?.wallet || 0) < unit) {
            await prisma.broadcast.update({ where: { id }, data: { status: "PAUSED" } });
            await prisma.auditLog.create({ data: { workspaceId: b.workspaceId, action: "broadcast.paused", detail: `${b.name}: wallet balance low` } });
            return;
          }
        }
        const vars = (b.variables || {}) as TemplateVars;
        const payload = templatePayload(tpl.name, tpl.language, buildTemplateComponents(tpl.components, vars, contact));
        const { message, error } = await sendToContact(
          contact,
          payload,
          { type: "template", body: renderTemplateText(tpl.components, vars, contact), sentBy: `Broadcast: ${b.name}`, broadcastId: b.id },
          { channelId: b.channelId },
        );
        if (error) {
          await prisma.broadcastRecipient.update({ where: { id: r.id }, data: { status: "FAILED", error } });
          await prisma.broadcast.update({ where: { id }, data: { failed: { increment: 1 } } });
        } else {
          await prisma.broadcastRecipient.update({ where: { id: r.id }, data: { status: "SENT", waMessageId: message.waMessageId, sentAt: new Date() } });
          await prisma.broadcast.update({ where: { id }, data: { sent: { increment: 1 }, cost: { increment: unit } } });
          if (unit > 0) {
            await prisma.workspace.update({ where: { id: b.workspaceId }, data: { wallet: { decrement: unit } } });
          }
        }
        if (b.delayMs) await sleep(b.delayMs);
      }
    }
    const done = await prisma.broadcast.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
    if (Number(done.cost) > 0)
      await prisma.walletTxn.create({ data: { workspaceId: b.workspaceId, amount: done.cost, type: "DEBIT", description: `Broadcast: ${b.name} (${done.sent} msgs)`, ref: b.id } });
  } finally {
    busy.delete(id);
  }
}

type Step = { delayMinutes: number; type: "text" | "template"; text?: string; templateId?: string; vars?: TemplateVars };

async function runSequences() {
  const due = await prisma.sequenceEnrollment.findMany({ where: { status: "ACTIVE", nextRunAt: { lte: new Date() } }, take: 100, include: { sequence: true } });
  for (const e of due) {
    const steps = (e.sequence.steps as Step[]) || [];
    const step = steps[e.stepIndex];
    const contact = await prisma.contact.findUnique({ where: { id: e.contactId } });
    if (!step || !contact || contact.optedOut || !e.sequence.active) {
      await prisma.sequenceEnrollment.update({ where: { id: e.id }, data: { status: step ? "STOPPED" : "COMPLETED" } });
      continue;
    }
    if (step.type === "template" && step.templateId) {
      const t = await prisma.template.findUnique({ where: { id: step.templateId } });
      if (t)
        await sendToContact(contact, templatePayload(t.name, t.language, buildTemplateComponents(t.components, step.vars || {}, contact)), {
          type: "template",
          body: renderTemplateText(t.components, step.vars || {}, contact),
          sentBy: `Sequence: ${e.sequence.name}`,
        });
    } else if (step.text) {
      await sendText(contact, step.text.replace(/\{\{\s*name\s*\}\}/gi, contact.name || ""), `Sequence: ${e.sequence.name}`);
    }
    const next = steps[e.stepIndex + 1];
    await prisma.sequenceEnrollment.update({
      where: { id: e.id },
      data: next
        ? { stepIndex: e.stepIndex + 1, nextRunAt: new Date(Date.now() + (Number(next.delayMinutes) || 0) * 60000) }
        : { stepIndex: e.stepIndex + 1, status: "COMPLETED" },
    });
  }
}

async function runReminders() {
  const soon = new Date(Date.now() + 60 * 60000);
  const appts = await prisma.appointment.findMany({ where: { reminderSent: false, status: "CONFIRMED", startsAt: { lte: soon, gte: new Date() } }, take: 50 });
  for (const a of appts) {
    const ws = await prisma.workspace.findUnique({ where: { id: a.workspaceId } });
    const contact = a.contactId ? await prisma.contact.findUnique({ where: { id: a.contactId } }) : await prisma.contact.findFirst({ where: { workspaceId: a.workspaceId, phone: a.phone } });
    await prisma.appointment.update({ where: { id: a.id }, data: { reminderSent: true } });
    if (!ws || !contact) continue;
    const when = a.startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
    const tpl = wsSettings(ws.settings).appointmentReminder || "Reminder: your appointment{{service}} is at {{time}}. Reply here if you need to reschedule.";
    await sendText(contact, tpl.replace("{{time}}", when).replace("{{service}}", a.service ? ` for ${a.service}` : "").replace(/\{\{\s*name\s*\}\}/gi, a.name), "Reminder");
  }
  const orders = await prisma.order.findMany({ where: { paymentStatus: "UNPAID", status: "PENDING", reminded: 0, createdAt: { lte: new Date(Date.now() - 60 * 60000) } }, take: 50 });
  for (const o of orders) {
    await prisma.order.update({ where: { id: o.id }, data: { reminded: 1 } });
    const ws = await prisma.workspace.findUnique({ where: { id: o.workspaceId } });
    const contact = o.contactId ? await prisma.contact.findUnique({ where: { id: o.contactId } }) : o.phone ? await prisma.contact.findFirst({ where: { workspaceId: o.workspaceId, phone: o.phone } }) : null;
    if (!ws || !contact) continue;
    const t = wsSettings(ws.settings).orderReminder;
    if (t) await sendText(contact, t.replace("{{order}}", o.number).replace("{{total}}", `₹${o.total}`).replace(/\{\{\s*name\s*\}\}/gi, contact.name || ""), "Cart reminder");
  }
}

async function runDaily() {
  const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  if (ist.getHours() < 9) return;
  const day = ist.toISOString().slice(0, 10);
  const list = await prisma.workspace.findMany({ where: { status: "ACTIVE" } });
  for (const ws of list) {
    const s = wsSettings(ws.settings);
    if (s.lastDailyRun === day) continue;
    await prisma.workspace.update({ where: { id: ws.id }, data: { settings: { ...s, lastDailyRun: day } } });
    const md = `${String(ist.getMonth() + 1).padStart(2, "0")}-${String(ist.getDate()).padStart(2, "0")}`;
    for (const [field, msg, by] of [["birthday", s.birthdayMessage, "Birthday"], ["anniversary", s.anniversaryMessage, "Anniversary"]] as const) {
      if (!msg) continue;
      const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "Contact" WHERE "workspaceId"=$1 AND "optedOut"=false AND to_char("${field}",'MM-DD')=$2`,
        ws.id,
        md,
      );
      for (const r of rows) {
        const c = await prisma.contact.findUnique({ where: { id: r.id } });
        if (c) await sendText(c, msg.replace(/\{\{\s*name\s*\}\}/gi, c.name || ""), by);
      }
    }
    if (s.dailySummaryTo) {
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const [sent, recv, newC] = await Promise.all([
        prisma.message.count({ where: { workspaceId: ws.id, direction: "out", createdAt: { gte: since } } }),
        prisma.message.count({ where: { workspaceId: ws.id, direction: "in", createdAt: { gte: since } } }),
        prisma.contact.count({ where: { workspaceId: ws.id, createdAt: { gte: since } } }),
      ]);
      const to = await prisma.contact.upsert({
        where: { workspaceId_phone: { workspaceId: ws.id, phone: s.dailySummaryTo } },
        create: { workspaceId: ws.id, phone: s.dailySummaryTo, name: "Owner" },
        update: {},
      });
      await sendText(to, `📊 Daily summary (${day})\nSent: ${sent}\nReceived: ${recv}\nNew contacts: ${newC}`, "Daily summary");
    }
  }
}
