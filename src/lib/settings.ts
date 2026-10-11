import { prisma } from "./db";

export type Branding = { appName: string; tagline: string; logoUrl: string; primaryColor: string; supportPhone: string; supportEmail: string };
export type Pricing = { marketing: number; utility: number; authentication: number; service: number; enabled: boolean };
export type PaymentCfg = { upiId: string; payeeName: string; qrUrl: string; instructions: string; gstPercent: number };
export type AiCfg = { provider: string; apiKey: string; model: string; baseUrl: string };
export type MetaCfg = { appId: string; appSecret: string; verifyToken: string; graphVersion: string };

export const DEFAULTS = {
  branding: {
    appName: "Bainsla WABA",
    tagline: "WhatsApp Business API panel — inbox, campaigns, chatbots & CRM",
    logoUrl: "",
    primaryColor: "#059669",
    supportPhone: "",
    supportEmail: "intubemediaofficial@gmail.com",
  } as Branding,
  pricing: { marketing: 0.9, utility: 0.15, authentication: 0.15, service: 0, enabled: false } as Pricing,
  payment: { upiId: "", payeeName: "", qrUrl: "", instructions: "Pay via UPI and submit the UTR / transaction ID. Admin will approve within a few hours.", gstPercent: 18 } as PaymentCfg,
  ai: { provider: "openai", apiKey: "", model: "gpt-4o-mini", baseUrl: "https://api.openai.com/v1" } as AiCfg,
  meta: { appId: "", appSecret: "", verifyToken: "", graphVersion: "v21.0" } as MetaCfg,
};

type Key = keyof typeof DEFAULTS;

export async function getSetting<K extends Key>(key: K): Promise<(typeof DEFAULTS)[K]> {
  const row = await prisma.systemSetting.findUnique({ where: { key } }).catch(() => null);
  return { ...DEFAULTS[key], ...((row?.value as object) || {}) } as (typeof DEFAULTS)[K];
}

export async function setSetting<K extends Key>(key: K, value: Partial<(typeof DEFAULTS)[K]>) {
  const cur = await getSetting(key);
  const v = { ...cur, ...value };
  await prisma.systemSetting.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
  return v;
}

export type WsSettings = {
  defaultCountryCode?: string;
  welcomeMessage?: string;
  awayMessage?: string;
  businessHours?: { enabled: boolean; start: string; end: string; days: number[] };
  birthdayMessage?: string;
  anniversaryMessage?: string;
  optOutReply?: string;
  optInReply?: string;
  appointmentReminder?: string;
  orderReminder?: string;
  roundRobin?: boolean;
  widget?: { enabled: boolean; phone: string; greeting: string; color: string; position: "left" | "right" };
  booking?: { enabled: boolean; services: string[]; slotMinutes: number; start: string; end: string; days: number[] };
  dailySummaryTo?: string;
  lastDailyRun?: string;
};

export const wsSettings = (s: unknown): WsSettings => (s && typeof s === "object" ? (s as WsSettings) : {});
