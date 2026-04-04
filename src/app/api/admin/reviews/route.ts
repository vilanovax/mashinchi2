import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

// GET - list reviews with optional carId filter
export async function GET(request: NextRequest) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();

  const carId = request.nextUrl.searchParams.get("carId");

  const reviews = await prisma.carReview.findMany({
    where: carId ? { carId } : {},
    include: { car: { select: { nameFa: true, brandFa: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews.map((r) => ({
    id: r.id, carId: r.carId, carName: r.car.nameFa, carBrand: r.car.brandFa,
    source: r.source, summary: r.summary, pros: r.pros, cons: r.cons,
    warnings: r.warnings, rating: r.rating, createdAt: r.createdAt.toISOString(),
  })));
}

// POST - create review
export async function POST(request: NextRequest) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();
  const body = await request.json();

  const review = await prisma.carReview.create({
    data: {
      carId: body.carId,
      source: body.source || "expert",
      summary: body.summary || "",
      pros: body.pros || [],
      cons: body.cons || [],
      warnings: body.warnings || [],
      rating: body.rating ? parseFloat(body.rating) : null,
    },
  });

  return NextResponse.json(review);
}
