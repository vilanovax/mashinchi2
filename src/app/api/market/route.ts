import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/market?tab=prices|trends|listings|insights&period=week|month|quarter|year&carId=x&origin=iranian
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const tab = sp.get("tab") || "prices";

  if (tab === "prices") return getPriceTable(sp);
  if (tab === "trends") return getTrends(sp);
  if (tab === "listings") return getListings(sp);
  if (tab === "insights") return getInsights(sp);

  return NextResponse.json({ error: "invalid tab" }, { status: 400 });
}

// ── Price Table: all cars with latest price + change ──
async function getPriceTable(sp: URLSearchParams) {
  const origin = sp.get("origin");
  const category = sp.get("category");
  const sort = sp.get("sort") || "name"; // name, price, change

  const cars = await prisma.car.findMany({
    where: {
      ...(origin ? { origin } : {}),
      ...(category ? { category } : {}),
    },
    select: {
      id: true, nameEn: true, nameFa: true, brand: true, brandFa: true,
      category: true, origin: true, priceMin: true, priceMax: true, imageUrl: true,
      prices: { orderBy: { date: "desc" }, take: 2 },
    },
  });

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const result = await Promise.all(cars.map(async (car) => {
    const latestPrice = car.prices[0];
    const prevPrice = car.prices[1];

    // Get week-ago and month-ago prices
    const weekPrice = await prisma.priceHistory.findFirst({
      where: { carId: car.id, date: { lte: oneWeekAgo } },
      orderBy: { date: "desc" },
    });
    const monthPrice = await prisma.priceHistory.findFirst({
      where: { carId: car.id, date: { lte: oneMonthAgo } },
      orderBy: { date: "desc" },
    });

    const current = latestPrice ? Number(latestPrice.price) : Number(car.priceMin);
    const weekChange = weekPrice ? calcChange(current, Number(weekPrice.price)) : null;
    const monthChange = monthPrice ? calcChange(current, Number(monthPrice.price)) : null;

    return {
      id: car.id,
      nameEn: car.nameEn,
      nameFa: car.nameFa,
      brand: car.brand,
      brandFa: car.brandFa,
      category: car.category,
      origin: car.origin,
      imageUrl: car.imageUrl,
      price: current.toString(),
      priceMin: car.priceMin.toString(),
      priceMax: car.priceMax.toString(),
      weekChange,
      monthChange,
      lastUpdate: latestPrice?.date?.toISOString() || null,
    };
  }));

  // Sort
  if (sort === "price") result.sort((a, b) => Number(a.price) - Number(b.price));
  else if (sort === "change") result.sort((a, b) => (b.weekChange ?? 0) - (a.weekChange ?? 0));
  else result.sort((a, b) => a.nameFa.localeCompare(b.nameFa, "fa"));

  return NextResponse.json(result);
}

// ── Trends: price history for specific car(s) ──
async function getTrends(sp: URLSearchParams) {
  const carIds = sp.get("carIds")?.split(",") || [];
  const period = sp.get("period") || "month";

  if (carIds.length === 0) {
    return NextResponse.json({ error: "carIds required" }, { status: 400 });
  }

  const dateFrom = getPeriodDate(period);

  const data = await Promise.all(carIds.map(async (carId) => {
    const car = await prisma.car.findUnique({
      where: { id: carId },
      select: { nameFa: true, brandFa: true },
    });

    const prices = await prisma.priceHistory.findMany({
      where: { carId, date: { gte: dateFrom } },
      orderBy: { date: "asc" },
    });

    return {
      carId,
      nameFa: car?.nameFa || "",
      brandFa: car?.brandFa || "",
      points: prices.map((p) => ({
        date: p.date.toISOString().split("T")[0],
        price: p.price.toString(),
      })),
    };
  }));

  return NextResponse.json(data);
}

// ── Listings: listing stats analysis ──
async function getListings(sp: URLSearchParams) {
  const period = sp.get("period") || "week";
  const dateFrom = getPeriodDate(period);

  // Check if any data exists
  const totalCount = await prisma.listingStats.count({
    where: { date: { gte: dateFrom } },
  });

  if (totalCount === 0) {
    return NextResponse.json({ rankings: [], dailyTrend: {} });
  }

  // Most listed cars
  const stats = await prisma.listingStats.groupBy({
    by: ["carId"],
    where: { date: { gte: dateFrom } },
    _sum: { count: true },
    _avg: { count: true },
    orderBy: { _sum: { count: "desc" } },
    take: 20,
  });

  const carIds = stats.map((s) => s.carId);
  const cars = await prisma.car.findMany({
    where: { id: { in: carIds } },
    select: { id: true, nameFa: true, brandFa: true, origin: true, category: true, imageUrl: true },
  });
  const carMap = Object.fromEntries(cars.map((c) => [c.id, c]));

  const result = stats.map((s) => ({
    carId: s.carId,
    ...carMap[s.carId],
    totalListings: s._sum.count,
    avgDaily: Math.round(s._avg.count || 0),
  }));

  // Daily trend for top 5
  const top5 = carIds.slice(0, 5);
  const dailyTrend = await prisma.listingStats.findMany({
    where: { carId: { in: top5 }, date: { gte: dateFrom } },
    orderBy: { date: "asc" },
  });

  const trendBycar: Record<string, { date: string; count: number }[]> = {};
  for (const d of dailyTrend) {
    if (!trendBycar[d.carId]) trendBycar[d.carId] = [];
    trendBycar[d.carId].push({
      date: d.date.toISOString().split("T")[0],
      count: d.count,
    });
  }

  return NextResponse.json({ rankings: result, dailyTrend: trendBycar });
}

// ── Insights: AI market analysis ──
async function getInsights(sp: URLSearchParams) {
  try {
    const period = sp.get("period") || "weekly";

    const insights = await prisma.marketInsight.findMany({
      where: { period },
      orderBy: { date: "desc" },
      take: 5,
    });

    // Quick stats
    const cars = await prisma.car.findMany({
      select: { id: true, nameFa: true, brandFa: true, priceMin: true, priceMax: true, origin: true },
    });

    const cheapest = [...cars].sort((a, b) => Number(a.priceMin) - Number(b.priceMin)).slice(0, 3);
    const expensive = [...cars].sort((a, b) => Number(b.priceMax) - Number(a.priceMax)).slice(0, 3);

    return NextResponse.json({
      insights: insights.map((i) => ({
        id: i.id,
        date: i.date.toISOString().split("T")[0],
        period: i.period,
        title: i.title,
        summary: i.summary,
        highlights: i.highlights,
        topRisers: i.topRisers,
        topFallers: i.topFallers,
        hotListings: i.hotListings,
        aiAnalysis: i.aiAnalysis,
      })),
      quickStats: {
        cheapest: cheapest.map((c) => ({ id: c.id, nameFa: c.nameFa, brandFa: c.brandFa, price: c.priceMin.toString() })),
        expensive: expensive.map((c) => ({ id: c.id, nameFa: c.nameFa, brandFa: c.brandFa, price: c.priceMax.toString() })),
        totalCars: cars.length,
      },
  });
  } catch (e) {
    console.error("Insights API error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── Helpers ──
function calcChange(current: number, old: number): number {
  if (old === 0) return 0;
  return Math.round(((current - old) / old) * 100);
}

function getPeriodDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case "week": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "quarter": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "year": return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}
