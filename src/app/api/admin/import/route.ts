import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

interface ImportCar {
  nameEn: string;
  nameFa: string;
  brand?: string;
  brandFa: string;
  category: string;
  year?: number;
  priceMin: string | number;
  priceMax: string | number;
  origin: string;
  description?: string;
  tags?: string[];
  scores?: Record<string, number>;
  specs?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();

  const body = await request.json();
  const { cars, mode = "skip" } = body as { cars: ImportCar[]; mode: "skip" | "update" };

  if (!Array.isArray(cars) || cars.length === 0) {
    return NextResponse.json({ error: "cars array required" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const carData of cars) {
    try {
      if (!carData.nameEn || !carData.nameFa || !carData.brandFa || !carData.category || !carData.origin || !carData.priceMin || !carData.priceMax) {
        errors.push(`${carData.nameFa || carData.nameEn || "unknown"}: فیلدهای الزامی ناقص`);
        continue;
      }

      // Check if exists by nameEn
      const existing = await prisma.car.findFirst({ where: { nameEn: carData.nameEn } });

      if (existing) {
        if (mode === "update") {
          await prisma.car.update({
            where: { id: existing.id },
            data: {
              nameFa: carData.nameFa,
              brandFa: carData.brandFa,
              brand: carData.brand || carData.brandFa,
              category: carData.category,
              origin: carData.origin,
              year: carData.year || existing.year,
              priceMin: BigInt(carData.priceMin),
              priceMax: BigInt(carData.priceMax),
              description: carData.description || existing.description,
            },
          });

          if (carData.scores) {
            await prisma.carScores.upsert({
              where: { carId: existing.id },
              update: carData.scores,
              create: { carId: existing.id, ...carData.scores },
            });
          }

          if (carData.tags) {
            await prisma.carTag.deleteMany({ where: { carId: existing.id } });
            await prisma.carTag.createMany({
              data: carData.tags.map((tag) => ({ carId: existing.id, tag })),
            });
          }

          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      // Create new car
      const car = await prisma.car.create({
        data: {
          nameEn: carData.nameEn,
          nameFa: carData.nameFa,
          brand: carData.brand || carData.brandFa,
          brandFa: carData.brandFa,
          category: carData.category,
          origin: carData.origin,
          year: carData.year || 2024,
          priceMin: BigInt(carData.priceMin),
          priceMax: BigInt(carData.priceMax),
          description: carData.description || null,
        },
      });

      if (carData.scores) {
        await prisma.carScores.create({ data: { carId: car.id, ...carData.scores } });
      }

      if (carData.specs) {
        await prisma.carSpecs.create({ data: { carId: car.id, ...carData.specs as Record<string, number | string | null> } });
      }

      if (carData.tags) {
        await prisma.carTag.createMany({
          data: carData.tags.map((tag) => ({ carId: car.id, tag })),
        });
      }

      created++;
    } catch (e) {
      errors.push(`${carData.nameFa || carData.nameEn}: ${(e as Error).message}`);
    }
  }

  await logAction("import", "car", undefined, { total: cars.length, created, updated, skipped, errors: errors.length });

  return NextResponse.json({ total: cars.length, created, updated, skipped, errors });
}
