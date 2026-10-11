import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1:";

function key() {
  const base = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!base) throw new Error("ENCRYPTION_KEY or AUTH_SECRET must be set");
  return createHash("sha256").update(base).digest();
}

export const isEncrypted = (v?: string | null) => !!v && v.startsWith(PREFIX);

export function encrypt(plain: string): string;
export function encrypt(plain: string | null | undefined): string | null;
export function encrypt(plain: string | null | undefined) {
  if (!plain) return plain ?? null;
  if (isEncrypted(plain)) return plain;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return PREFIX + [iv, c.getAuthTag(), ct].map((b) => b.toString("base64url")).join(":");
}

export function decrypt(v: string | null | undefined): string {
  if (!v) return "";
  if (!isEncrypted(v)) return v;
  const [iv, tag, ct] = v.slice(PREFIX.length).split(":").map((s) => Buffer.from(s, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

export function maskSecret(v: string | null | undefined) {
  if (!v) return null;
  let p = "";
  try { p = decrypt(v); } catch { return "••••"; }
  return "••••" + p.slice(-4);
}
