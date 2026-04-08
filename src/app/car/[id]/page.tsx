"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";

interface PricePoint { date: string; price: string; source: string }

interface CarDetail {
  id: string; nameFa: string; nameEn: string; brandFa: string;
  category: string; origin: string; priceMin: string; priceMax: string;
  isNew: boolean; description: string | null; imageUrl: string | null;
  tags: string[];
  scores: Record<string, number> | null;
  specs: { engine: string | null; horsepower: number | null; torque: number | null; transmission: string | null; fuelType: string | null; fuelConsumption: number | null; acceleration: number | null; seatingCapacity: number } | null;
  reviews: { source: string; summary: string; pros: string[]; cons: string[]; warnings: string[]; rating: number | null }[];
  intel: {
    frequentPros: string[]; frequentCons: string[]; commonIssues: string[]; purchaseWarnings: string[];
    ownerVerdict: string; overallSummary: string; whyBuy: string; whyNotBuy: string;
    purchaseRisk: number; ownerSatisfaction: number;
    suitFamily: number; suitCity: number; suitTravel: number; suitYoung: number; suitInvestment: number;
  } | null;
  priceHistory: PricePoint[];
  similarCars: { id: string; nameFa: string; brandFa: string; priceMin: string; priceMax: string }[];
  alternatives: { id: string; nameFa: string; brandFa: string; priceMin: string; priceMax: string }[];
}

const SCORE_LABELS: { key: string; label: string }[] = [
  { key: "comfort", label: "راحتی" }, { key: "performance", label: "عملکرد" },
  { key: "economy", label: "صرفه اقتصادی" }, { key: "safety", label: "ایمنی" },
  { key: "reliability", label: "اطمینان" }, { key: "resaleValue", label: "نقدشوندگی" },
  { key: "familyFriendly", label: "خانوادگی" }, { key: "sportiness", label: "اسپرت" },
  { key: "cityDriving", label: "شهری" }, { key: "longTrip", label: "سفر" },
  { key: "maintenanceRisk", label: "ریسک نگهداری" }, { key: "afterSales", label: "خدمات" },
];

const ORIGIN_COLORS: Record<string, string> = {
  iranian: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  chinese: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  korean: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  japanese: "bg-red-500/10 text-red-600 dark:text-red-400",
  european: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export default function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [car, setCar] = useState<CarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "reviews">("overview");
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    fetch(`/api/cars/${id}`).then((r) => r.json()).then((data) => {
      if (data.error) { setLoading(false); return; }
      setCar(data);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Check favorite status
    fetch("/api/favorites").then((r) => r.json()).then((favs) => {
      if (Array.isArray(favs)) setIsFavorite(favs.some((f: { id: string }) => f.id === id));
    }).catch(() => {});
  }, [id]);

  const toggleFavorite = async () => {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId: id }),
    });
    setIsFavorite(!isFavorite);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/car/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${car?.nameFa} | ماشینچی`, url });
        return;
      } catch { /* fallback */ }
    }
    await navigator.clipboard.writeText(url);
    setShowShare(true);
    setTimeout(() => setShowShare(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-lg font-bold mb-2">خودرو پیدا نشد</p>
          <button onClick={() => router.push("/catalog")} className="text-sm text-primary font-bold">بازگشت به کاتالوگ</button>
        </div>
      </div>
    );
  }

  const satisfaction = car.intel?.ownerSatisfaction || 0;
  const risk = car.intel?.purchaseRisk || 0;
  const avgRating = car.reviews.length > 0 ? car.reviews.reduce((s, r) => s + (r.rating || 3), 0) / car.reviews.length : 0;

  return (
    <div className="flex-1 flex flex-col page-transition">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-5 py-3">
          <button onClick={() => router.back()} className="p-1 text-muted hover:text-foreground">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-sm font-black">{car.nameFa}</h1>
          <div className="flex items-center gap-1">
            <button onClick={handleShare} className="p-1.5 text-muted hover:text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></svg>
            </button>
            <button onClick={toggleFavorite} className="p-1.5">
              <svg width="18" height="18" viewBox="0 0 24 24"
                fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"
                className={isFavorite ? "text-danger" : "text-muted"}
              ><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-5 pb-4">
          {/* Image or placeholder */}
          <div className="h-44 bg-gradient-to-br from-primary/8 via-primary/4 to-accent/6 rounded-2xl flex items-center justify-center relative mb-4 overflow-hidden">
            {car.imageUrl ? (
              <img src={car.imageUrl} alt={car.nameFa} className="w-full h-full object-cover" />
            ) : (
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/20">
                <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" /><path d="M9 17h6" />
              </svg>
            )}
            <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${ORIGIN_COLORS[car.origin] || ""}`}>{getOriginLabel(car.origin)}</span>
            <div className="absolute top-3 left-3 flex gap-1">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                car.isNew
                  ? "bg-emerald-500/90 text-white"
                  : "bg-orange-500/90 text-white"
              }`}>{car.isNew ? "صفر" : "کارکرده"}</span>
              <span className="text-[10px] font-bold bg-white/80 dark:bg-black/50 backdrop-blur-sm px-2.5 py-0.5 rounded-full">{getCategoryLabel(car.category)}</span>
            </div>
          </div>

          {/* Name + Price */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-black">{car.nameFa}</h2>
              <p className="text-xs text-muted mt-0.5">{car.brandFa} | {car.nameEn}</p>
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-primary">{toPersianDigits(formatPrice(car.priceMin))}</div>
              <div className="text-[10px] text-muted">تا {toPersianDigits(formatPrice(car.priceMax))}</div>
            </div>
          </div>

          {/* Quick Stats */}
          {car.intel && (
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-accent/8 rounded-xl p-2.5 text-center">
                <div className="text-lg font-black text-accent">{toPersianDigits(satisfaction)}<span className="text-[9px] text-muted font-normal">/۱۰</span></div>
                <div className="text-[9px] text-muted">رضایت</div>
              </div>
              <div className="flex-1 bg-primary/8 rounded-xl p-2.5 text-center">
                <div className="text-lg font-black text-primary">{toPersianDigits(10 - risk)}<span className="text-[9px] text-muted font-normal">/۱۰</span></div>
                <div className="text-[9px] text-muted">امنیت خرید</div>
              </div>
              {avgRating > 0 && (
                <div className="flex-1 bg-amber-500/8 rounded-xl p-2.5 text-center">
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400">{toPersianDigits(avgRating.toFixed(1))}<span className="text-[9px] text-muted font-normal">/۵</span></div>
                  <div className="text-[9px] text-muted">امتیاز</div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {car.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {car.tags.map((tag) => (
                <span key={tag} className="text-[10px] font-bold bg-accent/8 text-accent px-2.5 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="sticky top-12 z-10 bg-background/90 backdrop-blur-sm px-5 pb-2">
          <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
            {([
              { key: "overview" as const, label: "خلاصه" },
              { key: "specs" as const, label: "مشخصات" },
              { key: "reviews" as const, label: `نظرات (${toPersianDigits(car.reviews.length)})` },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === tab.key ? "bg-primary text-white" : "text-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4 mt-3">
              {/* Summary */}
              {car.intel && (
                <p className="text-sm leading-7 text-muted">{car.intel.overallSummary}</p>
              )}
              {car.description && !car.intel && (
                <p className="text-sm leading-7 text-muted">{car.description}</p>
              )}

              {/* Why Buy/Not */}
              {car.intel && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-accent/6 border border-accent/15 rounded-xl p-3">
                    <h4 className="text-xs font-black text-accent mb-1">چرا بخری</h4>
                    <p className="text-[11px] leading-5">{car.intel.whyBuy}</p>
                  </div>
                  <div className="bg-danger/6 border border-danger/15 rounded-xl p-3">
                    <h4 className="text-xs font-black text-danger mb-1">چرا نخری</h4>
                    <p className="text-[11px] leading-5">{car.intel.whyNotBuy}</p>
                  </div>
                </div>
              )}

              {/* Pros & Cons */}
              {car.intel && (car.intel.frequentPros.length > 0 || car.intel.frequentCons.length > 0) && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-[11px] font-black text-accent mb-2">نقاط قوت</h5>
                      {car.intel.frequentPros.map((p, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] mb-1"><span className="text-accent font-bold">+</span><span>{p}</span></div>
                      ))}
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-danger mb-2">نقاط ضعف</h5>
                      {car.intel.frequentCons.map((c, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] mb-1"><span className="text-danger font-bold">-</span><span>{c}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Price Chart */}
              <PriceChartSection history={car.priceHistory} />

              {/* Scores */}
              {car.scores && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h4 className="text-xs font-black mb-3">امتیازات</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {SCORE_LABELS.map(({ key, label }) => {
                      const score = car.scores![key] || 5;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted w-20 shrink-0">{label}</span>
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              key === "maintenanceRisk" ? (score >= 7 ? "bg-danger" : "bg-accent") : (score >= 7 ? "bg-accent" : score >= 4 ? "bg-primary" : "bg-danger")
                            }`} style={{ width: `${(score / 10) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-black w-4 text-center">{toPersianDigits(score)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Suitability */}
              {car.intel && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h4 className="text-xs font-black mb-3">تناسب</h4>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {[
                      { key: "suitFamily", label: "خانواده" }, { key: "suitCity", label: "شهری" },
                      { key: "suitTravel", label: "سفر" }, { key: "suitYoung", label: "جوان" },
                      { key: "suitInvestment", label: "سرمایه" },
                    ].map(({ key, label }) => {
                      const val = (car.intel as unknown as Record<string, number>)[key] || 5;
                      return (
                        <div key={key} className="flex flex-col items-center gap-1">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black ${
                            val >= 7 ? "bg-accent/10 text-accent" : val >= 5 ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"
                          }`}>{toPersianDigits(val)}</div>
                          <span className="text-[9px] text-muted">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {car.intel && (car.intel.commonIssues.length > 0 || car.intel.purchaseWarnings.length > 0) && (
                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-4">
                  <h4 className="text-xs font-black text-yellow-700 dark:text-yellow-400 mb-2">هشدارها</h4>
                  {car.intel.purchaseWarnings.map((w, i) => (
                    <div key={`w${i}`} className="flex items-start gap-1.5 text-[11px] text-danger mb-1"><span className="font-bold">!</span><span>{w}</span></div>
                  ))}
                  {car.intel.commonIssues.map((issue, i) => (
                    <div key={`i${i}`} className="flex items-start gap-1.5 text-[11px] text-yellow-700 dark:text-yellow-400 mb-1"><span className="font-bold">!</span><span>{issue}</span></div>
                  ))}
                </div>
              )}

              {/* Owner verdict */}
              {car.intel?.ownerVerdict && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h4 className="text-xs font-black mb-1.5">نظر مالکان</h4>
                  <p className="text-[11px] leading-6 text-muted">{car.intel.ownerVerdict}</p>
                </div>
              )}
            </div>
          )}

          {/* Specs Tab */}
          {activeTab === "specs" && (
            <div className="mt-3 space-y-4">
              {car.specs ? (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                  {[
                    { label: "موتور", value: car.specs.engine },
                    { label: "قدرت", value: car.specs.horsepower ? `${toPersianDigits(car.specs.horsepower)} اسب بخار` : null },
                    { label: "گشتاور", value: car.specs.torque ? `${toPersianDigits(car.specs.torque)} Nm` : null },
                    { label: "گیربکس", value: car.specs.transmission === "automatic" ? "اتوماتیک" : car.specs.transmission === "manual" ? "دنده‌ای" : car.specs.transmission },
                    { label: "سوخت", value: car.specs.fuelType === "gasoline" ? "بنزینی" : car.specs.fuelType === "diesel" ? "دیزلی" : car.specs.fuelType === "hybrid" ? "هیبریدی" : car.specs.fuelType },
                    { label: "مصرف", value: car.specs.fuelConsumption ? `${toPersianDigits(car.specs.fuelConsumption)} لیتر/۱۰۰کم` : null },
                    { label: "شتاب ۰-۱۰۰", value: car.specs.acceleration ? `${toPersianDigits(car.specs.acceleration)} ثانیه` : null },
                    { label: "ظرفیت", value: `${toPersianDigits(car.specs.seatingCapacity)} نفر` },
                    { label: "قیمت شروع", value: toPersianDigits(formatPrice(car.priceMin)), highlight: true },
                  ].filter((row) => row.value).map((row, i) => (
                    <div key={i} className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? "bg-background/30" : ""}`}>
                      <span className="text-xs text-muted">{row.label}</span>
                      <span className={`text-xs font-bold ${row.highlight ? "text-primary" : ""}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted text-center py-8">مشخصات ثبت نشده</p>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="mt-3 space-y-3">
              {car.reviews.length > 0 ? car.reviews.map((r, i) => (
                <div key={i} className="bg-surface rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] bg-background px-2 py-0.5 rounded-full text-muted">
                      {r.source === "bama" ? "باما" : r.source === "expert" ? "کارشناس" : "کاربر"}
                    </span>
                    {r.rating && (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} width="10" height="10" viewBox="0 0 24 24"
                            fill={star <= Math.round(r.rating!) ? "currentColor" : "none"}
                            stroke="currentColor" strokeWidth="2"
                            className={star <= Math.round(r.rating!) ? "text-amber-500" : "text-border"}
                          ><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        ))}
                        <span className="text-[10px] font-bold mr-1">{toPersianDigits(r.rating.toFixed(1))}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs leading-6 text-muted mb-2">{r.summary}</p>
                  <div className="flex gap-3">
                    {r.pros.length > 0 && (
                      <div className="flex-1">
                        {r.pros.slice(0, 3).map((p, j) => (
                          <div key={j} className="flex items-start gap-1 text-[10px] mb-0.5 text-accent"><span className="font-bold">+</span><span>{p}</span></div>
                        ))}
                      </div>
                    )}
                    {r.cons.length > 0 && (
                      <div className="flex-1">
                        {r.cons.slice(0, 3).map((c, j) => (
                          <div key={j} className="flex items-start gap-1 text-[10px] mb-0.5 text-danger"><span className="font-bold">-</span><span>{c}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted text-center py-8">نظری ثبت نشده</p>
              )}
            </div>
          )}

          {/* Similar + Alternatives */}
          {(car.similarCars.length > 0 || car.alternatives.length > 0) && (
            <div className="mt-6">
              <h4 className="text-xs font-black mb-2">خودروهای مشابه</h4>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {[...car.similarCars, ...car.alternatives].slice(0, 6).map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => router.push(`/car/${sc.id}`)}
                    className="shrink-0 bg-surface rounded-xl border border-border px-3 py-2.5 min-w-[130px] text-right"
                  >
                    <div className="text-xs font-bold">{sc.nameFa}</div>
                    <div className="text-[9px] text-muted">{sc.brandFa}</div>
                    <div className="text-[10px] text-primary font-bold mt-1">{toPersianDigits(formatPrice(sc.priceMin))}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share toast */}
      {showShare && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">
          لینک کپی شد
        </div>
      )}
    </div>
  );
}

// ── Price Chart Component ──
function PriceChartSection({ history }: { history: PricePoint[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border p-4">
        <h4 className="text-xs font-black mb-2">روند قیمت</h4>
        <div className="text-center py-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-muted/30 mb-2">
            <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
          </svg>
          <p className="text-[11px] text-muted">داده قیمتی هنوز ثبت نشده</p>
        </div>
      </div>
    );
  }

  const prices = history.map((p) => Number(p.price));
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const W = 340;
  const H = 180;
  const PAD = 30;

  const points = history.map((p, i) => {
    const x = PAD + ((W - PAD - 10) * i) / Math.max(history.length - 1, 1);
    const y = PAD + (H - PAD * 2) * (1 - (Number(p.price) - minP) / range);
    return { x, y, ...p };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Price change
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const change = ((lastPrice - firstPrice) / firstPrice) * 100;
  const isUp = change > 0;

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-black">روند قیمت</h4>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isUp ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"
        }`}>
          {isUp ? "+" : ""}{toPersianDigits(change.toFixed(1))}٪
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD + (H - PAD * 2) * (1 - frac);
          const val = minP + range * frac;
          return (
            <g key={frac}>
              <line x1={PAD} y1={y} x2={W - 10} y2={y} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={PAD - 2} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="7" fontFamily="Vazirmatn">
                {formatPrice(val)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        {points.length >= 2 && (
          <polygon
            fill="url(#priceGrad)"
            points={`${points[0].x},${PAD + H - PAD * 2} ${polyline} ${points[points.length - 1].x},${PAD + H - PAD * 2}`}
          />
        )}

        {/* Line */}
        <polyline fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={polyline} />

        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#2563eb" />
        ))}

        {/* Date labels */}
        {[0, Math.floor(history.length / 2), history.length - 1].map((idx) => {
          if (!history[idx] || (idx > 0 && idx === history.length - 1 && history.length <= 2 && idx === Math.floor(history.length / 2))) return null;
          const x = PAD + ((W - PAD - 10) * idx) / Math.max(history.length - 1, 1);
          return (
            <text key={idx} x={x} y={H + 10} textAnchor="middle" fill="var(--muted)" fontSize="7" fontFamily="Vazirmatn">
              {history[idx].date.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
