import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

async function getOrCreateUser() {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("mashinchi_session")?.value;

  if (!sessionId) {
    sessionId = randomUUID();
  }

  let user = await prisma.user.findUnique({
    where: { sessionId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { sessionId },
    });
  }

  return { user, sessionId };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { carId, action, round = 1 } = body;

  if (!carId || !action) {
    return NextResponse.json({ error: "carId and action required" }, { status: 400 });
  }

  const { user, sessionId } = await getOrCreateUser();

  // Save interaction
  await prisma.userInteraction.create({
    data: {
      userId: user.id,
      carId,
      action,
      round,
    },
  });

  // Update taste profile based on interaction
  await updateTasteProfile(user.id, carId, action);

  const response = NextResponse.json({ success: true, userId: user.id });

  response.cookies.set("mashinchi_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  return response;
}

async function updateTasteProfile(userId: string, carId: string, action: string) {
  const carScores = await prisma.carScores.findUnique({
    where: { carId },
  });

  if (!carScores) return;

  const weight = action === "like" ? 1.0 : action === "skip" ? -0.3 : 0;
  if (weight === 0) return;

  const dimensions = [
    "comfort", "performance", "economy", "safety", "prestige",
    "reliability", "resaleValue", "familyFriendly", "sportiness",
    "offroad", "cityDriving", "longTrip",
  ] as const;

  // Get or create taste profile
  let profile = await prisma.userTasteProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    profile = await prisma.userTasteProfile.create({
      data: { userId },
    });
  }

  // Calculate updated values
  const updateData: Record<string, number> = {};
  for (const dim of dimensions) {
    const carScore = carScores[dim] as number;
    const currentValue = (profile[dim] as number) || 0;
    // Weighted moving average
    updateData[dim] = currentValue + weight * (carScore / 10);
  }

  await prisma.userTasteProfile.update({
    where: { userId },
    data: updateData,
  });
}
