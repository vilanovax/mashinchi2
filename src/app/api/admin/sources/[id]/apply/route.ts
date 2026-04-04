import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

// POST - apply processed source data with smart merge
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();
  const { id } = await params;

  const source = await prisma.carSource.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  if (source.status !== "processed") {
    return NextResponse.json({ error: "Source must be processed first" }, { status: 400 });
  }

  const carId = source.carId;
  const storedData = source.extractedScores ? JSON.parse(source.extractedScores) : {};
  const scoreComparisons = storedData.scores || {};
  const applied: string[] = [];

  // 1. Create review
  if (source.processedSummary) {
    await prisma.carReview.create({
      data: {
        carId,
        source: source.sourceSite === "manual" ? "expert" : source.sourceSite,
        summary: source.processedSummary,
        pros: source.extractedPros,
        cons: source.extractedCons,
        warnings: source.extractedWarnings,
        rating: storedData.rating ? parseFloat(String(storedData.rating)) : null,
      },
    });
    applied.push("review");
  }

  // 2. Smart merge intel
  const existingIntel = await prisma.carIntelligence.findUnique({ where: { carId } });

  // Deduplicate by checking substring similarity
  const dedup = (existing: string[], newItems: string[], maxTotal: number) => {
    const merged = [...existing];
    for (const item of newItems) {
      const isDuplicate = merged.some((m) =>
        m.includes(item.slice(0, 20)) || item.includes(m.slice(0, 20)) || m === item
      );
      if (!isDuplicate && merged.length < maxTotal) {
        merged.push(item);
      }
    }
    return merged;
  };

  const mergedPros = dedup(existingIntel?.frequentPros || [], source.extractedPros, 6);
  const mergedCons = dedup(existingIntel?.frequentCons || [], source.extractedCons, 5);
  const mergedIssues = dedup(existingIntel?.commonIssues || [], source.extractedIssues, 4);
  const mergedWarnings = dedup(existingIntel?.purchaseWarnings || [], source.extractedWarnings, 3);

  const intelData: Record<string, unknown> = {
    frequentPros: mergedPros,
    frequentCons: mergedCons,
    commonIssues: mergedIssues,
    purchaseWarnings: mergedWarnings,
  };

  // Update summary only if new one is longer/better
  if (source.processedSummary && (!existingIntel?.overallSummary || source.processedSummary.length > existingIntel.overallSummary.length * 0.8)) {
    intelData.overallSummary = source.processedSummary;
  }

  // Update satisfaction/risk only if changed
  const ownerSat = storedData.ownerSatisfaction;
  const purchaseRisk = storedData.purchaseRisk;
  if (ownerSat) {
    const val = typeof ownerSat === "object" ? ownerSat.value : ownerSat;
    if (typeof val === "number") intelData.ownerSatisfaction = Math.round(val);
  }
  if (purchaseRisk) {
    const val = typeof purchaseRisk === "object" ? purchaseRisk.value : purchaseRisk;
    if (typeof val === "number") intelData.purchaseRisk = Math.round(val);
  }

  if (existingIntel) {
    await prisma.carIntelligence.update({ where: { carId }, data: intelData });
  } else {
    await prisma.carIntelligence.create({
      data: {
        carId,
        frequentPros: mergedPros, frequentCons: mergedCons,
        commonIssues: mergedIssues, purchaseWarnings: mergedWarnings,
        overallSummary: source.processedSummary || "",
        ownerVerdict: source.processedSummary || "",
        whyBuy: "", whyNotBuy: "",
        ownerSatisfaction: intelData.ownerSatisfaction as number || 5,
        purchaseRisk: intelData.purchaseRisk as number || 5,
      },
    });
  }
  applied.push("intel");

  // 3. Smart score merge - only update scores that changed with weighted average
  const scoreFields = [
    "comfort", "performance", "economy", "safety", "prestige",
    "reliability", "resaleValue", "familyFriendly", "sportiness",
    "offroad", "cityDriving", "longTrip", "maintenanceRisk", "afterSales",
  ];

  const existingScores = await prisma.carScores.findUnique({ where: { carId } });
  const scoreUpdate: Record<string, number> = {};
  let scoresChanged = 0;

  for (const key of scoreFields) {
    const comparison = scoreComparisons[key];
    if (comparison && comparison.changed) {
      const oldVal = existingScores ? (existingScores as unknown as Record<string, number>)[key] || 5 : 5;
      // Weighted: 50% old + 50% new (equal weight since AI analyzed both)
      scoreUpdate[key] = Math.round(oldVal * 0.5 + comparison.new * 0.5);
      scoresChanged++;
    }
  }

  if (scoresChanged > 0) {
    await prisma.carScores.upsert({
      where: { carId },
      update: scoreUpdate,
      create: { carId, ...scoreUpdate },
    });
    applied.push(`scores (${scoresChanged} changed)`);
  }

  // 4. Mark as approved
  await prisma.carSource.update({
    where: { id },
    data: { status: "approved", appliedAt: new Date() },
  });

  await logAction("update", "source", id, { action: "smart_apply", carId, applied, scoresChanged });

  return NextResponse.json({
    success: true,
    applied,
    details: {
      prosAdded: mergedPros.length - (existingIntel?.frequentPros.length || 0),
      consAdded: mergedCons.length - (existingIntel?.frequentCons.length || 0),
      scoresChanged,
    },
  });
}
