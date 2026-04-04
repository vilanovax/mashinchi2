import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

// POST - apply processed source data to car's review + intel + scores
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();
  const { id } = await params;

  const source = await prisma.carSource.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  if (source.status !== "processed" && source.status !== "approved") {
    return NextResponse.json({ error: "Source must be processed first" }, { status: 400 });
  }

  const carId = source.carId;
  const scores = source.extractedScores ? JSON.parse(source.extractedScores) : {};
  const applied: string[] = [];

  // 1. Create a review from this source
  if (source.processedSummary) {
    await prisma.carReview.create({
      data: {
        carId,
        source: source.sourceSite === "manual" ? "expert" : source.sourceSite,
        summary: source.processedSummary,
        pros: source.extractedPros,
        cons: source.extractedCons,
        warnings: source.extractedWarnings,
        rating: scores.rating ? parseFloat(scores.rating) : null,
      },
    });
    applied.push("review");
  }

  // 2. Merge into intel (append to existing arrays, update scores if better data)
  const existingIntel = await prisma.carIntelligence.findUnique({ where: { carId } });

  const mergedPros = [...new Set([...(existingIntel?.frequentPros || []), ...source.extractedPros])];
  const mergedCons = [...new Set([...(existingIntel?.frequentCons || []), ...source.extractedCons])];
  const mergedIssues = [...new Set([...(existingIntel?.commonIssues || []), ...source.extractedIssues])];
  const mergedWarnings = [...new Set([...(existingIntel?.purchaseWarnings || []), ...source.extractedWarnings])];

  const intelData: Record<string, unknown> = {
    frequentPros: mergedPros.slice(0, 6),
    frequentCons: mergedCons.slice(0, 5),
    commonIssues: mergedIssues.slice(0, 4),
    purchaseWarnings: mergedWarnings.slice(0, 3),
  };

  // Update text fields if source has better content
  if (source.processedSummary && (!existingIntel?.overallSummary || source.processedSummary.length > existingIntel.overallSummary.length)) {
    intelData.overallSummary = source.processedSummary;
  }

  // Update numeric scores from source
  if (scores.ownerSatisfaction) intelData.ownerSatisfaction = Math.round(scores.ownerSatisfaction);
  if (scores.purchaseRisk) intelData.purchaseRisk = Math.round(scores.purchaseRisk);

  if (existingIntel) {
    await prisma.carIntelligence.update({ where: { carId }, data: intelData });
  } else {
    await prisma.carIntelligence.create({
      data: {
        carId,
        frequentPros: intelData.frequentPros as string[] || [],
        frequentCons: intelData.frequentCons as string[] || [],
        commonIssues: intelData.commonIssues as string[] || [],
        purchaseWarnings: intelData.purchaseWarnings as string[] || [],
        overallSummary: source.processedSummary || "",
        ownerVerdict: source.processedSummary || "",
        whyBuy: "", whyNotBuy: "",
        ownerSatisfaction: (intelData.ownerSatisfaction as number) || 5,
        purchaseRisk: (intelData.purchaseRisk as number) || 5,
      },
    });
  }
  applied.push("intel");

  // 3. Average scores into CarScores (blend with existing)
  const scoreFields = [
    "comfort", "performance", "economy", "safety", "prestige",
    "reliability", "resaleValue", "familyFriendly", "sportiness",
    "offroad", "cityDriving", "longTrip", "maintenanceRisk", "afterSales",
  ];

  const existingScores = await prisma.carScores.findUnique({ where: { carId } });
  const scoreUpdate: Record<string, number> = {};

  for (const key of scoreFields) {
    const newVal = scores[key];
    if (typeof newVal === "number" && newVal >= 1 && newVal <= 10) {
      const oldVal = existingScores ? (existingScores as Record<string, unknown>)[key] as number : 5;
      // Weighted average: 60% existing + 40% new
      scoreUpdate[key] = Math.round(oldVal * 0.6 + newVal * 0.4);
    }
  }

  if (Object.keys(scoreUpdate).length > 0) {
    await prisma.carScores.upsert({
      where: { carId },
      update: scoreUpdate,
      create: { carId, ...scoreUpdate },
    });
    applied.push("scores");
  }

  // 4. Mark source as approved and applied
  await prisma.carSource.update({
    where: { id },
    data: { status: "approved", appliedAt: new Date() },
  });

  await logAction("update", "source", id, { action: "apply", carId, applied });

  return NextResponse.json({ success: true, applied });
}
