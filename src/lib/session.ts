import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { randomUUID, createHash } from "crypto";

const COOKIE_NAME = "mashinchi_session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

export function hashPassword(password: string): string {
  return createHash("sha256").update(password + "mashinchi_salt_2024").digest("hex");
}

export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

export async function getUser() {
  const sessionId = await getSessionId();
  if (!sessionId) return null;
  return prisma.user.findUnique({ where: { sessionId } });
}

export async function getOrCreateUser() {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(COOKIE_NAME)?.value;

  if (sessionId) {
    const existing = await prisma.user.findUnique({ where: { sessionId } });
    if (existing) return { user: existing, sessionId, isNew: false };
  }

  sessionId = randomUUID();
  const user = await prisma.user.create({ data: { sessionId } });
  return { user, sessionId, isNew: true };
}

export { COOKIE_NAME, COOKIE_OPTIONS };
