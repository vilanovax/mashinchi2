import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// User type labels in Farsi
const USER_TYPE_LABELS: Record<string, string> = {
  typeEconomic: "اقتصادی",
  typeFamily: "خانوادگی",
  typeSport: "اسپرت",
  typePrestige: "پرستیژمحور",
  typeSafe: "کم‌ریسک",
  typeSpecial: "خاص‌پسند",
  typeOffroad: "آفرودی",
  typeCity: "شهری",
  typeTravel: "سفرمحور",
  typeInvestment: "سرمایه‌ای",
};

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("mashinchi_session")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "No session found" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { sessionId },
    include: {
      tasteProfile: true,
      interactions: true,
    },
  });

  if (!user || !user.tasteProfile) {
    return NextResponse.json({ error: "No taste profile" }, { status: 400 });
  }

  const interactedCarIds = user.interactions.map((i) => i.carId);
  const likedCarIds = user.interactions
    .filter((i) => i.action === "like")
    .map((i) => i.carId);

  // Get all cars with full data
  const allCars = await prisma.car.findMany({
    include: {
      scores: true,
      specs: true,
      tags: true,
      reviews: true,
      intel: true,
    },
  });

  const profile = user.tasteProfile;
  const dimensions = [
    "comfort", "performance", "economy", "safety", "prestige",
    "reliability", "resaleValue", "familyFriendly", "sportiness",
    "offroad", "cityDriving", "longTrip",
  ] as const;

  // Detect dominant user types (top 3)
  const typeScores = Object.keys(USER_TYPE_LABELS).map((key) => ({
    key,
    label: USER_TYPE_LABELS[key],
    score: (profile as Record<string, unknown>)[key] as number || 0,
  }));
  typeScores.sort((a, b) => b.score - a.score);
  const dominantTypes = typeScores.filter((t) => t.score > 0).slice(0, 3);

  // Filter candidates by budget (±20%)
  const budgetFilter = user.budget
    ? {
        min: BigInt(Math.floor(Number(user.budget) * 0.8)),
        max: BigInt(Math.floor(Number(user.budget) * 1.2)),
      }
    : null;

  // Score each car
  const scored = allCars
    .filter((car) => {
      if (budgetFilter) {
        return car.priceMin <= budgetFilter.max && car.priceMax >= budgetFilter.min;
      }
      return true;
    })
    .map((car) => {
      let matchScore = 0;
      const matchReasons: string[] = [];
      const risks: string[] = [];

      if (car.scores) {
        for (const dim of dimensions) {
          const userPref = (profile[dim] as number) || 0;
          const carScore = (car.scores[dim] as number) || 5;
          matchScore += userPref * (carScore / 10);
        }
      }

      // Factor in reviews
      if (car.reviews.length > 0) {
        const avgRating = car.reviews.reduce((sum, r) => sum + (r.rating || 3), 0) / car.reviews.length;
        matchScore += (avgRating - 3) * 2;
        const totalWarnings = car.reviews.reduce((sum, r) => sum + r.warnings.length, 0);
        matchScore -= totalWarnings * 0.3;
      }

      // Boost liked cars
      if (likedCarIds.includes(car.id)) {
        matchScore += 3;
      }

      // Penalize already-seen (non-liked) cars slightly
      if (interactedCarIds.includes(car.id) && !likedCarIds.includes(car.id)) {
        matchScore -= 5;
      }

      // Generate match reasons based on user types and car strengths
      if (car.scores) {
        const strongDims = dimensions
          .filter((d) => (car.scores![d] as number) >= 7)
          .map((d) => d);

        if (dominantTypes.length > 0) {
          if (dominantTypes.some((t) => t.key === "typeFamily") && (car.scores.familyFriendly >= 7 || car.scores.safety >= 7)) {
            matchReasons.push("مناسب خانواده با ایمنی بالا");
          }
          if (dominantTypes.some((t) => t.key === "typeEconomic") && (car.scores.economy >= 7 || car.scores.resaleValue >= 7)) {
            matchReasons.push("اقتصادی و نقدشونده");
          }
          if (dominantTypes.some((t) => t.key === "typeSport") && (car.scores.sportiness >= 7 || car.scores.performance >= 7)) {
            matchReasons.push("اسپرت و پرقدرت");
          }
          if (dominantTypes.some((t) => t.key === "typePrestige") && car.scores.prestige >= 7) {
            matchReasons.push("کلاس و پرستیژ بالا");
          }
          if (dominantTypes.some((t) => t.key === "typeSafe") && car.scores.reliability >= 7) {
            matchReasons.push("مطمئن و کم‌ریسک");
          }
          if (dominantTypes.some((t) => t.key === "typeCity") && car.scores.cityDriving >= 7) {
            matchReasons.push("عالی برای شهر");
          }
          if (dominantTypes.some((t) => t.key === "typeTravel") && car.scores.longTrip >= 7) {
            matchReasons.push("ایده‌آل برای سفر");
          }
          if (dominantTypes.some((t) => t.key === "typeInvestment") && car.scores.resaleValue >= 8) {
            matchReasons.push("ارزش سرمایه‌گذاری بالا");
          }
        }

        // General strength reasons
        if (strongDims.includes("comfort") && !matchReasons.some((r) => r.includes("راحت"))) {
          matchReasons.push("راحتی بالا");
        }
        if (strongDims.includes("economy") && !matchReasons.some((r) => r.includes("اقتصادی"))) {
          matchReasons.push("مصرف بهینه");
        }
      }

      // Generate risks from intel + scores
      if (car.scores && car.scores.maintenanceRisk >= 7) {
        risks.push("ریسک نگهداری بالا");
      }
      if (car.intel) {
        if (car.intel.purchaseRisk >= 7) risks.push("ریسک خرید بالا");
        if (car.intel.repairCost >= 7) risks.push("هزینه تعمیر بالا");
        if (car.intel.priceDropRate >= 7) risks.push("افت قیمت سریع");
        if (car.intel.secondHandMarket <= 3) risks.push("بازار دست‌دوم ضعیف");
        if (car.intel.purchaseWarnings.length > 0) {
          risks.push(...car.intel.purchaseWarnings.slice(0, 1));
        }
      }

      // Limit reasons
      if (matchReasons.length === 0) {
        matchReasons.push("تناسب قیمتی خوب");
      }

      return {
        id: car.id,
        nameFa: car.nameFa,
        nameEn: car.nameEn,
        brandFa: car.brandFa,
        category: car.category,
        origin: car.origin,
        priceMin: car.priceMin.toString(),
        priceMax: car.priceMax.toString(),
        description: car.description || "",
        tags: car.tags.map((t) => t.tag),
        scores: car.scores as unknown as Record<string, number>,
        specs: car.specs,
        reviews: car.reviews.map((r) => ({
          source: r.source,
          summary: r.summary,
          pros: r.pros,
          cons: r.cons,
          warnings: r.warnings,
          rating: r.rating,
        })),
        intel: car.intel
          ? {
              frequentPros: car.intel.frequentPros,
              frequentCons: car.intel.frequentCons,
              commonIssues: car.intel.commonIssues,
              purchaseWarnings: car.intel.purchaseWarnings,
              ownerVerdict: car.intel.ownerVerdict,
              overallSummary: car.intel.overallSummary,
              whyBuy: car.intel.whyBuy,
              whyNotBuy: car.intel.whyNotBuy,
              purchaseRisk: car.intel.purchaseRisk,
              ownerSatisfaction: car.intel.ownerSatisfaction,
              suitFamily: car.intel.suitFamily,
              suitCity: car.intel.suitCity,
              suitTravel: car.intel.suitTravel,
              suitYoung: car.intel.suitYoung,
              suitInvestment: car.intel.suitInvestment,
            }
          : null,
        matchScore: Math.round(matchScore * 100) / 100,
        matchReasons: matchReasons.slice(0, 3),
        risks: risks.slice(0, 3),
        isLiked: likedCarIds.includes(car.id),
      };
    });

  // Sort by match score, top 5
  scored.sort((a, b) => b.matchScore - a.matchScore);
  const top = scored.slice(0, 5);

  // Find alternatives: best cars NOT in top 5 and from different origins
  const topOrigins = new Set(top.map((c) => c.origin));
  const alternatives = scored
    .filter((c) => !top.some((t) => t.id === c.id))
    .filter((c) => !topOrigins.has(c.origin) || scored.indexOf(c) > 5)
    .slice(0, 3)
    .map((c) => ({
      id: c.id,
      nameFa: c.nameFa,
      nameEn: c.nameEn,
      brandFa: c.brandFa,
      category: c.category,
      origin: c.origin,
      priceMin: c.priceMin,
      priceMax: c.priceMax,
      matchScore: c.matchScore,
      matchReasons: c.matchReasons,
    }));

  return NextResponse.json({
    recommendations: top,
    alternatives,
    userTypes: dominantTypes.map((t) => t.label),
    tasteProfile: profile,
    totalInteractions: user.interactions.length,
  });
}
