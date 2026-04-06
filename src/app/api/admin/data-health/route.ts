import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const _s = await verifyAdmin(request);
  if (!_s) return unauthorizedResponse();

  const cars = await prisma.car.findMany({
    include: {
      scores: true,
      specs: true,
      tags: true,
      intel: true,
      reviews: { select: { id: true } },
      prices: { select: { id: true }, take: 1 },
      sources: { select: { id: true, status: true } },
      rawAnalyses: { select: { id: true, status: true } },
    },
    orderBy: { nameFa: "asc" },
  });

  const result = cars.map((car) => {
    // Calculate data sections
    const hasScores = !!car.scores;
    const hasSpecs = !!car.specs;
    const hasTags = car.tags.length > 0;
    const hasIntel = !!car.intel;
    const hasReviews = car.reviews.length > 0;
    const hasPrices = car.prices.length > 0;
    const hasSources = car.sources.length > 0;
    const hasRawAnalysis = car.rawAnalyses.length > 0;
    const hasImage = !!car.imageUrl;
    const hasDescription = !!car.description && car.description.length > 10;

    // Score completeness (specs detail)
    let specsDetail = 0;
    if (car.specs) {
      const specFields = [
        car.specs.engine, car.specs.horsepower, car.specs.torque,
        car.specs.transmission, car.specs.fuelType, car.specs.fuelConsumption,
        car.specs.acceleration, car.specs.trunkVolume, car.specs.groundClearance,
        car.specs.length, car.specs.width, car.specs.weight,
      ];
      specsDetail = Math.round((specFields.filter(Boolean).length / specFields.length) * 100);
    }

    // Intel richness
    let intelDetail = 0;
    if (car.intel) {
      const intelFields = [
        car.intel.frequentPros.length > 0,
        car.intel.frequentCons.length > 0,
        car.intel.commonIssues.length > 0,
        car.intel.purchaseWarnings.length > 0,
        car.intel.ownerVerdict && car.intel.ownerVerdict.length > 5,
        car.intel.overallSummary && car.intel.overallSummary.length > 5,
        car.intel.whyBuy && car.intel.whyBuy.length > 5,
        car.intel.whyNotBuy && car.intel.whyNotBuy.length > 5,
      ];
      intelDetail = Math.round((intelFields.filter(Boolean).length / intelFields.length) * 100);
    }

    // Overall health score (weighted)
    const sections = [
      { has: hasScores, weight: 15, label: "امتیازها" },
      { has: hasSpecs, weight: 10, label: "مشخصات" },
      { has: hasTags, weight: 5, label: "تگ‌ها" },
      { has: hasIntel, weight: 25, label: "تحلیل هوشمند" },
      { has: hasReviews, weight: 10, label: "نظرات" },
      { has: hasPrices, weight: 10, label: "تاریخچه قیمت" },
      { has: hasSources, weight: 5, label: "منابع" },
      { has: hasRawAnalysis, weight: 10, label: "تحلیل خام" },
      { has: hasImage, weight: 5, label: "تصویر" },
      { has: hasDescription, weight: 5, label: "توضیحات" },
    ];

    const totalWeight = sections.reduce((s, sec) => s + sec.weight, 0);
    const earnedWeight = sections.reduce((s, sec) => s + (sec.has ? sec.weight : 0), 0);
    const healthScore = Math.round((earnedWeight / totalWeight) * 100);

    return {
      id: car.id,
      nameEn: car.nameEn,
      nameFa: car.nameFa,
      brandFa: car.brandFa,
      origin: car.origin,
      category: car.category,
      imageUrl: car.imageUrl,
      healthScore,
      sections: {
        scores: hasScores,
        specs: hasSpecs,
        specsDetail,
        tags: hasTags,
        tagsCount: car.tags.length,
        intel: hasIntel,
        intelDetail,
        reviews: hasReviews,
        reviewsCount: car.reviews.length,
        prices: hasPrices,
        sources: hasSources,
        sourcesCount: car.sources.length,
        sourcesApproved: car.sources.filter((s) => s.status === "approved").length,
        rawAnalysis: hasRawAnalysis,
        rawAnalysisCount: car.rawAnalyses.length,
        rawAnalysisProcessed: car.rawAnalyses.filter((r) => r.status === "processed").length,
        image: hasImage,
        description: hasDescription,
      },
      missing: sections.filter((s) => !s.has).map((s) => s.label),
    };
  });

  // Summary stats
  const avgHealth = Math.round(result.reduce((s, c) => s + c.healthScore, 0) / (result.length || 1));
  const complete = result.filter((c) => c.healthScore >= 80).length;
  const needsWork = result.filter((c) => c.healthScore < 50).length;

  return NextResponse.json({
    cars: result,
    summary: {
      total: result.length,
      avgHealth,
      complete,
      needsWork,
      noScores: result.filter((c) => !c.sections.scores).length,
      noIntel: result.filter((c) => !c.sections.intel).length,
      noRawAnalysis: result.filter((c) => !c.sections.rawAnalysis).length,
      noPrices: result.filter((c) => !c.sections.prices).length,
      noImage: result.filter((c) => !c.sections.image).length,
    },
  });
}
