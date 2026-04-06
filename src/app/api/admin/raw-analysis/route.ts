import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

// GET: list raw analyses
export async function GET(request: NextRequest) {
  const _s = await verifyAdmin(request);
  if (!_s) return unauthorizedResponse();

  try {
  const sp = request.nextUrl.searchParams;
  const carId = sp.get("carId");
  const status = sp.get("status");

  const analyses = await prisma.carRawAnalysis.findMany({
    where: {
      ...(carId ? { carId } : {}),
      ...(status ? { status } : {}),
    },
    include: { car: { select: { nameFa: true, brandFa: true, nameEn: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(analyses.map((a) => ({
    id: a.id,
    carId: a.carId,
    nameFa: a.car.nameFa,
    brandFa: a.car.brandFa,
    nameEn: a.car.nameEn,
    pros: a.pros,
    cons: a.cons,
    commonProblems: a.commonProblems,
    buyReasons: a.buyReasons,
    avoidReasons: a.avoidReasons,
    statementsCount: a.statements ? JSON.parse(a.statements).length : 0,
    featureStatsCount: a.featureStats ? JSON.parse(a.featureStats).length : 0,
    status: a.status,
    sourceLabel: a.sourceLabel,
    version: a.version,
    processedAt: a.processedAt?.toISOString() || null,
    createdAt: a.createdAt.toISOString(),
  })));
  } catch (e) {
    console.error("Raw analysis GET error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: import raw analysis (single or bulk)
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  const action = body.action || "import"; // "import" | "process"

  if (action === "import") {
    return handleImport(body, session);
  }
  if (action === "process") {
    return handleProcess(body, session);
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

// ── Import raw analysis ──
async function handleImport(
  body: any,
  session: { id: string },
) {
  // Support single or array
  let items: any[] = body.items || (body.data ? [body.data] : []);
  if (items.length === 0) {
    return NextResponse.json({ error: "no data provided" }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of items) {
    // Find car by name
    const carName = item.car || item.nameEn || item.nameFa;
    if (!carName) {
      errors.push("missing car name in item");
      skipped++;
      continue;
    }

    const car = await prisma.car.findFirst({
      where: {
        OR: [
          { nameFa: { contains: carName } },
          { nameEn: { contains: carName, mode: "insensitive" } },
        ],
      },
    });

    if (!car) {
      errors.push(`car not found: ${carName}`);
      skipped++;
      continue;
    }

    await prisma.carRawAnalysis.create({
      data: {
        carId: car.id,
        rawJson: JSON.stringify(item),
        pros: item.pros || [],
        cons: item.cons || [],
        commonProblems: item.common_problems || item.commonProblems || [],
        buyReasons: item.buy_reasons || item.buyReasons || [],
        avoidReasons: item.avoid_reasons || item.avoidReasons || [],
        statements: item.extracted_statements
          ? JSON.stringify(item.extracted_statements)
          : null,
        featureStats: item.feature_statistics
          ? JSON.stringify(item.feature_statistics)
          : null,
        sourceLabel: body.sourceLabel || "AI extraction",
        status: "pending",
      },
    });

    imported++;
  }

  await logAction("import", "raw_analysis", undefined, { imported, skipped, errors });

  return NextResponse.json({ imported, skipped, errors });
}

// ── Process raw analysis → generate scores ──
async function handleProcess(
  body: { analysisId: string },
  session: { id: string },
) {
  const analysis = await prisma.carRawAnalysis.findUnique({
    where: { id: body.analysisId },
    include: { car: { select: { id: true, nameFa: true } } },
  });

  if (!analysis) {
    return NextResponse.json({ error: "analysis not found" }, { status: 404 });
  }

  // Parse feature statistics to generate scores
  const featureStats: { feature: string; positive_count: number; negative_count: number; overall_result: string }[] =
    analysis.featureStats ? JSON.parse(analysis.featureStats) : [];

  const statements: { feature: string; sentiment: string; importance: string }[] =
    analysis.statements ? JSON.parse(analysis.statements) : [];

  // Generate scores from feature statistics
  const scoreMap: Record<string, number> = {};
  for (const fs of featureStats) {
    const total = fs.positive_count + fs.negative_count;
    if (total === 0) continue;
    // Score: 1-10 based on positive ratio, weighted
    const ratio = fs.positive_count / total;
    scoreMap[fs.feature] = Math.round(ratio * 6 + 4); // range 4-10 for features with data
    if (fs.overall_result === "negative") scoreMap[fs.feature] = Math.min(scoreMap[fs.feature], 5);
    if (fs.overall_result === "positive") scoreMap[fs.feature] = Math.max(scoreMap[fs.feature], 6);
  }

  // Also factor in statement importance + sentiment
  for (const stmt of statements) {
    const weight = stmt.importance === "high" ? 1.5 : stmt.importance === "medium" ? 1 : 0.5;
    if (!scoreMap[stmt.feature]) scoreMap[stmt.feature] = 5;
    if (stmt.sentiment === "positive") scoreMap[stmt.feature] = Math.min(10, Math.round(scoreMap[stmt.feature] + weight));
    if (stmt.sentiment === "negative") scoreMap[stmt.feature] = Math.max(1, Math.round(scoreMap[stmt.feature] - weight));
  }

  // Map feature names to CarScores fields
  const carScores = {
    comfort: scoreMap["ride_comfort"] || 5,
    performance: scoreMap["acceleration"] || scoreMap["engine"] || 5,
    economy: invertScore(scoreMap["fuel_consumption"] || 5), // lower consumption = higher economy
    safety: scoreMap["brake"] || 5,
    prestige: scoreMap["design"] || 5,
    reliability: scoreMap["reliability"] || 5,
    resaleValue: scoreMap["resale"] || 5,
    familyFriendly: scoreMap["space"] || 5,
    sportiness: scoreMap["handling"] || 5,
    offroad: scoreMap["suspension"] || 3,
    cityDriving: scoreMap["features_and_equipment"] || 5,
    longTrip: Math.round(((scoreMap["ride_comfort"] || 5) + (scoreMap["cabin_noise"] || 5)) / 2),
    maintenanceRisk: invertScore(scoreMap["maintenance_cost"] || scoreMap["reliability"] || 5),
    afterSales: scoreMap["service"] || 5,
  };

  // Map to CarIntelligence fields
  const carIntel = {
    acceleration: scoreMap["acceleration"] || 5,
    depreciation: invertScore(scoreMap["resale"] || 5),
    repairCost: invertScore(scoreMap["spare_parts"] || 5),
    secondHandMarket: scoreMap["resale"] || 5,
    priceDropRate: 5,
    buildQuality: scoreMap["build_quality"] || scoreMap["interior_quality"] || 5,
    afterSalesService: scoreMap["service"] || 5,
    ownerSatisfaction: scoreMap["overall_satisfaction"] || 5,
    purchaseRisk: invertScore(scoreMap["reliability"] || 5),
    fuelEconomy: invertScore(scoreMap["fuel_consumption"] || 5),
    suitFamily: scoreMap["space"] || scoreMap["ride_comfort"] || 5,
    suitCity: scoreMap["features_and_equipment"] || 5,
    suitTravel: Math.round(((scoreMap["ride_comfort"] || 5) + (scoreMap["trunk"] || 5)) / 2),
    suitYoung: scoreMap["design"] || scoreMap["features_and_equipment"] || 5,
    suitInvestment: scoreMap["resale"] || 5,
    frequentPros: analysis.pros,
    frequentCons: analysis.cons,
    commonIssues: analysis.commonProblems,
    purchaseWarnings: analysis.commonProblems.slice(0, 3),
    ownerVerdict: analysis.pros.length > 0
      ? `${analysis.pros[0]}، اما ${analysis.cons[0] || "نکات منفی محدودی دارد"}.`
      : "نظر کاربران ثبت نشده.",
    overallSummary: `بر اساس تحلیل نظرات کاربران، نقاط قوت اصلی شامل ${analysis.pros.slice(0, 2).join(" و ")} و نقاط ضعف شامل ${analysis.cons.slice(0, 2).join(" و ")} است.`,
    whyBuy: analysis.buyReasons.join("، "),
    whyNotBuy: analysis.avoidReasons.join("، "),
  };

  // Upsert CarScores
  await prisma.carScores.upsert({
    where: { carId: analysis.carId },
    update: carScores,
    create: { carId: analysis.carId, ...carScores },
  });

  // Upsert CarIntelligence
  await prisma.carIntelligence.upsert({
    where: { carId: analysis.carId },
    update: carIntel,
    create: { carId: analysis.carId, ...carIntel },
  });

  // Mark as processed
  await prisma.carRawAnalysis.update({
    where: { id: analysis.id },
    data: {
      status: "processed",
      processedAt: new Date(),
      processLog: JSON.stringify({
        scores: carScores,
        intel: { ...carIntel, frequentPros: undefined, frequentCons: undefined },
        scoreMap,
      }),
    },
  });

  await logAction("update", "raw_analysis", analysis.id, {
    carId: analysis.carId, nameFa: analysis.car.nameFa, action: "processed",
  });

  return NextResponse.json({
    ok: true,
    carId: analysis.carId,
    scores: carScores,
    intelScores: {
      acceleration: carIntel.acceleration,
      ownerSatisfaction: carIntel.ownerSatisfaction,
      purchaseRisk: carIntel.purchaseRisk,
    },
  });
}

function invertScore(score: number): number {
  return Math.max(1, Math.min(10, 11 - score));
}

// DELETE
export async function DELETE(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.carRawAnalysis.delete({ where: { id } });
  await logAction("delete", "raw_analysis", id);

  return NextResponse.json({ ok: true });
}
