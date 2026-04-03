"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";
import BottomSheet from "@/components/BottomSheet";

interface Review {
  source: string;
  summary: string;
  pros: string[];
  cons: string[];
  warnings: string[];
  rating: number | null;
}

interface Intel {
  frequentPros: string[];
  frequentCons: string[];
  commonIssues: string[];
  purchaseWarnings: string[];
  ownerVerdict: string;
  overallSummary: string;
  whyBuy: string;
  whyNotBuy: string;
  purchaseRisk: number;
  ownerSatisfaction: number;
  suitFamily: number;
  suitCity: number;
  suitTravel: number;
  suitYoung: number;
  suitInvestment: number;
}

interface Recommendation {
  id: string;
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
  specs: { engine?: string | null; horsepower?: number | null; transmission?: string | null; fuelConsumption?: number | null } | null;
  reviews: Review[];
  intel: Intel | null;
  matchScore: number;
  matchReasons: string[];
  risks: string[];
  isLiked: boolean;
}

interface Alternative {
  id: string;
  nameFa: string;
  nameEn: string;
  brandFa: string;
  category: string;
  origin: string;
  priceMin: string;
  priceMax: string;
  matchScore: number;
  matchReasons: string[];
}

interface CarDetail {
  id: string;
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
  specs: { engine?: string | null; horsepower?: number | null; transmission?: string | null; fuelType?: string | null; fuelConsumption?: number | null } | null;
  reviews: Review[];
  intel: Intel | null;
  similarCars: { id: string; nameFa: string; brandFa: string; priceMin: string; priceMax: string }[];
  alternatives: { id: string; nameFa: string; brandFa: string; priceMin: string; priceMax: string }[];
}

export default function ResultsPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [userTypes, setUserTypes] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<CarDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/recommend")
      .then((res) => res.json())
      .then((data) => {
        if (data.recommendations) setRecommendations(data.recommendations);
        if (data.alternatives) setAlternatives(data.alternatives);
        if (data.userTypes) setUserTypes(data.userTypes);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/summary")
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) setSummary(data.summary);
        setAiLoading(false);
      })
      .catch(() => setAiLoading(false));
  }, []);

  const openCarDetail = async (carId: string) => {
    setSheetOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/cars/${carId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCar(data);
      }
    } catch {
      // ignore
    }
    setDetailLoading(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted">در حال تحلیل سلیقه‌ات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col page-transition">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/explore?budget=2500000000")}
            className="text-muted hover:text-foreground transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-black">پیشنهادهای ماشینچی</h1>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-primary font-bold"
          >
            از اول
          </button>
        </div>

        {/* User Type Badges */}
        {userTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-muted">تیپ شما:</span>
            {userTypes.map((type) => (
              <span
                key={type}
                className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full"
              >
                {type}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {/* AI Summary */}
        {aiLoading ? (
          <div className="bg-surface rounded-2xl border border-border p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary animate-pulse">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                </svg>
              </div>
              <span className="text-sm font-bold">دستیار هوشمند در حال تحلیل...</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-border rounded animate-pulse w-full" />
              <div className="h-3 bg-border rounded animate-pulse w-4/5" />
              <div className="h-3 bg-border rounded animate-pulse w-3/5" />
            </div>
          </div>
        ) : summary ? (
          <div className="bg-surface rounded-2xl border border-border p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-sm font-bold">نظر دستیار هوشمند</span>
            </div>
            <div className="text-sm leading-7 text-foreground whitespace-pre-line">
              {summary}
            </div>
          </div>
        ) : null}

        {/* Smart Car Cards */}
        <div className="space-y-4">
          {recommendations.map((car, index) => (
            <div
              key={car.id}
              className="bg-surface rounded-2xl border border-border overflow-hidden"
            >
              <button
                onClick={() => openCarDetail(car.id)}
                className="w-full p-5 text-right"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                      car.isLiked ? "bg-accent text-white" : "bg-primary text-white"
                    }`}>
                      {car.isLiked ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      ) : (
                        toPersianDigits(index + 1)
                      )}
                    </span>
                    <div>
                      <h3 className="font-black text-base">{car.nameFa}</h3>
                      <p className="text-xs text-muted">
                        {car.brandFa} | {getOriginLabel(car.origin)} | {getCategoryLabel(car.category)}
                      </p>
                    </div>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>

                {/* Price */}
                <div className="mr-11 mb-3">
                  <span className="text-sm font-bold text-primary">
                    {toPersianDigits(formatPrice(car.priceMin))}
                  </span>
                  <span className="text-xs text-muted"> تا </span>
                  <span className="text-sm font-bold text-primary">
                    {toPersianDigits(formatPrice(car.priceMax))}
                  </span>
                  <span className="text-xs text-muted"> تومان</span>
                </div>

                {/* Match Reasons */}
                {car.matchReasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mr-11 mb-2">
                    {car.matchReasons.map((reason) => (
                      <span
                        key={reason}
                        className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}

                {/* Risks */}
                {car.risks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mr-11 mb-2">
                    {car.risks.slice(0, 2).map((risk) => (
                      <span
                        key={risk}
                        className="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded-full"
                      >
                        {risk}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Intel */}
                {car.intel && (
                  <p className="text-xs text-muted leading-6 mr-11 line-clamp-2">
                    {car.intel.overallSummary}
                  </p>
                )}

                {/* Match Score */}
                <div className="mr-11 mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(Math.round(car.matchScore * 10), 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {toPersianDigits(Math.min(Math.round(car.matchScore * 10), 100))}%
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Alternatives Section */}
        {alternatives.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-black mb-3">گزینه‌های جایگزین</h2>
            <div className="space-y-3">
              {alternatives.map((alt) => (
                <button
                  key={alt.id}
                  onClick={() => openCarDetail(alt.id)}
                  className="w-full bg-surface rounded-xl border border-border p-4 text-right flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-sm font-bold">{alt.nameFa}</h3>
                    <p className="text-xs text-muted">
                      {alt.brandFa} | {getOriginLabel(alt.origin)}
                    </p>
                    <div className="flex gap-1.5 mt-1.5">
                      {alt.matchReasons.slice(0, 2).map((r) => (
                        <span key={r} className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-primary block">
                      {toPersianDigits(formatPrice(alt.priceMin))}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted mt-1">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Restart Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-surface border border-border text-foreground font-bold rounded-2xl hover:bg-background transition-colors"
          >
            شروع دوباره با بودجه جدید
          </button>
        </div>
      </div>

      {/* Bottom Sheet - Full Car Detail */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => { setSheetOpen(false); setSelectedCar(null); }}
        title={selectedCar?.nameFa || ""}
      >
        {detailLoading ? (
          <div className="py-8 text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">در حال بارگذاری...</p>
          </div>
        ) : selectedCar ? (
          <div className="space-y-5 pb-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">{selectedCar.brandFa} | {getOriginLabel(selectedCar.origin)} | {getCategoryLabel(selectedCar.category)}</p>
                <div className="mt-1">
                  <span className="text-sm font-bold text-primary">{toPersianDigits(formatPrice(selectedCar.priceMin))}</span>
                  <span className="text-xs text-muted"> تا </span>
                  <span className="text-sm font-bold text-primary">{toPersianDigits(formatPrice(selectedCar.priceMax))}</span>
                </div>
              </div>
              {selectedCar.tags && (
                <div className="flex flex-wrap gap-1">
                  {selectedCar.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] bg-background text-muted px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Overview Summary */}
            {selectedCar.intel && (
              <div className="bg-background rounded-xl p-4">
                <h4 className="text-sm font-bold mb-2">جمع‌بندی</h4>
                <p className="text-sm leading-7 text-muted">{selectedCar.intel.overallSummary}</p>
              </div>
            )}

            {/* Why Buy / Why Not */}
            {selectedCar.intel && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-accent/5 rounded-xl p-3">
                  <h5 className="text-xs font-bold text-accent mb-1">چرا بخری</h5>
                  <p className="text-xs leading-6 text-muted">{selectedCar.intel.whyBuy}</p>
                </div>
                <div className="bg-danger/5 rounded-xl p-3">
                  <h5 className="text-xs font-bold text-danger mb-1">چرا نخری</h5>
                  <p className="text-xs leading-6 text-muted">{selectedCar.intel.whyNotBuy}</p>
                </div>
              </div>
            )}

            {/* Suitability Scores */}
            {selectedCar.intel && (
              <div>
                <h4 className="text-sm font-bold mb-3">تناسب با نیاز شما</h4>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { key: "suitFamily", label: "خانواده" },
                    { key: "suitCity", label: "شهری" },
                    { key: "suitTravel", label: "سفر" },
                    { key: "suitYoung", label: "جوان" },
                    { key: "suitInvestment", label: "سرمایه" },
                  ].map(({ key, label }) => {
                    const val = (selectedCar.intel as unknown as Record<string, number>)?.[key] || 5;
                    return (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${
                            val >= 7 ? "bg-accent/10 text-accent" : val >= 5 ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"
                          }`}
                        >
                          {toPersianDigits(val)}
                        </div>
                        <span className="text-[10px] text-muted">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Score Bars */}
            {selectedCar.scores && (
              <div>
                <h4 className="text-sm font-bold mb-3">امتیازات</h4>
                <div className="space-y-2">
                  {[
                    { key: "comfort", label: "راحتی" },
                    { key: "performance", label: "عملکرد" },
                    { key: "economy", label: "صرفه اقتصادی" },
                    { key: "safety", label: "ایمنی" },
                    { key: "reliability", label: "قابلیت اطمینان" },
                    { key: "resaleValue", label: "نقدشوندگی" },
                    { key: "maintenanceRisk", label: "ریسک نگهداری" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-muted w-24 shrink-0">{label}</span>
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${key === "maintenanceRisk" ? "bg-danger" : "bg-primary"}`}
                          style={{ width: `${((selectedCar.scores[key] || 5) / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-6 text-left">
                        {toPersianDigits(selectedCar.scores[key] || 5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pros & Cons from intel */}
            {selectedCar.intel && (
              <div className="space-y-3">
                {selectedCar.intel.frequentPros.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-accent mb-2">نقاط قوت</h4>
                    {selectedCar.intel.frequentPros.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs mb-1.5">
                        <span className="text-accent shrink-0 mt-0.5">+</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedCar.intel.frequentCons.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-danger mb-2">نقاط ضعف</h4>
                    {selectedCar.intel.frequentCons.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs mb-1.5">
                        <span className="text-danger shrink-0 mt-0.5">-</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Common Issues */}
            {selectedCar.intel && selectedCar.intel.commonIssues.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-4">
                <h4 className="text-sm font-bold text-yellow-700 dark:text-yellow-400 mb-2">خرابی‌های رایج</h4>
                {selectedCar.intel.commonIssues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400 mb-1.5">
                    <span className="shrink-0 mt-0.5">!</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Purchase Warnings */}
            {selectedCar.intel && selectedCar.intel.purchaseWarnings.length > 0 && (
              <div className="bg-danger/5 rounded-xl p-4">
                <h4 className="text-sm font-bold text-danger mb-2">هشدارهای خرید</h4>
                {selectedCar.intel.purchaseWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-danger mb-1.5">
                    <span className="shrink-0 mt-0.5">!</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Owner Verdict */}
            {selectedCar.intel && (
              <div className="bg-background rounded-xl p-4">
                <h4 className="text-sm font-bold mb-2">نظر مالکان</h4>
                <p className="text-sm leading-7 text-muted">{selectedCar.intel.ownerVerdict}</p>
              </div>
            )}

            {/* Specs */}
            {selectedCar.specs && (
              <div>
                <h4 className="text-sm font-bold mb-2">مشخصات فنی</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCar.specs.engine && (
                    <span className="text-xs bg-background px-3 py-1.5 rounded-lg">موتور: {String(selectedCar.specs.engine)}</span>
                  )}
                  {selectedCar.specs.horsepower && (
                    <span className="text-xs bg-background px-3 py-1.5 rounded-lg">{toPersianDigits(String(selectedCar.specs.horsepower))} اسب بخار</span>
                  )}
                  {selectedCar.specs.fuelConsumption && (
                    <span className="text-xs bg-background px-3 py-1.5 rounded-lg">مصرف: {toPersianDigits(String(selectedCar.specs.fuelConsumption))} لیتر</span>
                  )}
                  {selectedCar.specs.transmission && (
                    <span className="text-xs bg-background px-3 py-1.5 rounded-lg">
                      {selectedCar.specs.transmission === "automatic" ? "اتوماتیک" : selectedCar.specs.transmission === "manual" ? "دنده‌ای" : String(selectedCar.specs.transmission)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Similar Cars */}
            {selectedCar.similarCars && selectedCar.similarCars.length > 0 && (
              <div>
                <h4 className="text-sm font-bold mb-2">ماشین‌های مشابه</h4>
                <div className="space-y-2">
                  {selectedCar.similarCars.map((sc) => (
                    <button
                      key={sc.id}
                      onClick={() => openCarDetail(sc.id)}
                      className="w-full flex items-center justify-between bg-background rounded-xl px-4 py-3 text-right"
                    >
                      <div>
                        <span className="text-sm font-bold">{sc.nameFa}</span>
                        <span className="text-xs text-muted mr-2">{sc.brandFa}</span>
                      </div>
                      <span className="text-xs text-primary font-bold">
                        {toPersianDigits(formatPrice(sc.priceMin))}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Alternatives */}
            {selectedCar.alternatives && selectedCar.alternatives.length > 0 && (
              <div>
                <h4 className="text-sm font-bold mb-2">جایگزین‌ها</h4>
                <div className="space-y-2">
                  {selectedCar.alternatives.map((alt) => (
                    <button
                      key={alt.id}
                      onClick={() => openCarDetail(alt.id)}
                      className="w-full flex items-center justify-between bg-background rounded-xl px-4 py-3 text-right"
                    >
                      <div>
                        <span className="text-sm font-bold">{alt.nameFa}</span>
                        <span className="text-xs text-muted mr-2">{alt.brandFa}</span>
                      </div>
                      <span className="text-xs text-primary font-bold">
                        {toPersianDigits(formatPrice(alt.priceMin))}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* User Reviews */}
            {selectedCar.reviews && selectedCar.reviews.length > 0 && (
              <div>
                <h4 className="text-sm font-bold mb-2">نظرات کاربران</h4>
                <div className="space-y-3">
                  {selectedCar.reviews.slice(0, 3).map((r, i) => (
                    <div key={i} className="bg-background rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs bg-surface px-2 py-0.5 rounded-full text-muted">
                          {r.source === "bama" ? "باما" : r.source === "expert" ? "کارشناس" : "کاربر"}
                        </span>
                        {r.rating && (
                          <span className="text-xs font-bold text-primary">
                            {toPersianDigits(r.rating.toFixed(1))} از ۵
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-6 text-muted mb-2">{r.summary}</p>
                      {r.pros.length > 0 && (
                        <div className="space-y-1 mb-1">
                          {r.pros.slice(0, 2).map((p, j) => (
                            <div key={j} className="flex items-start gap-1.5 text-xs text-accent">
                              <span className="shrink-0">+</span>
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {r.cons.length > 0 && (
                        <div className="space-y-1">
                          {r.cons.slice(0, 2).map((c, j) => (
                            <div key={j} className="flex items-start gap-1.5 text-xs text-danger">
                              <span className="shrink-0">-</span>
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
