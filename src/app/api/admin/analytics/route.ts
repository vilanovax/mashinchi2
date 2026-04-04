import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();

  // Funnel data
  const totalUsers = await prisma.user.count();
  const usersWithBudget = await prisma.user.count({ where: { budget: { not: null } } });
  const usersWithInteractions = await prisma.user.count({
    where: { interactions: { some: { action: { in: ["like", "skip"] } } } },
  });
  const usersWithProfile = await prisma.userTasteProfile.count();
  const usersWithFavorites = await prisma.user.count({
    where: { interactions: { some: { action: "favorite" } } },
  });

  // Interactions per day (last 14 days)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentInteractions = await prisma.userInteraction.findMany({
    where: { createdAt: { gte: fourteenDaysAgo } },
    select: { createdAt: true, action: true },
  });

  const dailyStats: Record<string, { likes: number; skips: number; favorites: number }> = {};
  for (const i of recentInteractions) {
    const day = i.createdAt.toISOString().split("T")[0];
    if (!dailyStats[day]) dailyStats[day] = { likes: 0, skips: 0, favorites: 0 };
    if (i.action === "like") dailyStats[day].likes++;
    else if (i.action === "skip") dailyStats[day].skips++;
    else if (i.action === "favorite") dailyStats[day].favorites++;
  }

  const dailyData = Object.entries(dailyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({ date, ...stats }));

  // Origin distribution of liked cars
  const likedCarIds = await prisma.userInteraction.findMany({
    where: { action: "like" },
    select: { carId: true },
  });
  const uniqueLikedIds = [...new Set(likedCarIds.map((l) => l.carId))];
  const likedCars = await prisma.car.findMany({
    where: { id: { in: uniqueLikedIds } },
    select: { origin: true },
  });
  const originDist: Record<string, number> = {};
  for (const c of likedCars) {
    originDist[c.origin] = (originDist[c.origin] || 0) + 1;
  }

  // Category distribution of liked cars
  const likedCarsForCat = await prisma.car.findMany({
    where: { id: { in: uniqueLikedIds } },
    select: { category: true },
  });
  const categoryDist: Record<string, number> = {};
  for (const c of likedCarsForCat) {
    categoryDist[c.category] = (categoryDist[c.category] || 0) + 1;
  }

  // Budget distribution
  const budgets = await prisma.user.findMany({
    where: { budget: { not: null } },
    select: { budget: true },
  });
  const budgetRanges = [
    { label: "< ۱ میلیارد", min: 0, max: 1_000_000_000, count: 0 },
    { label: "۱-۲ میلیارد", min: 1_000_000_000, max: 2_000_000_000, count: 0 },
    { label: "۲-۳ میلیارد", min: 2_000_000_000, max: 3_000_000_000, count: 0 },
    { label: "۳-۵ میلیارد", min: 3_000_000_000, max: 5_000_000_000, count: 0 },
    { label: "> ۵ میلیارد", min: 5_000_000_000, max: Infinity, count: 0 },
  ];
  for (const u of budgets) {
    const b = Number(u.budget);
    const range = budgetRanges.find((r) => b >= r.min && b < r.max);
    if (range) range.count++;
  }

  return NextResponse.json({
    funnel: {
      totalUsers,
      usersWithBudget,
      usersWithInteractions,
      usersWithProfile,
      usersWithFavorites,
    },
    dailyData,
    originDistribution: originDist,
    categoryDistribution: categoryDist,
    budgetDistribution: budgetRanges.map((r) => ({ label: r.label, count: r.count })),
  });
}
