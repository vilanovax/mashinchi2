import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

// GET - list all cars with full data
export async function GET(request: NextRequest) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();

  const cars = await prisma.car.findMany({
    include: { scores: true, specs: true, tags: true, intel: true, reviews: true },
    orderBy: { nameFa: "asc" },
  });

  const serialized = cars.map((car) => ({
    ...car,
    priceMin: car.priceMin.toString(),
    priceMax: car.priceMax.toString(),
    tags: car.tags.map((t) => ({ id: t.id, tag: t.tag })),
    reviews: car.reviews.map((r) => ({
      id: r.id, source: r.source, summary: r.summary,
      pros: r.pros, cons: r.cons, warnings: r.warnings, rating: r.rating,
    })),
  }));

  return NextResponse.json(serialized);
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
