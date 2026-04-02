import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("mashinchi_session")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "No session found" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { sessionId },
    include: {
      tasteProfile: true,
      interactions: true,
    },
  });

  if (!user || !user.tasteProfile) {
    return NextResponse.json({ error: "No taste profile" }, { status: 400 });
  }

  const interactedCarIds = user.interactions.map((i) => i.carId);

  // Get all cars not yet interacted with
  const candidates = await prisma.car.findMany({
    where: {
      id: { notIn: interactedCarIds },
      ...(user.budget
        ? {
            priceMin: { lte: BigInt(Math.floor(Number(user.budget) * 1.2)) },
            priceMax: { gte: BigInt(Math.floor(Number(user.budget) * 0.8)) },
          }
        : {}),
    },
    include: {
      scores: true,
      specs: true,
      tags: true,
    },
  });

  const profile = user.tasteProfile;
  const dimensions = [
    "comfort", "performance", "economy", "safety", "prestige",
    "reliability", "resaleValue", "familyFriendly", "sportiness",
    "offroad", "cityDriving", "longTrip",
  ] as const;

  // Score each car against user taste profile
  const scored = candidates.map((car) => {
    let matchScore = 0;
    if (car.scores) {
      for (const dim of dimensions) {
        const userPref = (profile[dim] as number) || 0;
        const carScore = (car.scores[dim] as number) || 5;
        matchScore += userPref * (carScore / 10);
      }
    }

    return {
      ...car,
      priceMin: car.priceMin.toString(),
      priceMax: car.priceMax.toString(),
      matchScore: Math.round(matchScore * 100) / 100,
    };
  });

  // Sort by match score, top 5
  scored.sort((a, b) => b.matchScore - a.matchScore);
  const top = scored.slice(0, 5);

  return NextResponse.json({
    recommendations: top,
    tasteProfile: profile,
    totalInteractions: user.interactions.length,
  });
}
