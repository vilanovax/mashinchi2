import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse, isSuperAdmin } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

// GET: export full database backup as JSON
export async function GET(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const sp = request.nextUrl.searchParams;
  const scope = sp.get("scope") || "full"; // full | cars | users | settings

  try {
    const backup: Record<string, unknown> = {
      _meta: {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: session.username,
        scope,
      },
    };

    if (scope === "full" || scope === "cars") {
      // Cars with all related data
      const cars = await prisma.car.findMany({
        include: {
          scores: true,
          specs: true,
          tags: true,
          intel: true,
          reviews: true,
          prices: { orderBy: { date: "desc" }, take: 100 },
          sources: true,
          rawAnalyses: true,
        },
      });

      backup.cars = cars.map((car) => ({
        ...car,
        priceMin: car.priceMin.toString(),
        priceMax: car.priceMax.toString(),
        prices: car.prices.map((p) => ({
          ...p,
          price: p.price.toString(),
        })),
        sources: car.sources.map((s) => ({
          ...s,
        })),
      }));
    }

    if (scope === "full" || scope === "users") {
      const users = await prisma.user.findMany({
        include: {
          interactions: true,
          tasteProfile: true,
        },
      });

      backup.users = users.map((u) => ({
        ...u,
        budget: u.budget?.toString() || null,
      }));
    }

    if (scope === "full" || scope === "settings") {
      backup.appSettings = await prisma.appSettings.findMany();
      backup.crawlerConfigs = await prisma.crawlerConfig.findMany();
      backup.adminUsers = await prisma.adminUser.findMany({
        select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true },
      });
      backup.notifications = await prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }

    if (scope === "full") {
      backup.marketInsights = await prisma.marketInsight.findMany();

      const listingStats = await prisma.listingStats.findMany();
      backup.listingStats = listingStats.map((s) => ({
        ...s,
        avgPrice: s.avgPrice?.toString() || null,
        minPrice: s.minPrice?.toString() || null,
        maxPrice: s.maxPrice?.toString() || null,
      }));

      backup.auditLogs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      });
    }

    await logAction("export", "backup", undefined, { scope });

    // Return as downloadable JSON
    const json = JSON.stringify(backup, null, 2);

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mashinchi-backup-${scope}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (e) {
    console.error("Backup error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT: restore from backup JSON
export async function PUT(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { backup, mode } = body as { backup: any; mode: "full" | "merge" };
    // mode: "full" = wipe + restore, "merge" = only add new records

    if (!backup || !backup._meta) {
      return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
    }

    const result = { restored: 0, skipped: 0, errors: [] as string[] };

    // ── Restore Cars ──
    if (backup.cars && Array.isArray(backup.cars)) {
      if (mode === "full") {
        // Delete in correct order (relations first)
        await prisma.carRawAnalysis.deleteMany();
        await prisma.listingStats.deleteMany();
        await prisma.carSource.deleteMany();
        await prisma.priceHistory.deleteMany();
        await prisma.carReview.deleteMany();
        await prisma.carTag.deleteMany();
        await prisma.carIntelligence.deleteMany();
        await prisma.carScores.deleteMany();
        await prisma.carSpecs.deleteMany();
        await prisma.userInteraction.deleteMany();
        await prisma.car.deleteMany();
      }

      for (const carData of backup.cars) {
        try {
          const existing = await prisma.car.findFirst({
            where: { OR: [{ nameEn: carData.nameEn }, { nameFa: carData.nameFa }] },
          });

          if (existing && mode === "merge") {
            result.skipped++;
            continue;
          }

          // Delete existing if full mode
          if (existing && mode === "full") {
            await prisma.car.delete({ where: { id: existing.id } });
          }

          const car = await prisma.car.create({
            data: {
              nameEn: carData.nameEn,
              nameFa: carData.nameFa,
              brand: carData.brand,
              brandFa: carData.brandFa,
              category: carData.category,
              year: carData.year,
              priceMin: BigInt(carData.priceMin || "0"),
              priceMax: BigInt(carData.priceMax || "0"),
              origin: carData.origin,
              description: carData.description || null,
              imageUrl: carData.imageUrl || null,
              isNew: carData.isNew ?? true,
            },
          });

          // Scores
          if (carData.scores) {
            const { id: _id, carId: _cid, ...scoreFields } = carData.scores;
            await prisma.carScores.create({ data: { carId: car.id, ...scoreFields } });
          }

          // Specs
          if (carData.specs) {
            const { id: _id, carId: _cid, ...specFields } = carData.specs;
            await prisma.carSpecs.create({ data: { carId: car.id, ...specFields } });
          }

          // Tags
          if (carData.tags?.length > 0) {
            const tags = carData.tags.map((t: any) => typeof t === "string" ? t : t.tag);
            await prisma.carTag.createMany({
              data: tags.map((tag: string) => ({ carId: car.id, tag })),
            });
          }

          // Intelligence
          if (carData.intel) {
            const { id: _id, carId: _cid, ...intelFields } = carData.intel;
            await prisma.carIntelligence.create({ data: { carId: car.id, ...intelFields } });
          }

          // Reviews
          if (carData.reviews?.length > 0) {
            for (const rev of carData.reviews) {
              const { id: _id, carId: _cid, createdAt: _ca, ...revFields } = rev;
              await prisma.carReview.create({ data: { carId: car.id, ...revFields } });
            }
          }

          // Prices
          if (carData.prices?.length > 0) {
            for (const price of carData.prices) {
              await prisma.priceHistory.create({
                data: {
                  carId: car.id,
                  price: BigInt(price.price || "0"),
                  date: new Date(price.date),
                  source: price.source || "manual",
                },
              });
            }
          }

          result.restored++;
        } catch (e) {
          result.errors.push(`${carData.nameFa || carData.nameEn}: ${(e as Error).message}`);
        }
      }
    }

    // ── Restore Settings ──
    if (backup.appSettings && Array.isArray(backup.appSettings)) {
      for (const setting of backup.appSettings) {
        try {
          await prisma.appSettings.upsert({
            where: { key: setting.key },
            update: { value: setting.value },
            create: { key: setting.key, value: setting.value },
          });
          result.restored++;
        } catch { /* skip */ }
      }
    }

    // ── Restore Crawlers ──
    if (backup.crawlerConfigs && Array.isArray(backup.crawlerConfigs)) {
      if (mode === "full") await prisma.crawlerConfig.deleteMany();
      for (const crawler of backup.crawlerConfigs) {
        try {
          const { id: _id, createdAt: _ca, updatedAt: _ua, ...fields } = crawler;
          if (mode === "merge") {
            const existing = await prisma.crawlerConfig.findFirst({ where: { name: fields.name } });
            if (existing) { result.skipped++; continue; }
          }
          await prisma.crawlerConfig.create({ data: fields });
          result.restored++;
        } catch { /* skip */ }
      }
    }

    // ── Restore Market Insights ──
    if (backup.marketInsights && Array.isArray(backup.marketInsights)) {
      if (mode === "full") await prisma.marketInsight.deleteMany();
      for (const insight of backup.marketInsights) {
        try {
          const { id: _id, createdAt: _ca, ...fields } = insight;
          await prisma.marketInsight.create({ data: { ...fields, date: new Date(fields.date) } });
          result.restored++;
        } catch { /* skip */ }
      }
    }

    await logAction("import", "restore", undefined, {
      mode, restored: result.restored, skipped: result.skipped, errors: result.errors.length,
      backupDate: backup._meta?.exportedAt,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Restore error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: get backup stats (without downloading)
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const [
    carsCount, scoresCount, specsCount, tagsCount, intelCount,
    reviewsCount, pricesCount, sourcesCount, rawAnalysesCount,
    usersCount, interactionsCount, tasteProfilesCount,
    crawlersCount, settingsCount, notificationsCount,
    marketInsightsCount, listingStatsCount, auditLogsCount,
    adminUsersCount,
  ] = await Promise.all([
    prisma.car.count(),
    prisma.carScores.count(),
    prisma.carSpecs.count(),
    prisma.carTag.count(),
    prisma.carIntelligence.count(),
    prisma.carReview.count(),
    prisma.priceHistory.count(),
    prisma.carSource.count(),
    prisma.carRawAnalysis.count(),
    prisma.user.count(),
    prisma.userInteraction.count(),
    prisma.userTasteProfile.count(),
    prisma.crawlerConfig.count(),
    prisma.appSettings.count(),
    prisma.notification.count(),
    prisma.marketInsight.count(),
    prisma.listingStats.count(),
    prisma.auditLog.count(),
    prisma.adminUser.count(),
  ]);

  return NextResponse.json({
    cars: {
      cars: carsCount,
      scores: scoresCount,
      specs: specsCount,
      tags: tagsCount,
      intelligence: intelCount,
      reviews: reviewsCount,
      prices: pricesCount,
      sources: sourcesCount,
      rawAnalyses: rawAnalysesCount,
    },
    users: {
      users: usersCount,
      interactions: interactionsCount,
      tasteProfiles: tasteProfilesCount,
    },
    system: {
      crawlers: crawlersCount,
      settings: settingsCount,
      notifications: notificationsCount,
      marketInsights: marketInsightsCount,
      listingStats: listingStatsCount,
      auditLogs: auditLogsCount,
      adminUsers: adminUsersCount,
    },
  });
}
