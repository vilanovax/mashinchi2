import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const [totalCars, totalUsers, totalInteractions, totalFavorites, totalReviews] = await Promise.all([
    prisma.car.count(),
    prisma.user.count(),
    prisma.userInteraction.count(),
    prisma.userInteraction.count({ where: { action: "favorite" } }),
    prisma.carReview.count(),
  ]);

  // Top liked cars
  const likeInteractions = await prisma.userInteraction.groupBy({
    by: ["carId"],
    where: { action: "like" },
    _count: { carId: true },
    orderBy: { _count: { carId: "desc" } },
    take: 10,
  });

  const topCarIds = likeInteractions.map((l) => l.carId);
  const topCars = await prisma.car.findMany({
    where: { id: { in: topCarIds } },
    select: { id: true, nameFa: true, brandFa: true },
  });

  const topLikedCars = likeInteractions.map((l) => {
    const car = topCars.find((c) => c.id === l.carId);
    return { carId: l.carId, nameFa: car?.nameFa || "", brandFa: car?.brandFa || "", likes: l._count.carId };
  });

  // User type distribution
  const profiles = await prisma.userTasteProfile.findMany({
    select: {
      typeEconomic: true, typeFamily: true, typeSport: true,
      typePrestige: true, typeSafe: true, typeSpecial: true,
      typeOffroad: true, typeCity: true, typeTravel: true, typeInvestment: true,
    },
  });

  const typeLabels: Record<string, string> = {
    typeEconomic: "اقتصادی", typeFamily: "خانوادگی", typeSport: "اسپرت",
    typePrestige: "پرستیژ", typeSafe: "کم‌ریسک", typeSpecial: "خاص‌پسند",
    typeOffroad: "آفرود", typeCity: "شهری", typeTravel: "سفر", typeInvestment: "سرمایه",
  };

  const typeCounts: Record<string, number> = {};
  for (const key of Object.keys(typeLabels)) {
    typeCounts[key] = profiles.filter((p) => {
      const val = (p as Record<string, unknown>)[key];
      return typeof val === "number" && val > 0;
    }).length;
  }

  const userTypes = Object.entries(typeCounts)
    .map(([key, count]) => ({ key, label: typeLabels[key], count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalCars,
    totalUsers,
    totalInteractions,
    totalFavorites,
    totalReviews,
    topLikedCars,
    userTypes,
  });
}
