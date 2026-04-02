import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const budgetMin = searchParams.get("budgetMin");
  const budgetMax = searchParams.get("budgetMax");
  const exclude = searchParams.get("exclude"); // comma-separated car IDs to exclude

  const excludeIds = exclude ? exclude.split(",") : [];

  const cars = await prisma.car.findMany({
    where: {
      ...(budgetMin || budgetMax
        ? {
            priceMin: { lte: BigInt(budgetMax || "5000000000000") },
            priceMax: { gte: BigInt(budgetMin || "0") },
          }
        : {}),
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    include: {
      scores: true,
      specs: true,
      tags: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Convert BigInt to string for JSON serialization
  const serialized = cars.map((car) => ({
    ...car,
    priceMin: car.priceMin.toString(),
    priceMax: car.priceMax.toString(),
  }));

  return NextResponse.json(serialized);
}
