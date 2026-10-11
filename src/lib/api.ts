import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { ZodError } from "zod";
import { getSession } from "./auth";
import { prisma } from "./db";
import type { Session } from "./session";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

type Ctx = { params: Promise<Record<string, string>> };
export function handle(fn: (req: NextRequest, ctx: Ctx) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof ZodError) return json({ error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") }, 400);
      console.error(e);
      return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
    }
  };
}

export type WsSession = Session & { wid: string };

export async function requireWs(): Promise<WsSession> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Login required");
  if (!s.wid) throw new HttpError(403, "No workspace");
  return s as WsSession;
}

export async function requireOwner(): Promise<WsSession> {
  const s = await requireWs();
  if (s.role === "AGENT") throw new HttpError(403, "Only the workspace owner can do this");
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Login required");
  if (s.role !== "SUPER_ADMIN") throw new HttpError(403, "Admin only");
  return s;
}

export const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");

export async function requireApiKey(req: NextRequest): Promise<string> {
  const h = req.headers.get("authorization") || "";
  const key = h.startsWith("Bearer ") ? h.slice(7) : req.headers.get("x-api-key") || "";
  if (!key) throw new HttpError(401, "API key required (Authorization: Bearer <key>)");
  const row = await prisma.apiKey.findUnique({ where: { keyHash: hashKey(key) } });
  if (!row) throw new HttpError(401, "Invalid API key");
  await prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  return row.workspaceId;
}

export async function audit(workspaceId: string | null, userName: string | null, action: string, detail?: string) {
  await prisma.auditLog.create({ data: { workspaceId, userName, action, detail } }).catch(() => {});
}

export async function body<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}
