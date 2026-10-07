import { randomBytes } from "node:crypto";

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

export const SESSION_TTL_MS = 30 * 60 * 1000;

const sessions = new Map<string, Session>();

export function createSession(userId: string, now = Date.now()): Session {
  const session: Session = {
    token: randomBytes(24).toString("hex"),
    userId,
    expiresAt: now + SESSION_TTL_MS,
  };
  sessions.set(session.token, session);
  return session;
}

export function getSession(token: string, now = Date.now()): Session | undefined {
  const session = sessions.get(token);
  if (!session) return undefined;
  if (session.expiresAt <= now) {
    // El token expiró: se invalida para que no se pueda reutilizar.
    sessions.delete(token);
    return undefined;
  }
  return session;
}
