import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { callAI } from "@/lib/ai-provider";
import { logAction } from "@/lib/auditLog";

// POST - deep process source text with AI + compare with existing data
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();
  const { id } = await params;

  try {
  const source = await prisma.carSource.findUnique({
    where: { id },
    include: {
      car: {
        include: {
          scores: true,
          intel: true,
          reviews: { select: { summary: true, pros: true, cons: true, warnings: true, rating: true, source: true } },
        },
      },
    },
  });

  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  if (!source.rawText || source.rawText.trim().length < 20) {
    return NextResponse.json({ error: "متن منبع خیلی کوتاه است (حداقل ۲۰ کاراکتر)" }, { status: 400 });
  }

  const car = source.car;
  const existingIntel = car.intel;
  const existingReviews = car.reviews || [];
  const existingScores = car.scores;

  // Safe array helpers — intel array fields might be empty in DB
  const safeJoin = (arr: string[] | null | undefined) =>
    Array.isArray(arr) && arr.length > 0 ? arr.join(" | ") : "—";

  // Build context of existing data for AI
  const existingContext = `
=== داده‌های فعلی این خودرو ===
${existingIntel ? `جمع‌بندی فعلی: ${existingIntel.overallSummary || "—"}
چرا بخری: ${existingIntel.whyBuy || "—"}
چرا نخری: ${existingIntel.whyNotBuy || "—"}
نقاط قوت فعلی: ${safeJoin(existingIntel.frequentPros)}
نقاط ضعف فعلی: ${safeJoin(existingIntel.frequentCons)}
خرابی‌های رایج: ${safeJoin(existingIntel.commonIssues)}
هشدارها: ${safeJoin(existingIntel.purchaseWarnings)}
نظر مالکان: ${existingIntel.ownerVerdict || "—"}
رضایت مالکان: ${existingIntel.ownerSatisfaction ?? 5}/10
ریسک خرید: ${existingIntel.purchaseRisk ?? 5}/10` : "هیچ اطلاعات هوشمندی ثبت نشده."}

${existingScores ? `امتیازات فعلی: راحتی ${existingScores.comfort}, عملکرد ${existingScores.performance}, اقتصادی ${existingScores.economy}, ایمنی ${existingScores.safety}, پرستیژ ${existingScores.prestige}, اطمینان ${existingScores.reliability}, نقدشوندگی ${existingScores.resaleValue}, خانوادگی ${existingScores.familyFriendly}, اسپرت ${existingScores.sportiness}, آفرود ${existingScores.offroad}, شهری ${existingScores.cityDriving}, سفر ${existingScores.longTrip}, ریسک نگهداری ${existingScores.maintenanceRisk}, خدمات ${existingScores.afterSales}` : ""}

${existingReviews.length > 0 ? `نظرات موجود (${existingReviews.length} عدد):
${existingReviews.slice(0, 3).map((r, i) => `${i + 1}. [${r.source}] ${(r.summary || "").slice(0, 100)}`).join("\n")}` : "نظری ثبت نشده."}
`;

  const prompt = `تو یک تحلیلگر ارشد خودرو هستی. یک متن جدید درباره ${car.nameFa} (${car.nameEn}) - ${car.brandFa} داری.

وظیفه‌ات:
1. متن جدید رو عمیقا تحلیل کن
2. با داده‌های فعلی مقایسه کن
3. مشخص کن چه اطلاعات جدیدی وجود داره
4. امتیازات رو با دلیل بده

${existingContext}

=== متن جدید از ${source.sourceSite} ===
${source.rawText.slice(0, 5000)}
===

خروجی JSON بده:

{
  "deepSummary": "تحلیل عمیق ۵-۷ جمله‌ای از متن. نکات کلیدی، تجربیات واقعی، و بینش‌های مهم رو استخراج کن.",

  "newInsights": [
    "نکته جدیدی که در داده‌های فعلی نبود ۱",
    "نکته جدید ۲",
    "نکته جدید ۳"
  ],

  "confirmedFacts": [
    "موردی که در داده‌های قبلی هم بود و این متن تاییدش کرد ۱",
    "مورد تایید‌شده ۲"
  ],

  "contradictions": [
    "موردی که با داده‌های قبلی تناقض داره (اگر هست)"
  ],

  "extractedPros": [
    "نقطه قوت ۱ - با جزئیات از متن (مثال: مصرف سوخت ترکیبی ۷.۵ لیتر که برای موتور ۱.۵ توربو عالیه)",
    "نقطه قوت ۲",
    "نقطه قوت ۳",
    "نقطه قوت ۴"
  ],

  "extractedCons": [
    "نقطه ضعف ۱ - دقیق از متن",
    "نقطه ضعف ۲",
    "نقطه ضعف ۳"
  ],

  "extractedIssues": [
    "خرابی/مشکل رایج ذکرشده در متن"
  ],

  "extractedWarnings": [
    "هشدار خرید از متن"
  ],

  "scores": {
    "comfort": { "value": 7, "reason": "دلیل از متن" },
    "performance": { "value": 6, "reason": "دلیل" },
    "economy": { "value": 8, "reason": "دلیل" },
    "safety": { "value": 6, "reason": "دلیل" },
    "prestige": { "value": 5, "reason": "دلیل" },
    "reliability": { "value": 6, "reason": "دلیل" },
    "resaleValue": { "value": 5, "reason": "دلیل" },
    "familyFriendly": { "value": 7, "reason": "دلیل" },
    "sportiness": { "value": 4, "reason": "دلیل" },
    "offroad": { "value": 3, "reason": "دلیل" },
    "cityDriving": { "value": 8, "reason": "دلیل" },
    "longTrip": { "value": 6, "reason": "دلیل" },
    "maintenanceRisk": { "value": 5, "reason": "دلیل" },
    "afterSales": { "value": 5, "reason": "دلیل" }
  },

  "rating": 3.5,
  "ownerSatisfaction": { "value": 7, "reason": "دلیل" },
  "purchaseRisk": { "value": 4, "reason": "دلیل" },

  "recommendation": "توصیه نهایی: آیا این اطلاعات جدید ارزش اعمال دارد؟ چه تغییراتی پیشنهاد میشه؟ (۲-۳ جمله)"
}

قوانین:
- فقط فارسی
- امتیازات ۱-۱۰ عدد صحیح
- اگر متن اطلاعاتی برای یک فیلد نداره، مقدار فعلی رو حفظ کن
- صادقانه بگو اگر متن چیز مفید جدیدی نداره
- فقط JSON خالص`;

    const text = await callAI(prompt, 3000);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[sources/process] AI returned no JSON:", text.slice(0, 500));
      return NextResponse.json({ error: "پاسخ AI قابل پارس نیست", raw: text.slice(0, 500) }, { status: 500 });
    }

    interface ParsedAI {
      deepSummary?: string;
      newInsights?: string[];
      confirmedFacts?: string[];
      contradictions?: string[];
      extractedPros?: string[];
      extractedCons?: string[];
      extractedIssues?: string[];
      extractedWarnings?: string[];
      scores?: Record<string, { value: number; reason: string } | number>;
      rating?: number;
      ownerSatisfaction?: { value: number; reason: string } | number;
      purchaseRisk?: { value: number; reason: string } | number;
      recommendation?: string;
    }

    let parsed: ParsedAI;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("[sources/process] JSON parse failed:", parseErr, "raw:", jsonMatch[0].slice(0, 500));
      return NextResponse.json({ error: "JSON نامعتبر از AI", raw: jsonMatch[0].slice(0, 500) }, { status: 500 });
    }

    // Build score values and comparisons
    const scoreComparisons: Record<string, { old: number; new: number; reason: string; changed: boolean }> = {};
    const scoreValues: Record<string, number> = {};

    for (const [key, val] of Object.entries(parsed.scores || {})) {
      const oldVal = existingScores ? (existingScores as unknown as Record<string, number>)[key] || 5 : 5;
      const newVal = typeof val === "object" ? val.value : val;
      const reason = typeof val === "object" ? val.reason : "";
      scoreComparisons[key] = { old: oldVal, new: newVal, reason, changed: oldVal !== newVal };
      scoreValues[key] = newVal;
    }

    // Build extracted scores JSON with flat values for storage
    const flatScores: Record<string, number> = { ...scoreValues };
    if (parsed.ownerSatisfaction !== undefined) {
      flatScores.ownerSatisfaction = typeof parsed.ownerSatisfaction === "object" ? parsed.ownerSatisfaction.value : parsed.ownerSatisfaction;
    }
    if (parsed.purchaseRisk !== undefined) {
      flatScores.purchaseRisk = typeof parsed.purchaseRisk === "object" ? parsed.purchaseRisk.value : parsed.purchaseRisk;
    }
    if (parsed.rating !== undefined) flatScores.rating = parsed.rating;

    // Store processed data
    await prisma.carSource.update({
      where: { id },
      data: {
        processedSummary: parsed.deepSummary || "",
        extractedPros: parsed.extractedPros || [],
        extractedCons: parsed.extractedCons || [],
        extractedIssues: parsed.extractedIssues || [],
        extractedWarnings: parsed.extractedWarnings || [],
        extractedScores: JSON.stringify({
          scores: scoreComparisons,
          ownerSatisfaction: parsed.ownerSatisfaction,
          purchaseRisk: parsed.purchaseRisk,
          rating: parsed.rating,
          newInsights: parsed.newInsights,
          confirmedFacts: parsed.confirmedFacts,
          contradictions: parsed.contradictions,
          recommendation: parsed.recommendation,
        }),
        status: "processed",
      },
    });

    await logAction("update", "source", id, { action: "deep_process", carId: source.carId });

    // Build diff for frontend
    const existingPros = existingIntel?.frequentPros || [];
    const existingCons = existingIntel?.frequentCons || [];

    return NextResponse.json({
      success: true,
      deepSummary: parsed.deepSummary,
      newInsights: parsed.newInsights || [],
      confirmedFacts: parsed.confirmedFacts || [],
      contradictions: parsed.contradictions || [],
      recommendation: parsed.recommendation,

      extractedPros: parsed.extractedPros || [],
      extractedCons: parsed.extractedCons || [],
      extractedIssues: parsed.extractedIssues || [],
      extractedWarnings: parsed.extractedWarnings || [],

      scoreComparisons,
      ownerSatisfaction: parsed.ownerSatisfaction,
      purchaseRisk: parsed.purchaseRisk,
      rating: parsed.rating,

      // Diff data
      diff: {
        prosNew: (parsed.extractedPros || []).filter((p: string) => !existingPros.some((ep) => ep.includes(p.slice(0, 15)) || p.includes(ep.slice(0, 15)))),
        prosExisting: existingPros,
        consNew: (parsed.extractedCons || []).filter((c: string) => !existingCons.some((ec) => ec.includes(c.slice(0, 15)) || c.includes(ec.slice(0, 15)))),
        consExisting: existingCons,
        summaryOld: existingIntel?.overallSummary || "",
        summaryNew: parsed.deepSummary || "",
        scoresChanged: Object.entries(scoreComparisons).filter(([, v]) => v.changed).length,
      },
    });
  } catch (error) {
    console.error("[sources/process] Unhandled error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack?.split("\n").slice(0, 5).join(" | ") : "";
    return NextResponse.json({ error: `Processing failed: ${errMsg}`, stack: errStack }, { status: 500 });
  }
}
