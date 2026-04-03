import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const car = await prisma.car.findUnique({
    where: { id },
    include: {
      scores: true,
      specs: true,
      tags: true,
      intel: true,
      reviews: true,
    },
  });

  if (!car) {
    return NextResponse.json({ error: "Car not found" }, { status: 404 });
  }

  // Fetch all other cars for similarity computation
  const allCars = await prisma.car.findMany({
    where: { id: { not: id } },
    select: {
      id: true,
      nameFa: true,
      nameEn: true,
      brandFa: true,
      priceMin: true,
      priceMax: true,
      category: true,
      origin: true,
    },
  });

  const carPriceMin = Number(car.priceMin);
  const carPriceMax = Number(car.priceMax);
  const carPriceMid = (carPriceMin + carPriceMax) / 2;

  // Score each candidate
  const scored = allCars.map((c) => {
    let matchScore = 0;

    // Category match: +3
    if (c.category === car.category) matchScore += 3;

    // Price range within 30%: +2
    const cPriceMid = (Number(c.priceMin) + Number(c.priceMax)) / 2;
    if (carPriceMid > 0 && cPriceMid > 0) {
      const ratio = Math.abs(cPriceMid - carPriceMid) / carPriceMid;
      if (ratio <= 0.3) matchScore += 2;
    }

    // Same origin: +1
    if (c.origin === car.origin) matchScore += 1;

    return {
      id: c.id,
      nameFa: c.nameFa,
      nameEn: c.nameEn,
      brandFa: c.brandFa,
      priceMin: c.priceMin.toString(),
      priceMax: c.priceMax.toString(),
      category: c.category,
      origin: c.origin,
      matchScore,
    };
  });

  // Similar cars: top 3 by score
  const similarCars = scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  // Alternatives: same logic but different origin
  const alternatives = scored
    .filter((c) => c.origin !== car.origin)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  // Convert BigInt fields to strings
  const carData = {
    ...car,
    priceMin: car.priceMin.toString(),
    priceMax: car.priceMax.toString(),
    tags: car.tags.map((t) => t.tag),
  };

  return NextResponse.json({
    ...carData,
    similarCars,
    alternatives,
  });
}
