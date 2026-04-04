import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { callAI } from "@/lib/ai-provider";
import { logAction } from "@/lib/auditLog";

// POST - enrich a single car with rich AI-generated data
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const { carId } = await request.json();
  if (!carId) return NextResponse.json({ error: "carId required" }, { status: 400 });

  const car = await prisma.car.findUnique({
    where: { id: carId },
    include: { scores: true, specs: true, tags: true, intel: true },
  });

  if (!car) return NextResponse.json({ error: "Car not found" }, { status: 404 });

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
  "description": "توصیف ۳-۴ جمله‌ای جذاب و صمیمانه. مثل یک دوست آگاه صحبت کن. بگو این ماشین چیه و برای چه کسی مناسبه.",

  "overallSummary": "جمع‌بندی ۴-۵ جمله‌ای حرفه‌ای. کلیت ماشین، جایگاه در بازار، ارزش خرید، و توصیه نهایی.",

  "whyBuy": "۲-۳ جمله دقیق. دلایل واقعی خرید با توجه به رقبا و شرایط بازار.",

  "whyNotBuy": "۲-۳ جمله صادقانه. مشکلات واقعی و دلایلی که ممکنه پشیمان بشی.",

  "ownerVerdict": "۲-۳ جمله از زبان مالکان واقعی. حس کلی بعد از چند ماه استفاده.",

  "frequentPros": [
    "نقطه قوت ۱ - با جزئیات (مثلا: صندلی‌های چرمی با تنظیم برقی ۸ جهته، در سفرهای طولانی خسته نمیشی)",
    "نقطه قوت ۲ - جزئی و ملموس",
    "نقطه قوت ۳",
    "نقطه قوت ۴",
    "نقطه قوت ۵"
  ],

  "frequentCons": [
    "نقطه ضعف ۱ - دقیق و واقعی (مثلا: صدای باد از درز درب عقب سمت راننده در سرعت بالای ۱۰۰)",
    "نقطه ضعف ۲",
    "نقطه ضعف ۳",
    "نقطه ضعف ۴"
  ],

  "commonIssues": [
    "خرابی رایج ۱ - مشخص و فنی (مثلا: خرابی سنسور اکسیژن بعد از ۵۰ هزار کیلومتر - هزینه تعویض حدود ۳ میلیون تومان)",
    "خرابی رایج ۲",
    "خرابی رایج ۳"
  ],

  "purchaseWarnings": [
    "هشدار خرید ۱ - عملی و مهم (مثلا: حتما قبل خرید گیربکس رو در سربالایی آزمایش کن)",
    "هشدار ۲"
  ],

  "reviewExpert": {
    "summary": "یک بررسی کارشناسی ۳-۴ جمله‌ای حرفه‌ای از دید یک کارشناس خودرو.",
    "pros": ["مزیت تخصصی ۱", "مزیت ۲", "مزیت ۳", "مزیت ۴"],
    "cons": ["عیب تخصصی ۱", "عیب ۲", "عیب ۳"],
    "warnings": ["هشدار تخصصی"],
    "rating": 3.5
  },

  "reviewUser": {
    "summary": "نظر یک مالک واقعی بعد از ۶ ماه استفاده روزانه. صمیمانه و خودمانی.",
    "pros": ["از نظر مالک مزیت ۱", "مزیت ۲", "مزیت ۳"],
    "cons": ["از نظر مالک عیب ۱", "عیب ۲"],
    "warnings": ["نکته مهمی که بعد خرید فهمیدم"],
    "rating": 3.2
  },

  "scores": {
    "ownerSatisfaction": 7,
    "purchaseRisk": 4,
    "acceleration": 6,
    "depreciation": 5,
    "repairCost": 6,
    "secondHandMarket": 5,
    "buildQuality": 6,
    "afterSalesService": 5,
    "fuelEconomy": 7,
    "suitFamily": 6,
    "suitCity": 8,
    "suitTravel": 6,
    "suitYoung": 7,
    "suitInvestment": 4
  }
}

فقط JSON خالص بده. فقط فارسی. واقع‌بینانه بر اساس بازار ایران.`;

  try {
    const text = await callAI(prompt, 3000);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response", raw: text.slice(0, 500) }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);

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
      const existing = await prisma.carIntelligence.findUnique({ where: { carId } });
      if (existing) {
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

    await logAction("update", "car", carId, { action: "enrich", nameFa: car.nameFa });

    return NextResponse.json({
      success: true,
      carId,
      nameFa: car.nameFa,
      updated: { description: !!data.description, intel: Object.keys(intelData).length, reviews: reviewsCreated },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Enrichment failed: ${errMsg}` }, { status: 500 });
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
