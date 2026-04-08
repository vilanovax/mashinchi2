import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// ── Slug Configs ──
interface SlugConfig {
  title: string;
  description: string;
  intro: string;
  filter: (car: CarWithRelations) => boolean;
  sortBy: (a: CarWithRelations, b: CarWithRelations) => number;
}

interface CarWithRelations {
  id: string;
  nameFa: string;
  nameEn: string;
  brandFa: string;
  category: string;
  origin: string;
  isNew: boolean;
  priceMin: bigint;
  priceMax: bigint;
  scores: { comfort: number; performance: number; economy: number; safety: number; reliability: number; resaleValue: number; familyFriendly: number; maintenanceRisk: number; afterSales: number; sportiness: number; cityDriving: number; longTrip: number } | null;
  intel: { ownerSatisfaction: number; frequentPros: string[]; suitFamily: number; suitCity: number; suitTravel: number; suitYoung: number; suitInvestment: number } | null;
}

const SLUG_CONFIGS: Record<string, SlugConfig> = {
  "under-1b": {
    title: "بهترین خودرو تا ۱ میلیارد تومان",
    description: "لیست بهترین خودروهای بازار ایران با قیمت زیر یک میلیارد تومان. مقایسه امتیازات، مزایا و معایب هر خودرو.",
    intro: "اگر بودجه‌تان تا یک میلیارد تومان است، این خودروها بهترین گزینه‌ها هستند. رتبه‌بندی بر اساس رضایت مالکان و ارزش خرید.",
    filter: (car) => car.priceMax <= 1_000_000_000n,
    sortBy: (a, b) => (b.intel?.ownerSatisfaction || 0) - (a.intel?.ownerSatisfaction || 0),
  },
  "under-2b": {
    title: "بهترین خودرو تا ۲ میلیارد تومان",
    description: "بهترین خودروهای زیر ۲ میلیارد در بازار ایران. مقایسه کامل امتیازات، مزایا، معایب و رضایت مالکان.",
    intro: "بودجه ۲ میلیارد تومان یکی از رایج‌ترین بازه‌های خرید خودرو در ایران است. این خودروها بالاترین امتیاز رضایت را دارند.",
    filter: (car) => car.priceMax <= 2_000_000_000n,
    sortBy: (a, b) => (b.intel?.ownerSatisfaction || 0) - (a.intel?.ownerSatisfaction || 0),
  },
  "under-3b": {
    title: "بهترین خودرو تا ۳ میلیارد تومان",
    description: "بهترین خودروهای زیر ۳ میلیارد تومان. خودروهای باکیفیت ایرانی، چینی، کره‌ای و ژاپنی در یک لیست.",
    intro: "با بودجه ۳ میلیارد تومان، گزینه‌های متنوعی از برندهای مختلف در دسترس شماست. این لیست بر اساس کیفیت و رضایت مالکان مرتب شده.",
    filter: (car) => car.priceMax <= 3_000_000_000n,
    sortBy: (a, b) => (b.intel?.ownerSatisfaction || 0) - (a.intel?.ownerSatisfaction || 0),
  },
  "family": {
    title: "بهترین خودرو خانوادگی",
    description: "بهترین خودروهای خانوادگی بازار ایران. امن، راحت و مناسب سفرهای خانوادگی.",
    intro: "خودروهای خانوادگی باید ایمن، راحت و فضای کافی داشته باشند. این خودروها بالاترین امتیاز خانوادگی را کسب کرده‌اند.",
    filter: (car) => (car.scores?.familyFriendly || 0) >= 7,
    sortBy: (a, b) => (b.scores?.familyFriendly || 0) - (a.scores?.familyFriendly || 0),
  },
  "low-risk": {
    title: "بهترین خودرو کم‌ریسک",
    description: "خودروهای کم‌ریسک و قابل اطمینان در بازار ایران. کمترین هزینه نگهداری و بالاترین دوام.",
    intro: "اگر به دنبال خودرویی هستید که خرابی کم و هزینه نگهداری پایین داشته باشد، این خودروها بهترین انتخاب هستند.",
    filter: (car) => (car.scores?.maintenanceRisk || 10) <= 4 && (car.scores?.reliability || 0) >= 6,
    sortBy: (a, b) => (a.scores?.maintenanceRisk || 10) - (b.scores?.maintenanceRisk || 10),
  },
  "city": {
    title: "بهترین خودرو شهری",
    description: "بهترین خودروها برای رانندگی شهری. مصرف پایین، ابعاد مناسب و راحتی در ترافیک.",
    intro: "رانندگی شهری نیاز به خودرویی کم‌مصرف، چابک و راحت دارد. این خودروها بهترین امتیاز رانندگی شهری را دارند.",
    filter: (car) => (car.scores?.cityDriving || 0) >= 7,
    sortBy: (a, b) => (b.scores?.cityDriving || 0) - (a.scores?.cityDriving || 0),
  },
  "investment": {
    title: "بهترین خودرو برای سرمایه‌گذاری",
    description: "خودروهایی با بالاترین نقدشوندگی و کمترین افت قیمت. مناسب برای حفظ ارزش سرمایه.",
    intro: "اگر حفظ ارزش سرمایه برایتان مهم است، این خودروها بالاترین نقدشوندگی و کمترین افت قیمت را دارند.",
    filter: (car) => (car.scores?.resaleValue || 0) >= 7,
    sortBy: (a, b) => (b.scores?.resaleValue || 0) - (a.scores?.resaleValue || 0),
  },
  "fuel-efficient": {
    title: "بهترین خودرو کم‌مصرف",
    description: "خودروهای کم‌مصرف بازار ایران. صرفه اقتصادی بالا در مصرف سوخت و هزینه نگهداری.",
    intro: "با افزایش قیمت بنزین، مصرف سوخت یکی از مهم‌ترین فاکتورهای خرید خودرو است. این خودروها بالاترین صرفه اقتصادی را دارند.",
    filter: (car) => (car.scores?.economy || 0) >= 7,
    sortBy: (a, b) => (b.scores?.economy || 0) - (a.scores?.economy || 0),
  },
  "iranian": {
    title: "بهترین خودرو ایرانی",
    description: "رتبه‌بندی بهترین خودروهای تولید ایران. ایران‌خودرو و سایپا در یک مقایسه جامع.",
    intro: "خودروهای ایرانی با توجه به قیمت مناسب و دسترسی آسان به قطعات، همچنان محبوب هستند. این رتبه‌بندی بر اساس رضایت واقعی مالکان است.",
    filter: (car) => car.origin === "iranian",
    sortBy: (a, b) => (b.intel?.ownerSatisfaction || 0) - (a.intel?.ownerSatisfaction || 0),
  },
  "chinese": {
    title: "بهترین خودرو چینی",
    description: "بهترین خودروهای چینی موجود در بازار ایران. مقایسه چری، هاوال، ام‌وی‌ام، جک و بی‌وای‌دی.",
    intro: "خودروهای چینی با تجهیزات بالا و قیمت رقابتی سهم بزرگی از بازار ایران دارند. این رتبه‌بندی بر اساس کیفیت ساخت و رضایت مالکان است.",
    filter: (car) => car.origin === "chinese",
    sortBy: (a, b) => (b.intel?.ownerSatisfaction || 0) - (a.intel?.ownerSatisfaction || 0),
  },
};

const ORIGIN_LABELS: Record<string, string> = { iranian: "ایرانی", chinese: "چینی", korean: "کره‌ای", japanese: "ژاپنی", european: "اروپایی" };
const CATEGORY_LABELS: Record<string, string> = { sedan: "سدان", suv: "شاسی‌بلند", hatchback: "هاچبک", crossover: "کراس‌اوور", pickup: "وانت" };
const ORIGIN_COLORS: Record<string, string> = {
  iranian: "bg-blue-500/10 text-blue-600", chinese: "bg-rose-500/10 text-rose-600",
  korean: "bg-violet-500/10 text-violet-600", japanese: "bg-red-500/10 text-red-600",
  european: "bg-amber-500/10 text-amber-600",
};

function formatPrice(value: number | bigint): string {
  const num = typeof value === "bigint" ? Number(value) : value;
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} میلیارد`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)} میلیون`;
  return num.toLocaleString("fa-IR");
}

function toPersianDigits(str: string | number): string {
  const persianDigits = ["\u06F0", "\u06F1", "\u06F2", "\u06F3", "\u06F4", "\u06F5", "\u06F6", "\u06F7", "\u06F8", "\u06F9"];
  return String(str).replace(/[0-9]/g, (d) => persianDigits[parseInt(d)]);
}

// ── Static Params ──
export function generateStaticParams() {
  return Object.keys(SLUG_CONFIGS).map((slug) => ({ slug }));
}

// ── Metadata ──
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const config = SLUG_CONFIGS[slug];
  if (!config) return { title: "ماشینچی" };

  return {
    title: `${config.title} | ماشینچی`,
    description: config.description,
    openGraph: {
      title: `${config.title} | ماشینچی`,
      description: config.description,
      type: "website",
    },
  };
}

// ── Page ──
export default async function BestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = SLUG_CONFIGS[slug];
  if (!config) notFound();

  const cars = await prisma.car.findMany({
    include: {
      scores: true,
      intel: {
        select: {
          ownerSatisfaction: true,
          frequentPros: true,
          suitFamily: true,
          suitCity: true,
          suitTravel: true,
          suitYoung: true,
          suitInvestment: true,
        },
      },
    },
  });

  const filtered = (cars as unknown as CarWithRelations[])
    .filter(config.filter)
    .sort(config.sortBy);

  // Other categories for navigation
  const otherSlugs = Object.entries(SLUG_CONFIGS)
    .filter(([s]) => s !== slug)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm font-black text-primary">ماشینچی</Link>
          <Link href="/catalog" className="text-xs text-muted hover:text-foreground">کاتالوگ</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pb-12">
        {/* Title */}
        <div className="pt-6 pb-4">
          <h1 className="text-xl font-black mb-2">{config.title}</h1>
          <p className="text-sm text-muted leading-7">{config.intro}</p>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-muted">{toPersianDigits(filtered.length)} خودرو</span>
        </div>

        {/* Car list */}
        <div className="space-y-2.5">
          {filtered.map((car, index) => {
            const satisfaction = car.intel?.ownerSatisfaction || 0;
            const originColor = ORIGIN_COLORS[car.origin] || "bg-muted/10 text-muted";
            const pros = car.intel?.frequentPros?.slice(0, 3) || [];

            return (
              <Link
                key={car.id}
                href={`/car/${car.id}`}
                className="block bg-surface rounded-2xl border border-border overflow-hidden hover:border-primary/30 transition-colors"
              >
                <div className="flex items-stretch">
                  {/* Rank + Satisfaction */}
                  <div className={`w-14 shrink-0 flex flex-col items-center justify-center ${
                    satisfaction >= 7 ? "bg-accent/8" : satisfaction >= 5 ? "bg-primary/8" : "bg-background"
                  }`}>
                    <span className="text-[9px] text-muted font-bold">{toPersianDigits(index + 1)}#</span>
                    {satisfaction > 0 && (
                      <>
                        <span className={`text-base font-black ${
                          satisfaction >= 7 ? "text-accent" : satisfaction >= 5 ? "text-primary" : "text-muted"
                        }`}>{toPersianDigits(satisfaction)}</span>
                        <span className="text-[8px] text-muted">رضایت</span>
                      </>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3 min-w-0">
                    <h2 className="text-sm font-black truncate">{car.nameFa}</h2>
                    <div className="flex items-center gap-1.5 mb-1.5 mt-0.5">
                      <span className="text-[11px] text-muted">{car.brandFa}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${originColor}`}>
                        {ORIGIN_LABELS[car.origin] || car.origin}
                      </span>
                      <span className="text-[9px] bg-background text-muted px-1.5 py-0.5 rounded-full">
                        {CATEGORY_LABELS[car.category] || car.category}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        car.isNew ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"
                      }`}>
                        {car.isNew ? "صفر" : "کارکرده"}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-primary mb-1.5">
                      {toPersianDigits(formatPrice(car.priceMin))}
                      <span className="text-[9px] text-muted font-normal mx-0.5">~</span>
                      {toPersianDigits(formatPrice(car.priceMax))}
                    </div>
                    {pros.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {pros.map((p, i) => (
                          <span key={i} className="text-[9px] bg-accent/8 text-accent px-2 py-0.5 rounded-full">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted">خودرویی در این دسته پیدا نشد</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 bg-primary/5 border border-primary/15 rounded-2xl p-5 text-center">
          <h3 className="text-sm font-black mb-1.5">میخوای بدونی کدوم بهتر به تو میخوره؟</h3>
          <p className="text-xs text-muted mb-3">دستیار هوشمند ماشینچی با شناخت سلیقه‌ات بهترین گزینه رو پیشنهاد میده</p>
          <Link
            href="/"
            className="inline-block bg-primary text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
          >
            شروع کن
          </Link>
        </div>

        {/* Related categories */}
        <div className="mt-8">
          <h3 className="text-xs font-black mb-3">دسته‌بندی‌های دیگر</h3>
          <div className="flex flex-wrap gap-2">
            {otherSlugs.map(([s, c]) => (
              <Link
                key={s}
                href={`/best/${s}`}
                className="text-[11px] font-bold bg-surface border border-border px-3 py-1.5 rounded-full hover:border-primary/30 transition-colors"
              >
                {c.title.replace("بهترین ", "")}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
