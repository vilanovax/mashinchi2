import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const [
    totalCars, totalUsers, totalInteractions, totalFavorites, totalReviews,
    totalSources, pendingSources, processedSources, approvedSources,
  ] = await Promise.all([
    prisma.car.count(),
    prisma.user.count(),
    prisma.userInteraction.count(),
    prisma.userInteraction.count({ where: { action: "favorite" } }),
    prisma.carReview.count(),
    prisma.carSource.count({ where: { status: { not: "archived" } } }),
    prisma.carSource.count({ where: { status: "pending" } }),
    prisma.carSource.count({ where: { status: "processed" } }),
    prisma.carSource.count({ where: { status: "approved" } }),
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

  // Data health summary (lightweight — no full car load)
  const [carsWithIntel, carsWithScores, carsWithSources, carsWithPrices, carsWithImage] = await Promise.all([
    prisma.carIntelligence.count(),
    prisma.carScores.count(),
    prisma.carSource.groupBy({ by: ["carId"], _count: true }).then((r) => r.length),
    prisma.listingStats.groupBy({ by: ["carId"], _count: true }).then((r) => r.length),
    prisma.car.count({ where: { imageUrl: { not: null } } }),
  ]);

  // Sources per car — top 5 cars with most sources
  const sourcesPerCar = await prisma.carSource.groupBy({
    by: ["carId"],
    where: { status: { not: "archived" } },
    _count: { carId: true },
    orderBy: { _count: { carId: "desc" } },
    take: 5,
  });

  const topSourceCarIds = sourcesPerCar.map((s) => s.carId);
  const topSourceCars = topSourceCarIds.length > 0
    ? await prisma.car.findMany({
        where: { id: { in: topSourceCarIds } },
        select: { id: true, nameFa: true },
      })
    : [];

  const topCarsWithSources = sourcesPerCar.map((s) => {
    const car = topSourceCars.find((c) => c.id === s.carId);
    return { carId: s.carId, nameFa: car?.nameFa || "", count: s._count.carId };
  });

  // Cars with lowest source count (need attention)
  const allCarIds = await prisma.car.findMany({ select: { id: true, nameFa: true } });
  const sourceCountMap = new Map(sourcesPerCar.map((s) => [s.carId, s._count.carId]));
  // Get ALL source counts (not just top 5)
  const allSourceCounts = await prisma.carSource.groupBy({
    by: ["carId"],
    where: { status: { not: "archived" } },
    _count: { carId: true },
  });
  const allSourceMap = new Map(allSourceCounts.map((s) => [s.carId, s._count.carId]));

  const carsNeedingData = allCarIds
    .map((c) => ({ carId: c.id, nameFa: c.nameFa, count: allSourceMap.get(c.id) || 0 }))
    .sort((a, b) => a.count - b.count)
    .slice(0, 5);

  // Recent activity (last 10 audit entries)
  let recentActivity: { action: string; entityType: string; entityId: string; details: string | null; createdAt: string }[] = [];
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { action: true, entityType: true, entityId: true, details: true, createdAt: true },
    });
    recentActivity = logs.map((l) => ({
      action: l.action,
      entityType: String(l.entityType || ""),
      entityId: l.entityId || "",
      details: typeof l.details === "string" ? l.details : l.details ? JSON.stringify(l.details) : null,
      createdAt: l.createdAt.toISOString(),
    }));
  } catch {
    // AuditLog might not exist
  }

  return NextResponse.json({
    totalCars,
    totalUsers,
    totalInteractions,
    totalFavorites,
    totalReviews,
    topLikedCars,
    userTypes,

    // Pipeline
    pipeline: {
      totalSources,
      pending: pendingSources,
      processed: processedSources,
      approved: approvedSources,
    },

    // Data health
    dataHealth: {
      carsWithIntel,
      carsWithScores,
      carsWithSources,
      carsWithPrices,
      carsWithImage,
    },

    // Top/bottom sources
    topCarsWithSources,
    carsNeedingData,

    // Recent
    recentActivity,
  });
}
