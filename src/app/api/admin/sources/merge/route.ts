import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { callAI } from "@/lib/ai-provider";
import { logAction } from "@/lib/auditLog";

// POST - merge multiple processed sources into a unified CarIntelligence via AI
// Body: { sourceIds: string[], apply?: boolean }
// If apply=false → returns a preview only.
// If apply=true  → writes the new intel to the DB and marks all sources as approved.
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const sourceIds: string[] = Array.isArray(body?.sourceIds) ? body.sourceIds : [];
    const apply: boolean = Boolean(body?.apply);

    if (sourceIds.length < 2) {
      return NextResponse.json({ error: "حداقل ۲ منبع برای ترکیب لازم است" }, { status: 400 });
    }
    if (sourceIds.length > 12) {
      return NextResponse.json({ error: "حداکثر ۱۲ منبع در هر ترکیب (برای کنترل طول prompt)" }, { status: 400 });
    }

    // Load all selected sources
    const sources = await prisma.carSource.findMany({
      where: { id: { in: sourceIds } },
      include: {
        car: {
          include: {
            scores: true,
            intel: true,
          },
        },
      },
    });

    if (sources.length !== sourceIds.length) {
      return NextResponse.json({ error: "بعضی از منابع پیدا نشدند" }, { status: 404 });
    }

    // All sources must belong to the same car
    const uniqueCarIds = [...new Set(sources.map((s) => s.carId))];
    if (uniqueCarIds.length > 1) {
      return NextResponse.json({ error: "همه منابع باید از یک خودرو باشند" }, { status: 400 });
    }

    // All sources must be processed or approved (raw pending sources have no AI extraction)
    const invalidSources = sources.filter((s) => s.status !== "processed" && s.status !== "approved");
    if (invalidSources.length > 0) {
      return NextResponse.json({
        error: `${invalidSources.length} منبع هنوز پردازش نشده. ابتدا آن‌ها را پردازش کنید.`,
      }, { status: 400 });
    }

    const car = sources[0].car;
    const existingIntel = car.intel;
    const existingScores = car.scores;

    // Safe array helpers
    const safeJoin = (arr: string[] | null | undefined) =>
      Array.isArray(arr) && arr.length > 0 ? arr.join(" | ") : "—";

    // Build per-source blocks for the prompt
    const sourceBlocks = sources.map((s, idx) => {
      const storedData = s.extractedScores ? (() => {
        try { return JSON.parse(s.extractedScores || "{}"); } catch { return {}; }
      })() : {};
      return `
--- منبع ${idx + 1} [${s.type} از ${s.sourceSite}] ${s.title ? `"${s.title}"` : ""} ---
خلاصه پردازش‌شده: ${s.processedSummary || "—"}
نقاط قوت استخراج‌شده: ${safeJoin(s.extractedPros)}
نقاط ضعف استخراج‌شده: ${safeJoin(s.extractedCons)}
خرابی‌ها: ${safeJoin(s.extractedIssues)}
هشدارها: ${safeJoin(s.extractedWarnings)}
توصیه AI قبلی: ${storedData?.recommendation || "—"}
بینش‌های جدید قبلی: ${Array.isArray(storedData?.newInsights) ? storedData.newInsights.join(" | ") : "—"}
متن خام (۳۰۰ کاراکتر اول): ${(s.rawText || "").slice(0, 300)}
`.trim();
    }).join("\n\n");

    const existingBlock = existingIntel ? `
=== تحلیل فعلی خودرو (قبل از ترکیب) ===
جمع‌بندی کلی: ${existingIntel.overallSummary || "—"}
چرا بخری: ${existingIntel.whyBuy || "—"}
چرا نخری: ${existingIntel.whyNotBuy || "—"}
نقاط قوت پرتکرار: ${safeJoin(existingIntel.frequentPros)}
نقاط ضعف پرتکرار: ${safeJoin(existingIntel.frequentCons)}
خرابی‌های رایج: ${safeJoin(existingIntel.commonIssues)}
هشدارهای خرید: ${safeJoin(existingIntel.purchaseWarnings)}
نظر مالکان: ${existingIntel.ownerVerdict || "—"}
رضایت مالکان: ${existingIntel.ownerSatisfaction}/10
ریسک خرید: ${existingIntel.purchaseRisk}/10
` : "=== تحلیل فعلی خودرو === هنوز هیچ تحلیل هوشمندی ثبت نشده است.";

    const prompt = `تو یک تحلیلگر ارشد خودرو هستی. وظیفه‌ات ترکیب چند منبع دانش درباره یک خودرو و ساخت یک تحلیل جامع یکپارچه است.

خودرو: ${car.nameFa} (${car.nameEn}) - ${car.brandFa}

${existingBlock}

=== ${sources.length} منبع پردازش‌شده برای ترکیب ===
${sourceBlocks}

وظیفه‌ات:
۱. تمام منابع بالا را با تحلیل فعلی ترکیب کن
۲. تکرارها را حذف کن، موارد مشابه را ادغام کن
۳. تناقض‌ها را حل کن (اگر بیشتر منابع روی یک نکته اتفاق نظر دارند، همان اولویت دارد)
۴. از تحلیل فعلی فقط مواردی را نگه دار که با منابع جدید تایید می‌شوند یا تکمیل می‌کنند
۵. یک نمای جامع بساز که تصویر کاملی از خودرو بدهد

خروجی را **فقط** به صورت JSON زیر بده (بدون هیچ متن اضافه):

{
  "overallSummary": "جمع‌بندی جامع ۵-۷ جمله‌ای که تمام منابع را در نظر می‌گیرد",
  "whyBuy": "چرا این خودرو را بخریم (۲-۳ جمله بر اساس ترکیب همه منابع)",
  "whyNotBuy": "چرا این خودرو را نخریم (۲-۳ جمله بر اساس ترکیب همه منابع)",
  "ownerVerdict": "نظر جمع‌بندی‌شده مالکان بر اساس منابع (۲-۳ جمله)",
  "frequentPros": [
    "نقطه قوت پرتکرار ۱ (که در چند منبع ذکر شده)",
    "نقطه قوت ۲",
    "نقطه قوت ۳",
    "نقطه قوت ۴",
    "نقطه قوت ۵",
    "نقطه قوت ۶"
  ],
  "frequentCons": [
    "نقطه ضعف پرتکرار ۱",
    "نقطه ضعف ۲",
    "نقطه ضعف ۳",
    "نقطه ضعف ۴",
    "نقطه ضعف ۵"
  ],
  "commonIssues": [
    "خرابی رایج ۱ که در چند منبع ذکر شده",
    "خرابی ۲",
    "خرابی ۳"
  ],
  "purchaseWarnings": [
    "هشدار خرید ۱",
    "هشدار ۲",
    "هشدار ۳"
  ],
  "ownerSatisfaction": 7,
  "purchaseRisk": 4,
  "scores": {
    "comfort": 7,
    "performance": 6,
    "economy": 8,
    "safety": 6,
    "prestige": 5,
    "reliability": 6,
    "resaleValue": 5,
    "familyFriendly": 7,
    "sportiness": 4,
    "offroad": 3,
    "cityDriving": 8,
    "longTrip": 6,
    "maintenanceRisk": 5,
    "afterSales": 5
  },
  "mergeReasoning": "توضیح کوتاه (۲-۳ جمله) از اینکه چگونه منابع را ترکیب کردی، چه تناقض‌هایی بود، چه نکات جدیدی اضافه شد"
}

قوانین:
- فقط فارسی
- تمام امتیازات ۱ تا ۱۰ عدد صحیح
- حداکثر ۶ قوت، ۵ ضعف، ۴ خرابی، ۳ هشدار
- هر آیتم باید کوتاه و مشخص باشه (حداکثر ۲۰۰ کاراکتر)
- JSON خالص بدون markdown یا متن اطراف`;

    const aiText = await callAI(prompt, 4000);
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[sources/merge] AI returned no JSON:", aiText.slice(0, 500));
      return NextResponse.json({ error: "پاسخ AI قابل پارس نیست", raw: aiText.slice(0, 500) }, { status: 500 });
    }

    interface MergeResult {
      overallSummary?: string;
      whyBuy?: string;
      whyNotBuy?: string;
      ownerVerdict?: string;
      frequentPros?: string[];
      frequentCons?: string[];
      commonIssues?: string[];
      purchaseWarnings?: string[];
      ownerSatisfaction?: number;
      purchaseRisk?: number;
      scores?: Record<string, number>;
      mergeReasoning?: string;
    }

    let parsed: MergeResult;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("[sources/merge] JSON parse failed:", parseErr, "raw:", jsonMatch[0].slice(0, 500));
      return NextResponse.json({ error: "JSON نامعتبر از AI", raw: jsonMatch[0].slice(0, 500) }, { status: 500 });
    }

    // Build old vs new diff for preview
    const scoreFields = [
      "comfort", "performance", "economy", "safety", "prestige",
      "reliability", "resaleValue", "familyFriendly", "sportiness",
      "offroad", "cityDriving", "longTrip", "maintenanceRisk", "afterSales",
    ];

    const scoreDiff: Record<string, { old: number; new: number; changed: boolean }> = {};
    for (const key of scoreFields) {
      const oldVal = existingScores ? ((existingScores as unknown as Record<string, number>)[key] || 5) : 5;
      const newVal = parsed.scores?.[key] ?? oldVal;
      scoreDiff[key] = { old: oldVal, new: newVal, changed: oldVal !== newVal };
    }

    const diff = {
      overallSummary: {
        old: existingIntel?.overallSummary || "",
        new: parsed.overallSummary || "",
      },
      whyBuy: {
        old: existingIntel?.whyBuy || "",
        new: parsed.whyBuy || "",
      },
      whyNotBuy: {
        old: existingIntel?.whyNotBuy || "",
        new: parsed.whyNotBuy || "",
      },
      ownerVerdict: {
        old: existingIntel?.ownerVerdict || "",
        new: parsed.ownerVerdict || "",
      },
      frequentPros: {
        old: existingIntel?.frequentPros || [],
        new: parsed.frequentPros || [],
      },
      frequentCons: {
        old: existingIntel?.frequentCons || [],
        new: parsed.frequentCons || [],
      },
      commonIssues: {
        old: existingIntel?.commonIssues || [],
        new: parsed.commonIssues || [],
      },
      purchaseWarnings: {
        old: existingIntel?.purchaseWarnings || [],
        new: parsed.purchaseWarnings || [],
      },
      ownerSatisfaction: {
        old: existingIntel?.ownerSatisfaction ?? 5,
        new: Math.round(parsed.ownerSatisfaction ?? existingIntel?.ownerSatisfaction ?? 5),
      },
      purchaseRisk: {
        old: existingIntel?.purchaseRisk ?? 5,
        new: Math.round(parsed.purchaseRisk ?? existingIntel?.purchaseRisk ?? 5),
      },
      scores: scoreDiff,
      scoresChanged: Object.values(scoreDiff).filter((s) => s.changed).length,
    };

    // ─── Preview only ───
    if (!apply) {
      return NextResponse.json({
        success: true,
        preview: true,
        carId: car.id,
        carName: car.nameFa,
        sourcesUsed: sources.map((s) => ({
          id: s.id,
          type: s.type,
          sourceSite: s.sourceSite,
          title: s.title,
          textLength: s.rawText.length,
        })),
        mergeReasoning: parsed.mergeReasoning || "",
        diff,
        newIntel: parsed,
      });
    }

    // ─── Apply: write new intel + update scores ───
    const intelData = {
      overallSummary: parsed.overallSummary || existingIntel?.overallSummary || "",
      whyBuy: parsed.whyBuy || existingIntel?.whyBuy || "",
      whyNotBuy: parsed.whyNotBuy || existingIntel?.whyNotBuy || "",
      ownerVerdict: parsed.ownerVerdict || existingIntel?.ownerVerdict || "",
      frequentPros: parsed.frequentPros || existingIntel?.frequentPros || [],
      frequentCons: parsed.frequentCons || existingIntel?.frequentCons || [],
      commonIssues: parsed.commonIssues || existingIntel?.commonIssues || [],
      purchaseWarnings: parsed.purchaseWarnings || existingIntel?.purchaseWarnings || [],
      ownerSatisfaction: Math.max(1, Math.min(10, Math.round(parsed.ownerSatisfaction ?? existingIntel?.ownerSatisfaction ?? 5))),
      purchaseRisk: Math.max(1, Math.min(10, Math.round(parsed.purchaseRisk ?? existingIntel?.purchaseRisk ?? 5))),
    };

    if (existingIntel) {
      await prisma.carIntelligence.update({
        where: { carId: car.id },
        data: intelData,
      });
    } else {
      await prisma.carIntelligence.create({
        data: { carId: car.id, ...intelData },
      });
    }

    // Update scores (only changed ones to avoid unnecessary writes)
    const scoreUpdates: Record<string, number> = {};
    for (const [key, d] of Object.entries(scoreDiff)) {
      if (d.changed) scoreUpdates[key] = Math.max(1, Math.min(10, d.new));
    }
    if (Object.keys(scoreUpdates).length > 0) {
      await prisma.carScores.upsert({
        where: { carId: car.id },
        update: scoreUpdates,
        create: { carId: car.id, ...scoreUpdates },
      });
    }

    // Mark all contributing sources as approved
    await prisma.carSource.updateMany({
      where: { id: { in: sourceIds } },
      data: { status: "approved", appliedAt: new Date() },
    });

    await logAction("update", "car", car.id, {
      action: "merge_sources",
      carName: car.nameFa,
      sourcesCount: sources.length,
      sourceIds,
      scoresChanged: diff.scoresChanged,
    });

    return NextResponse.json({
      success: true,
      applied: true,
      carId: car.id,
      carName: car.nameFa,
      sourcesApproved: sourceIds.length,
      scoresChanged: diff.scoresChanged,
      mergeReasoning: parsed.mergeReasoning || "",
    });
  } catch (error) {
    console.error("[sources/merge] Unhandled error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Merge failed: ${errMsg}` }, { status: 500 });
  }
}
