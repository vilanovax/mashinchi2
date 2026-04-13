import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cars/list — lightweight list of all cars (public, for selectors)
export async function GET() {
  const cars = await prisma.car.findMany({
    select: { id: true, nameFa: true, brandFa: true },
    orderBy: { nameFa: "asc" },
  });

  return NextResponse.json(cars);
}
