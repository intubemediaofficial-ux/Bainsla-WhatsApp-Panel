import { SignJWT, jwtVerify } from "jose";

export type Role = "SUPER_ADMIN" | "OWNER" | "AGENT";
export type Session = {
  uid: string;
  role: Role;
  wid: string | null;
  name: string;
  email: string;
  imp?: string;
};

export const SESSION_COOKIE = "wa_session";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function signSession(s: Session) {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(key());
}

export async function readToken(t?: string | null): Promise<Session | null> {
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}
