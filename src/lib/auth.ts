import { cookies } from "next/headers";
import { readToken, Session, SESSION_COOKIE, signSession } from "./session";

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  return readToken(c.get(SESSION_COOKIE)?.value);
}

export async function setSession(s: Session) {
  const c = await cookies();
  c.set(SESSION_COOKIE, await signSession(s), {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.APP_URL || "").startsWith("https"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}
