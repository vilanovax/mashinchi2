import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

// GET - list all cars
// ?full=true returns full data (for edit page), default returns list-optimized data
export async function GET(request: NextRequest) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();

  const full = request.nextUrl.searchParams.get("full") === "true";

  if (full) {
    const cars = await prisma.car.findMany({
      include: { scores: true, specs: true, tags: true, intel: true, reviews: true },
      orderBy: { nameFa: "asc" },
    });
    return NextResponse.json(cars.map((car) => ({
      ...car,
      priceMin: car.priceMin.toString(),
      priceMax: car.priceMax.toString(),
      tags: car.tags.map((t) => ({ id: t.id, tag: t.tag })),
      reviews: car.reviews.map((r) => ({
        id: r.id, source: r.source, summary: r.summary,
        pros: r.pros, cons: r.cons, warnings: r.warnings, rating: r.rating,
      })),
    })));
  }

  // List-optimized: only counts, no heavy payloads
  const cars = await prisma.car.findMany({
    select: {
      id: true, nameEn: true, nameFa: true, brand: true, brandFa: true,
      category: true, origin: true, year: true,
      priceMin: true, priceMax: true, imageUrl: true, isNew: true,
      _count: { select: { reviews: true, sources: true, tags: true } },
      scores: { select: { id: true } },
      specs: { select: { id: true } },
      intel: { select: { id: true, overallSummary: true, frequentPros: true } },
    },
    orderBy: { nameFa: "asc" },
  });

  return NextResponse.json(cars.map((car) => ({
    id: car.id,
    nameEn: car.nameEn,
    nameFa: car.nameFa,
    brand: car.brand,
    brandFa: car.brandFa,
    category: car.category,
    origin: car.origin,
    year: car.year,
    priceMin: car.priceMin.toString(),
    priceMax: car.priceMax.toString(),
    imageUrl: car.imageUrl,
    isNew: car.isNew,
    hasScores: !!car.scores,
    hasSpecs: !!car.specs,
    hasIntel: !!car.intel,
    intelProsCount: car.intel?.frequentPros?.length || 0,
    hasIntelSummary: !!(car.intel?.overallSummary && car.intel.overallSummary.length > 20),
    reviewsCount: car._count.reviews,
    sourcesCount: car._count.sources,
    tagsCount: car._count.tags,
  })));
}

// POST - create new car
export async function POST(request: NextRequest) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();

  const body = await request.json();
  const { nameEn, nameFa, brand, brandFa, category, year, priceMin, priceMax, origin, description, isNew } = body;

  const car = await prisma.car.create({
    data: {
      nameEn, nameFa, brand: brand || brandFa, brandFa,
      category, year: year || 2024,
      priceMin: BigInt(priceMin), priceMax: BigInt(priceMax),
      origin, description, isNew: isNew ?? true,
    },
  });

  return NextResponse.json({ ...car, priceMin: car.priceMin.toString(), priceMax: car.priceMax.toString() });
}
