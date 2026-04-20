import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { fetchAllCandidates, getSourcesByNames, ALL_SOURCES } from "@/lib/imageSources";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const s = await verifyAdmin(request);
  if (!s) return unauthorizedResponse();

  const { carIds, sources = ALL_SOURCES.map((x) => x.name), perSourceLimit = 5 } = await request.json();

  if (!Array.isArray(carIds) || carIds.length === 0) {
    return NextResponse.json({ error: "carIds required" }, { status: 400 });
  }
  if (carIds.length > 20) {
    return NextResponse.json({ error: "حداکثر ۲۰ خودرو در هر درخواست" }, { status: 400 });
  }

  const selected = getSourcesByNames(sources);
  if (selected.length === 0) {
    return NextResponse.json({ error: "هیچ منبعی انتخاب نشده" }, { status: 400 });
  }

  const cars = await prisma.car.findMany({
    where: { id: { in: carIds } },
    select: { id: true, brand: true, brandFa: true, nameEn: true, nameFa: true, year: true },
  });

  const results = await Promise.all(
    cars.map(async (c) => {
      const query = {
        brand: c.brand,
        brandFa: c.brandFa,
        nameEn: c.nameEn,
        nameFa: c.nameFa,
        year: c.year,
      };
      try {
        const { candidates, sourceResults } = await fetchAllCandidates(query, selected, perSourceLimit);
        return { carId: c.id, candidates, sourceResults };
      } catch {
        return { carId: c.id, candidates: [], sourceResults: [] };
      }
    })
  );

  return NextResponse.json({ results });
}
