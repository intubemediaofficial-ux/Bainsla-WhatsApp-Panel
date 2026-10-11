import type { Contact } from "@prisma/client";
import { prisma } from "./db";

type Step = { delayMinutes: number };

export async function enroll(sequenceId: string, contact: Contact) {
  const seq = await prisma.sequence.findUnique({ where: { id: sequenceId } });
  if (!seq || !seq.active) return false;
  const steps = (seq.steps as Step[]) || [];
  if (!steps.length) return false;
  const nextRunAt = new Date(Date.now() + (Number(steps[0].delayMinutes) || 0) * 60000);
  const existing = await prisma.sequenceEnrollment.findUnique({ where: { sequenceId_contactId: { sequenceId, contactId: contact.id } } });
  if (existing && existing.status === "ACTIVE") return false;
  await prisma.sequenceEnrollment.upsert({
    where: { sequenceId_contactId: { sequenceId, contactId: contact.id } },
    create: { sequenceId, contactId: contact.id, nextRunAt },
    update: { stepIndex: 0, nextRunAt, status: "ACTIVE" },
  });
  await prisma.sequence.update({ where: { id: sequenceId }, data: { enrolled: { increment: 1 } } });
  return true;
}

export async function triggerSequences(contact: Contact, trigger: "NEW_CONTACT" | "KEYWORD" | "TAG_ADDED", value?: string) {
  const seqs = await prisma.sequence.findMany({ where: { workspaceId: contact.workspaceId, active: true, trigger } });
  for (const s of seqs) {
    if (trigger !== "NEW_CONTACT") {
      const want = (s.triggerValue || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
      const v = (value || "").toLowerCase();
      if (!want.some((w) => (trigger === "KEYWORD" ? v.includes(w) : v === w))) continue;
    }
    await enroll(s.id, contact);
  }
}

export async function stopSequencesOnReply(contactId: string) {
  await prisma.sequenceEnrollment.updateMany({
    where: { contactId, status: "ACTIVE", sequence: { kind: "FOLLOWUP" } },
    data: { status: "STOPPED" },
  });
}

export async function addTags(contact: Contact, tags: string[]) {
  const add = tags.filter((t) => t && !contact.tags.includes(t));
  if (!add.length) return contact;
  const c = await prisma.contact.update({ where: { id: contact.id }, data: { tags: { push: add } } });
  for (const t of add) await triggerSequences(c, "TAG_ADDED", t);
  return c;
}

export async function runAutomations(contact: Contact, event: string, value?: string) {
  const list = await prisma.automation.findMany({ where: { workspaceId: contact.workspaceId, event, active: true } });
  for (const a of list) {
    if (a.condition && value && !value.toLowerCase().includes(a.condition.toLowerCase())) continue;
    if (a.condition && !value) continue;
    const v = a.actionValue || "";
    if (a.action === "ADD_TAG") contact = await addTags(contact, v.split(",").map((s) => s.trim()));
    if (a.action === "SET_STAGE") contact = await prisma.contact.update({ where: { id: contact.id }, data: { stage: v } });
    if (a.action === "SET_LEAD_SCORE") contact = await prisma.contact.update({ where: { id: contact.id }, data: { leadScore: v } });
    if (a.action === "START_SEQUENCE" && v) await enroll(v, contact);
    if (a.action === "CREATE_DEAL")
      await prisma.deal.create({ data: { workspaceId: contact.workspaceId, contactId: contact.id, title: `${contact.name || contact.phone} — ${v || "New deal"}`, phone: contact.phone, source: event } });
    if (a.action === "WEBHOOK" && v)
      await fetch(v, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, contact, value }) }).catch(() => {});
    await prisma.automation.update({ where: { id: a.id }, data: { runs: { increment: 1 } } });
  }
  return contact;
}
