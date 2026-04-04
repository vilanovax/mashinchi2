import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { callAI } from "@/lib/ai-provider";
import { logAction } from "@/lib/auditLog";

// POST - process source text with AI
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();
  const { id } = await params;

  const source = await prisma.carSource.findUnique({
    where: { id },
    include: { car: { select: { nameFa: true, nameEn: true, brandFa: true, category: true, origin: true } } },
  });

  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });

  const prompt = `تو یک تحلیلگر تخصصی خودرو هستی. متن زیر از منبع "${source.sourceSite}" درباره خودروی ${source.car.nameFa} (${source.car.nameEn}) - ${source.car.brandFa} است.

متن منبع:
---
${source.rawText.slice(0, 4000)}
---

لطفا این متن را تحلیل کن و خروجی JSON بده با این فرمت دقیق:
{
  "summary": "خلاصه ۳-۴ جمله‌ای از محتوا به فارسی",
  "pros": ["نقطه قوت ۱", "نقطه قوت ۲", "نقطه قوت ۳"],
  "cons": ["نقطه ضعف ۱", "نقطه ضعف ۲", "نقطه ضعف ۳"],
  "issues": ["مشکل رایج ۱", "مشکل رایج ۲"],
  "warnings": ["هشدار خرید ۱"],
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
  "rating": 3.5,
  "ownerSatisfaction": 6,
  "purchaseRisk": 5
}

قوانین:
- فقط فارسی بنویس
- امتیازات ۱ تا ۱۰ (عدد صحیح)
- rating از ۱ تا ۵ (اعشار)
- واقع‌بینانه بر اساس متن باش
- اگر اطلاعاتی از متن قابل استخراج نیست، مقدار پیش‌فرض ۵ بده
- فقط JSON خالص بده، بدون توضیح اضافه`;

  try {
    const text = await callAI(prompt, 2000);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Update source with processed data
    await prisma.carSource.update({
      where: { id },
      data: {
        processedSummary: parsed.summary || "",
        extractedPros: parsed.pros || [],
        extractedCons: parsed.cons || [],
        extractedIssues: parsed.issues || [],
        extractedWarnings: parsed.warnings || [],
        extractedScores: JSON.stringify({
          ...parsed.scores,
          rating: parsed.rating,
          ownerSatisfaction: parsed.ownerSatisfaction,
          purchaseRisk: parsed.purchaseRisk,
        }),
        status: "processed",
      },
    });

    await logAction("update", "source", id, { action: "ai_process", carId: source.carId });

    return NextResponse.json({
      success: true,
      summary: parsed.summary,
      pros: parsed.pros,
      cons: parsed.cons,
      issues: parsed.issues,
      warnings: parsed.warnings,
      scores: parsed.scores,
      rating: parsed.rating,
      ownerSatisfaction: parsed.ownerSatisfaction,
      purchaseRisk: parsed.purchaseRisk,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `AI processing failed: ${errMsg}` }, { status: 500 });
  }
}
