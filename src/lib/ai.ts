import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CarForAI {
  nameFa: string;
  nameEn: string;
  brandFa: string;
  category: string;
  origin: string;
  priceMin: string;
  priceMax: string;
  description: string;
  tags: string[];
  scores: Record<string, number>;
  specs: Record<string, unknown>;
  matchScore: number;
}

interface TasteProfile {
  comfort: number;
  performance: number;
  economy: number;
  safety: number;
  prestige: number;
  reliability: number;
  resaleValue: number;
  familyFriendly: number;
  sportiness: number;
  offroad: number;
  cityDriving: number;
  longTrip: number;
}

export async function generateRecommendationSummary(
  cars: CarForAI[],
  tasteProfile: TasteProfile,
  budget: string
): Promise<string> {
  const carsInfo = cars
    .map(
      (car, i) =>
        `${i + 1}. ${car.nameFa} (${car.nameEn}) - ${car.brandFa}
   قیمت: ${car.priceMin} تا ${car.priceMax} تومان
   دسته: ${car.category} | مبدا: ${car.origin}
   توضیح: ${car.description}
   تگ‌ها: ${car.tags.join(", ")}
   امتیاز تطبیق: ${car.matchScore}
   مشخصات: موتور ${car.specs?.engine || "-"}, ${car.specs?.horsepower || "-"} اسب بخار, گیربکس ${car.specs?.transmission || "-"}
   امتیازها: راحتی ${car.scores?.comfort}, عملکرد ${car.scores?.performance}, اقتصادی ${car.scores?.economy}, ایمنی ${car.scores?.safety}, پرستیژ ${car.scores?.prestige}, قابلیت اطمینان ${car.scores?.reliability}, نقدشوندگی ${car.scores?.resaleValue}, خانوادگی ${car.scores?.familyFriendly}, ریسک نگهداری ${car.scores?.maintenanceRisk}`
    )
    .join("\n\n");

  const topTraits = Object.entries(tasteProfile)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 4)
    .map(([key]) => key);

  const prompt = `تو یک مشاور خرید خودرو هستی. بر اساس سلیقه کاربر و ماشین‌های پیشنهادی، یک جمع‌بندی فارسی کوتاه و مفید بنویس.

بودجه کاربر: حدود ${budget} تومان

ویژگی‌های مهم کاربر (بر اساس رفتارش): ${topTraits.join(", ")}

ماشین‌های پیشنهادی (به ترتیب تطبیق):
${carsInfo}

لطفاً:
1. برای هر ماشین یک پاراگراف کوتاه (۲-۳ جمله) بنویس که بگه چرا برای این کاربر مناسبه
2. نقاط قوت و ضعف اصلی رو بگو
3. اگه ریسک یا هشداری هست بگو
4. در آخر یک جمع‌بندی کلی بده که کدوم بهترین انتخابه و چرا

فرمت خروجی:
- فقط فارسی بنویس
- از ایموجی استفاده نکن
- کوتاه و مفید باش
- مثل یک دوست آگاه صحبت کن، نه یک ربات`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text : "خطا در تولید خلاصه";
}
