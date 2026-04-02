import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { generateRecommendationSummary } from "@/lib/ai";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("mashinchi_session")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { sessionId },
    include: {
      tasteProfile: true,
      interactions: true,
    },
  });

  if (!user?.tasteProfile) {
    return NextResponse.json({ error: "No profile" }, { status: 400 });
  }

  const interactedCarIds = user.interactions.map((i) => i.carId);

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

  // Also include liked cars
  const likedCarIds = user.interactions
    .filter((i) => i.action === "like")
    .map((i) => i.carId);

  const likedCars = await prisma.car.findMany({
    where: { id: { in: likedCarIds } },
    include: { scores: true, specs: true, tags: true },
  });

  const profile = user.tasteProfile;
  const dimensions = [
    "comfort", "performance", "economy", "safety", "prestige",
    "reliability", "resaleValue", "familyFriendly", "sportiness",
    "offroad", "cityDriving", "longTrip",
  ] as const;

  const allCars = [...likedCars, ...candidates];
  const uniqueCars = allCars.filter(
    (car, index, self) => self.findIndex((c) => c.id === car.id) === index
  );

  const scored = uniqueCars.map((car) => {
    let matchScore = 0;
    if (car.scores) {
      for (const dim of dimensions) {
        const userPref = (profile[dim] as number) || 0;
        const carScore = (car.scores[dim] as number) || 5;
        matchScore += userPref * (carScore / 10);
      }
    }

    // Boost liked cars
    if (likedCarIds.includes(car.id)) {
      matchScore += 2;
    }

    return {
      nameFa: car.nameFa,
      nameEn: car.nameEn,
      brandFa: car.brandFa,
      category: car.category,
      origin: car.origin,
      priceMin: car.priceMin.toString(),
      priceMax: car.priceMax.toString(),
      description: car.description || "",
      tags: car.tags.map((t) => t.tag),
      scores: car.scores as unknown as Record<string, number>,
      specs: car.specs as unknown as Record<string, unknown>,
      matchScore: Math.round(matchScore * 100) / 100,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const top5 = scored.slice(0, 5);

  try {
    const summary = await generateRecommendationSummary(
      top5,
      profile,
      user.budget?.toString() || "2500000000"
    );

    return NextResponse.json({
      summary,
      recommendations: top5,
    });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({
      summary: null,
      recommendations: top5,
      error: "AI summary failed",
    });
  }
}
