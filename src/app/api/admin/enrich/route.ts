import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { callAI } from "@/lib/ai-provider";
import { logAction } from "@/lib/auditLog";

// POST - enrich a single car with rich AI-generated data
// Body: { carId, apply?: boolean }
// apply=false (default) → preview only, returns generated data + diff
// apply=true → writes to DB
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  const { carId, apply = false } = body;
  if (!carId) return NextResponse.json({ error: "carId required" }, { status: 400 });

  const car = await prisma.car.findUnique({
    where: { id: carId },
    include: { scores: true, specs: true, tags: true, intel: true, reviews: { select: { id: true, source: true } } },
  });

  if (!car) return NextResponse.json({ error: "Car not found" }, { status: 404 });

  // Existing data snapshot (for diff)
  const existing = {
    description: car.description || "",
    overallSummary: car.intel?.overallSummary || "",
    whyBuy: car.intel?.whyBuy || "",
    whyNotBuy: car.intel?.whyNotBuy || "",
    ownerVerdict: car.intel?.ownerVerdict || "",
    frequentPros: car.intel?.frequentPros || [],
    frequentCons: car.intel?.frequentCons || [],
    commonIssues: car.intel?.commonIssues || [],
    purchaseWarnings: car.intel?.purchaseWarnings || [],
    ownerSatisfaction: car.intel?.ownerSatisfaction ?? 0,
    purchaseRisk: car.intel?.purchaseRisk ?? 0,
    reviewCount: car.reviews.length,
  };

  const prompt = `تو یک کارشناس حرفه‌ای خودرو در بازار ایران هستی. لطفا برای خودروی زیر اطلاعات بسیار دقیق و کاربردی تولید کن.

خودرو: ${car.nameFa} (${car.nameEn})
برند: ${car.brandFa}
دسته: ${car.category} | مبدا: ${car.origin}
قیمت: ${car.priceMin.toString()} تا ${car.priceMax.toString()} تومان
${car.specs ? `موتور: ${car.specs.engine || "-"} | ${car.specs.horsepower || "-"} اسب | گیربکس: ${car.specs.transmission || "-"} | مصرف: ${car.specs.fuelConsumption || "-"} لیتر` : ""}

خروجی JSON بده. دقت کن:
- متون طبیعی و انسانی باشن، نه خشک و رباتیک
- از تجربه واقعی مالکان و کارشناسان بنویس
- قیمت‌ها و شرایط بازار ایران رو در نظر بگیر
- خیلی دقیق و جزئی باش

{
  "description": "توصیف ۳-۴ جمله‌ای جذاب و صمیمانه. مثل یک دوست آگاه صحبت کن.",
  "overallSummary": "جمع‌بندی ۴-۵ جمله‌ای حرفه‌ای.",
  "whyBuy": "۲-۳ جمله دقیق. دلایل واقعی خرید.",
  "whyNotBuy": "۲-۳ جمله صادقانه. مشکلات واقعی.",
  "ownerVerdict": "۲-۳ جمله از زبان مالکان واقعی.",
  "frequentPros": ["نقطه قوت ۱ با جزئیات", "نقطه قوت ۲", "نقطه قوت ۳", "نقطه قوت ۴", "نقطه قوت ۵"],
  "frequentCons": ["نقطه ضعف ۱ دقیق و واقعی", "نقطه ضعف ۲", "نقطه ضعف ۳", "نقطه ضعف ۴"],
  "commonIssues": ["خرابی رایج ۱ فنی با هزینه", "خرابی ۲", "خرابی ۳"],
  "purchaseWarnings": ["هشدار خرید ۱ عملی", "هشدار ۲"],
  "reviewExpert": { "summary": "بررسی کارشناسی ۳-۴ جمله", "pros": ["مزیت ۱","مزیت ۲","مزیت ۳"], "cons": ["عیب ۱","عیب ۲"], "rating": 3.5 },
  "reviewUser": { "summary": "نظر مالک بعد ۶ ماه استفاده", "pros": ["مزیت ۱","مزیت ۲"], "cons": ["عیب ۱"], "rating": 3.2 },
  "scores": { "ownerSatisfaction": 7, "purchaseRisk": 4 }
}

فقط JSON خالص بده. فقط فارسی. واقع‌بینانه.`;

  try {
    const text = await callAI(prompt, 3000);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "پاسخ AI قابل پارس نیست", raw: text.slice(0, 500) }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);

    // Build diff
    const generated: Record<string, { old: string | string[] | number; new: string | string[] | number; changed: boolean }> = {};

    const textFields = ["description", "overallSummary", "whyBuy", "whyNotBuy", "ownerVerdict"] as const;
    for (const key of textFields) {
      const oldVal = existing[key] as string;
      const newVal = (data[key] || "") as string;
      generated[key] = { old: oldVal, new: newVal, changed: oldVal !== newVal && newVal.length > 0 };
    }

    const arrayFields = ["frequentPros", "frequentCons", "commonIssues", "purchaseWarnings"] as const;
    for (const key of arrayFields) {
      const oldVal = existing[key] as string[];
      const newVal = (data[key] || []) as string[];
      generated[key] = { old: oldVal, new: newVal, changed: newVal.length > 0 };
    }

    // Scores
    const scoreFields = ["ownerSatisfaction", "purchaseRisk"];
    for (const key of scoreFields) {
      const oldVal = existing[key as keyof typeof existing] as number;
      const newVal = data.scores?.[key] ?? oldVal;
      generated[key] = { old: oldVal, new: newVal, changed: oldVal !== newVal };
    }

    // Reviews
    generated.reviews = {
      old: existing.reviewCount,
      new: existing.reviewCount + (data.reviewExpert ? 1 : 0) + (data.reviewUser ? 1 : 0),
      changed: !!(data.reviewExpert || data.reviewUser),
    };

    // Count changes
    const changedFields = Object.values(generated).filter((g) => g.changed).length;
    const source = "دانش عمومی AI (بدون منابع واقعی)";

    // ─── Preview Only ───
    if (!apply) {
      return NextResponse.json({
        success: true,
        preview: true,
        carId,
        nameFa: car.nameFa,
        source,
        changedFields,
        generated,
        rawData: data, // full AI output for apply
      });
    }

    // ─── Apply ───
    // Update description
    if (data.description) {
      await prisma.car.update({ where: { id: carId }, data: { description: data.description } });
    }

    // Update intel
    const intelData: Record<string, unknown> = {};
    if (data.overallSummary) intelData.overallSummary = data.overallSummary;
    if (data.whyBuy) intelData.whyBuy = data.whyBuy;
    if (data.whyNotBuy) intelData.whyNotBuy = data.whyNotBuy;
    if (data.ownerVerdict) intelData.ownerVerdict = data.ownerVerdict;
    if (data.frequentPros) intelData.frequentPros = data.frequentPros;
    if (data.frequentCons) intelData.frequentCons = data.frequentCons;
    if (data.commonIssues) intelData.commonIssues = data.commonIssues;
    if (data.purchaseWarnings) intelData.purchaseWarnings = data.purchaseWarnings;
    if (data.scores) {
      for (const [k, v] of Object.entries(data.scores)) {
        if (typeof v === "number") intelData[k] = Math.min(10, Math.max(1, Math.round(v as number)));
      }
    }

    if (Object.keys(intelData).length > 0) {
      const existingIntel = await prisma.carIntelligence.findUnique({ where: { carId } });
      if (existingIntel) {
        await prisma.carIntelligence.update({ where: { carId }, data: intelData });
      } else {
        await prisma.carIntelligence.create({
          data: {
            carId,
            overallSummary: (intelData.overallSummary as string) || "",
            ownerVerdict: (intelData.ownerVerdict as string) || "",
            whyBuy: (intelData.whyBuy as string) || "",
            whyNotBuy: (intelData.whyNotBuy as string) || "",
            frequentPros: (intelData.frequentPros as string[]) || [],
            frequentCons: (intelData.frequentCons as string[]) || [],
            commonIssues: (intelData.commonIssues as string[]) || [],
            purchaseWarnings: (intelData.purchaseWarnings as string[]) || [],
          },
        });
      }
    }

    // Create reviews
    const reviewsCreated: string[] = [];
    if (data.reviewExpert) {
      await prisma.carReview.create({
        data: {
          carId, source: "expert",
          summary: data.reviewExpert.summary || "",
          pros: data.reviewExpert.pros || [],
          cons: data.reviewExpert.cons || [],
          warnings: data.reviewExpert.warnings || [],
          rating: data.reviewExpert.rating || null,
        },
      });
      reviewsCreated.push("expert");
    }
    if (data.reviewUser) {
      await prisma.carReview.create({
        data: {
          carId, source: "user",
          summary: data.reviewUser.summary || "",
          pros: data.reviewUser.pros || [],
          cons: data.reviewUser.cons || [],
          warnings: data.reviewUser.warnings || [],
          rating: data.reviewUser.rating || null,
        },
      });
      reviewsCreated.push("user");
    }

    await logAction("update", "car", carId, { action: "enrich", nameFa: car.nameFa, changedFields });

    return NextResponse.json({
      success: true,
      applied: true,
      carId,
      nameFa: car.nameFa,
      source,
      changedFields,
      generated,
    });
  } catch (error) {
    console.error("[enrich] Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `غنی‌سازی ناموفق: ${errMsg}` }, { status: 500 });
  }
}

// GET - list cars with enrichment status
export async function GET(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const cars = await prisma.car.findMany({
    select: {
      id: true, nameFa: true, brandFa: true, origin: true, description: true,
      intel: { select: { overallSummary: true, frequentPros: true, ownerSatisfaction: true } },
      reviews: { select: { id: true } },
    },
    orderBy: { nameFa: "asc" },
  });

  return NextResponse.json(cars.map((c) => ({
    id: c.id,
    nameFa: c.nameFa,
    brandFa: c.brandFa,
    origin: c.origin,
    hasDescription: !!c.description && c.description.length > 20,
    hasRichIntel: !!c.intel?.overallSummary && c.intel.overallSummary.length > 50,
    prosCount: c.intel?.frequentPros.length || 0,
    reviewCount: c.reviews.length,
    satisfaction: c.intel?.ownerSatisfaction || 0,
  })));
}
