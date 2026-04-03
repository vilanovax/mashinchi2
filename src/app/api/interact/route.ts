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

// 10 user type mappings: which car score dimensions influence each type
const USER_TYPE_WEIGHTS: Record<string, Record<string, number>> = {
  typeEconomic: { economy: 0.4, resaleValue: 0.3, maintenanceRisk: -0.2, cityDriving: 0.1 },
  typeFamily: { familyFriendly: 0.4, safety: 0.3, comfort: 0.2, longTrip: 0.1 },
  typeSport: { sportiness: 0.4, performance: 0.3, prestige: 0.15, comfort: 0.05, economy: -0.1 },
  typePrestige: { prestige: 0.4, comfort: 0.25, safety: 0.15, reliability: 0.1, economy: -0.1 },
  typeSafe: { safety: 0.3, reliability: 0.3, maintenanceRisk: -0.2, resaleValue: 0.1, afterSales: 0.1 },
  typeSpecial: { sportiness: 0.2, prestige: 0.3, performance: 0.2, economy: -0.15, familyFriendly: -0.15 },
  typeOffroad: { offroad: 0.4, longTrip: 0.2, performance: 0.2, sportiness: 0.1, cityDriving: -0.1 },
  typeCity: { cityDriving: 0.4, economy: 0.25, comfort: 0.15, familyFriendly: 0.1, offroad: -0.1 },
  typeTravel: { longTrip: 0.35, comfort: 0.25, reliability: 0.15, safety: 0.15, cityDriving: -0.1 },
  typeInvestment: { resaleValue: 0.4, reliability: 0.2, maintenanceRisk: -0.2, prestige: 0.1, economy: 0.1 },
};

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

  // Calculate updated taste dimension values
  const updateData: Record<string, number> = {};
  for (const dim of dimensions) {
    const carScore = carScores[dim] as number;
    const currentValue = (profile[dim] as number) || 0;
    updateData[dim] = currentValue + weight * (carScore / 10);
  }

  // Calculate user type scores based on car scores and action
  for (const [typeName, typeWeights] of Object.entries(USER_TYPE_WEIGHTS)) {
    let typeSignal = 0;
    for (const [dim, dimWeight] of Object.entries(typeWeights)) {
      const carScore = (carScores as Record<string, unknown>)[dim];
      if (typeof carScore === "number") {
        typeSignal += (carScore / 10) * dimWeight;
      }
    }
    const currentTypeValue = (profile as Record<string, unknown>)[typeName];
    const currentVal = typeof currentTypeValue === "number" ? currentTypeValue : 0;
    updateData[typeName] = currentVal + weight * typeSignal;
  }

  await prisma.userTasteProfile.update({
    where: { userId },
    data: updateData,
  });
}
