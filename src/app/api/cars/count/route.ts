import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cars/count?budget=2500000000
// Returns count of cars within budget range
export async function GET(request: NextRequest) {
  const budgetStr = request.nextUrl.searchParams.get("budget");
  const budget = budgetStr ? parseInt(budgetStr) : 0;

  if (!budget || budget <= 0) {
    const total = await prisma.car.count();
    return NextResponse.json({ count: total });
  }

  const count = await prisma.car.count({
    where: {
      priceMin: { lte: BigInt(budget) },
    },
  });

  return NextResponse.json({ count });
}
