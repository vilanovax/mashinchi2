import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { callAI, getProviderInfo } from "@/lib/ai-provider";

export async function POST(request: NextRequest) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();

  const { carId, type } = await request.json();
  if (!carId || !type) return NextResponse.json({ error: "carId and type required" }, { status: 400 });

  const car = await prisma.car.findUnique({
    where: { id: carId },
    include: { scores: true, specs: true, tags: true, intel: true, reviews: true },
  });

  if (!car) return NextResponse.json({ error: "Car not found" }, { status: 404 });

  const carInfo = `
نام: ${car.nameFa} (${car.nameEn})
برند: ${car.brandFa}
دسته: ${car.category} | مبدا: ${car.origin}
قیمت: ${car.priceMin} تا ${car.priceMax} تومان
توضیحات: ${car.description || "-"}
تگ‌ها: ${car.tags.map((t) => t.tag).join("، ")}
${car.specs ? `موتور: ${car.specs.engine || "-"}, ${car.specs.horsepower || "-"} اسب, گیربکس: ${car.specs.transmission || "-"}, مصرف: ${car.specs.fuelConsumption || "-"} لیتر` : ""}
${car.scores ? `امتیازات: راحتی ${car.scores.comfort}, عملکرد ${car.scores.performance}, اقتصادی ${car.scores.economy}, ایمنی ${car.scores.safety}, پرستیژ ${car.scores.prestige}, اطمینان ${car.scores.reliability}` : ""}
${car.reviews.length > 0 ? `نظرات موجود: ${car.reviews.map((r) => r.summary).join(" | ")}` : ""}
`;

  let prompt = "";

  if (type === "intel") {
    prompt = `تو یک کارشناس خودرو در بازار ایران هستی. برای خودرو زیر، اطلاعات هوشمند تولید کن.

${carInfo}

خروجی JSON بده با این فرمت (فقط JSON، بدون توضیح اضافه):
{
  "overallSummary": "جمع‌بندی کلی ۲-۳ جمله",
  "whyBuy": "چرا بخری ۱-۲ جمله",
  "whyNotBuy": "چرا نخری ۱-۲ جمله",
  "ownerVerdict": "نظر مالکان ۱-۲ جمله",
  "frequentPros": ["نقطه قوت ۱", "نقطه قوت ۲", "نقطه قوت ۳", "نقطه قوت ۴"],
  "frequentCons": ["نقطه ضعف ۱", "نقطه ضعف ۲", "نقطه ضعف ۳"],
  "commonIssues": ["خرابی رایج ۱", "خرابی رایج ۲"],
  "purchaseWarnings": ["هشدار خرید ۱", "هشدار خرید ۲"]
}

فقط فارسی بنویس. واقع‌بینانه باش.`;
  } else if (type === "review") {
    prompt = `تو یک کارشناس خودرو هستی. برای خودرو زیر یک نظر کارشناسی بنویس.

${carInfo}

خروجی JSON بده:
{
  "summary": "خلاصه نظر ۲-۳ جمله",
  "pros": ["مزیت ۱", "مزیت ۲", "مزیت ۳"],
  "cons": ["عیب ۱", "عیب ۲"],
  "warnings": ["هشدار ۱"],
  "rating": 3.5
}

فقط فارسی. rating بین ۱ تا ۵.`;
  } else if (type === "description") {
    prompt = `برای خودرو زیر یک توضیح کوتاه فارسی بنویس (۲-۳ جمله). مثل یک دوست آگاه صحبت کن.

${carInfo}

فقط متن فارسی خالص بده، بدون JSON.`;
  } else {
    return NextResponse.json({ error: "Invalid type. Use: intel, review, description" }, { status: 400 });
  }

  try {
    // Use runtime config override if provided
    const configOverride: Record<string, string> = {};
    const runtimeProvider = request.headers.get("x-ai-provider");
    const runtimeKey = request.headers.get("x-ai-key");
    if (runtimeProvider) configOverride.provider = runtimeProvider;
    if (runtimeKey && runtimeProvider === "openai") configOverride.openaiApiKey = runtimeKey;
    if (runtimeKey && runtimeProvider === "claude") configOverride.claudeApiKey = runtimeKey;

    const text = await callAI(prompt, 1500, configOverride);
    const providerInfo = getProviderInfo();

    if (type === "description") {
      return NextResponse.json({ result: text.trim(), type: "description", provider: providerInfo.provider });
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ result: parsed, type, provider: providerInfo.provider });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("AI generation error:", errMsg);
    return NextResponse.json({ error: `AI generation failed: ${errMsg}` }, { status: 500 });
  }
}
