import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { budget } = body;

  if (!budget) {
    return NextResponse.json({ error: "budget required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  let sessionId = cookieStore.get("mashinchi_session")?.value;

  if (!sessionId) {
    sessionId = randomUUID();
  }

  const user = await prisma.user.upsert({
    where: { sessionId },
    update: { budget: BigInt(budget) },
    create: { sessionId, budget: BigInt(budget) },
  });

  const response = NextResponse.json({
    success: true,
    userId: user.id,
  });

  response.cookies.set("mashinchi_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return response;
}
