import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "intubemediaofficial@gmail.com").toLowerCase();
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("ADMIN_PASSWORD env required");
  const ex = await prisma.user.findUnique({ where: { email } });
  if (!ex) await prisma.user.create({ data: { email, name: "Super Admin", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(pw, 10) } });
  else if (process.env.RESET_ADMIN_PASSWORD === "1") await prisma.user.update({ where: { email }, data: { passwordHash: await bcrypt.hash(pw, 10), role: "SUPER_ADMIN", active: true } });
  if (!(await prisma.plan.count())) {
    await prisma.plan.createMany({
      data: [
        { name: "Free Trial", price: 0, durationDays: 14, isDefault: true, sortOrder: 0, limits: { contacts: 500, agents: 1, numbers: 1, broadcastsPerMonth: 5, botFlows: 2 }, features: ["500 contacts", "1 number", "Team inbox", "5 broadcasts / month"] },
        { name: "Starter", price: 999, durationDays: 30, sortOrder: 1, limits: { contacts: 5000, agents: 3, numbers: 1, broadcastsPerMonth: 50, botFlows: 10 }, features: ["5,000 contacts", "3 agents", "Bot flows", "AI chatbot"] },
        { name: "Growth", price: 2499, durationDays: 30, sortOrder: 2, limits: { contacts: 50000, agents: 10, numbers: 3, broadcastsPerMonth: 500, botFlows: 50 }, features: ["50,000 contacts", "10 agents", "3 numbers", "Drip campaigns", "API access"] },
        { name: "Agency", price: 6999, durationDays: 30, sortOrder: 3, limits: { contacts: -1, agents: -1, numbers: -1, broadcastsPerMonth: -1, botFlows: -1 }, features: ["Unlimited everything", "White-label", "Priority support"] },
      ],
    });
  }
  console.log("seeded", email);
}

main().finally(() => prisma.$disconnect());
