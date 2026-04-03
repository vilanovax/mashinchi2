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
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const toggleFavorite = async (carId: string) => {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId }),
    });
    const data = await res.json();
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (data.favorited) next.add(carId); else next.delete(carId);
      return next;
    });
  };

  useEffect(() => {
    // Load favorites
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => { if (d.favorites) setFavoriteIds(new Set(d.favorites.map((f: { id: string }) => f.id))); })
      .catch(() => {});

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
          <div className="space-y-4 pb-4">

            {/* Header: Price + Tags + Favorite */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">{selectedCar.brandFa} | {getOriginLabel(selectedCar.origin)} | {getCategoryLabel(selectedCar.category)}</p>
                <div className="mt-1">
                  <span className="text-sm font-bold text-primary">{toPersianDigits(formatPrice(selectedCar.priceMin))}</span>
                  <span className="text-xs text-muted"> تا </span>
                  <span className="text-sm font-bold text-primary">{toPersianDigits(formatPrice(selectedCar.priceMax))}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedCar.tags && selectedCar.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] bg-background text-muted px-2 py-0.5 rounded-full">{tag}</span>
                ))}
                <button
                  onClick={() => toggleFavorite(selectedCar.id)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    favoriteIds.has(selectedCar.id) ? "bg-danger/10" : "bg-background"
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24"
                    fill={favoriteIds.has(selectedCar.id) ? "currentColor" : "none"}
                    stroke="currentColor" strokeWidth="2"
                    className={favoriteIds.has(selectedCar.id) ? "text-danger" : "text-muted"}
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Hero: Quick Stats Row */}
            {selectedCar.intel && (
              <div className="flex gap-2">
                <div className="flex-1 bg-accent/8 rounded-xl p-3 text-center">
                  <div className="text-lg font-black text-accent">{toPersianDigits(selectedCar.intel.ownerSatisfaction)}<span className="text-xs font-normal text-muted">/۱۰</span></div>
                  <div className="text-[10px] text-muted mt-0.5">رضایت مالکان</div>
                </div>
                <div className="flex-1 bg-primary/8 rounded-xl p-3 text-center">
                  <div className="text-lg font-black text-primary">{toPersianDigits(10 - selectedCar.intel.purchaseRisk)}<span className="text-xs font-normal text-muted">/۱۰</span></div>
                  <div className="text-[10px] text-muted mt-0.5">امنیت خرید</div>
                </div>
                {selectedCar.reviews.length > 0 && (
                  <div className="flex-1 bg-yellow-500/8 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-yellow-600 dark:text-yellow-400">
                      {toPersianDigits((selectedCar.reviews.reduce((s, r) => s + (r.rating || 3), 0) / selectedCar.reviews.length).toFixed(1))}
                      <span className="text-xs font-normal text-muted">/۵</span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">امتیاز کاربران</div>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {selectedCar.intel && (
              <p className="text-sm leading-7 text-muted">{selectedCar.intel.overallSummary}</p>
            )}

            {/* Why Buy / Why Not */}
            {selectedCar.intel && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-accent/6 border border-accent/15 rounded-xl p-3">
                  <h5 className="text-xs font-black text-accent mb-1.5">چرا بخری</h5>
                  <p className="text-xs leading-6">{selectedCar.intel.whyBuy}</p>
                </div>
                <div className="bg-danger/6 border border-danger/15 rounded-xl p-3">
                  <h5 className="text-xs font-black text-danger mb-1.5">چرا نخری</h5>
                  <p className="text-xs leading-6">{selectedCar.intel.whyNotBuy}</p>
                </div>
              </div>
            )}

            {/* Suitability Scores */}
            {selectedCar.intel && (
              <div className="bg-background rounded-xl p-4">
                <h4 className="text-xs font-black mb-3">تناسب با نیاز شما</h4>
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
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black ${
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

            {/* Pros & Cons Side by Side */}
            {selectedCar.intel && (selectedCar.intel.frequentPros.length > 0 || selectedCar.intel.frequentCons.length > 0) && (
              <div className="bg-background rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  {selectedCar.intel.frequentPros.length > 0 && (
                    <div>
                      <h5 className="text-xs font-black text-accent mb-2">نقاط قوت</h5>
                      <div className="space-y-1.5">
                        {selectedCar.intel.frequentPros.slice(0, 4).map((p, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px]">
                            <span className="text-accent shrink-0 mt-px font-bold">+</span>
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedCar.intel.frequentCons.length > 0 && (
                    <div>
                      <h5 className="text-xs font-black text-danger mb-2">نقاط ضعف</h5>
                      <div className="space-y-1.5">
                        {selectedCar.intel.frequentCons.slice(0, 4).map((c, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px]">
                            <span className="text-danger shrink-0 mt-px font-bold">-</span>
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scores - compact grid */}
            {selectedCar.scores && (
              <div className="bg-background rounded-xl p-4">
                <h4 className="text-xs font-black mb-3">امتیازات</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    { key: "comfort", label: "راحتی" },
                    { key: "performance", label: "عملکرد" },
                    { key: "economy", label: "صرفه اقتصادی" },
                    { key: "safety", label: "ایمنی" },
                    { key: "reliability", label: "اطمینان" },
                    { key: "resaleValue", label: "نقدشوندگی" },
                    { key: "maintenanceRisk", label: "ریسک نگهداری" },
                    { key: "afterSales", label: "خدمات پس فروش" },
                  ].map(({ key, label }) => {
                    const score = selectedCar.scores[key] || 5;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[11px] text-muted w-20 shrink-0">{label}</span>
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              key === "maintenanceRisk"
                                ? score >= 7 ? "bg-danger" : score >= 4 ? "bg-yellow-500" : "bg-accent"
                                : score >= 7 ? "bg-accent" : score >= 4 ? "bg-primary" : "bg-danger"
                            }`}
                            style={{ width: `${(score / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-black w-4 text-center">{toPersianDigits(score)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Warnings Section - merged */}
            {selectedCar.intel && (selectedCar.intel.commonIssues.length > 0 || selectedCar.intel.purchaseWarnings.length > 0) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-4">
                <h4 className="text-xs font-black text-yellow-700 dark:text-yellow-400 mb-2">هشدارها و خرابی‌های رایج</h4>
                <div className="space-y-1.5">
                  {selectedCar.intel.purchaseWarnings.map((w, i) => (
                    <div key={`w-${i}`} className="flex items-start gap-1.5 text-[11px] text-danger">
                      <span className="shrink-0 mt-px font-bold">!</span>
                      <span>{w}</span>
                    </div>
                  ))}
                  {selectedCar.intel.commonIssues.map((issue, i) => (
                    <div key={`i-${i}`} className="flex items-start gap-1.5 text-[11px] text-yellow-700 dark:text-yellow-400">
                      <span className="shrink-0 mt-px font-bold">!</span>
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Owner Verdict + Specs - combined */}
            <div className="bg-background rounded-xl p-4 space-y-3">
              {selectedCar.intel && (
                <div>
                  <h4 className="text-xs font-black mb-1.5">نظر مالکان</h4>
                  <p className="text-[11px] leading-6 text-muted">{selectedCar.intel.ownerVerdict}</p>
                </div>
              )}
              {selectedCar.specs && (
                <div className={selectedCar.intel ? "pt-3 border-t border-border" : ""}>
                  <h4 className="text-xs font-black mb-2">مشخصات فنی</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCar.specs.engine && (
                      <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">{String(selectedCar.specs.engine)}</span>
                    )}
                    {selectedCar.specs.horsepower && (
                      <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">{toPersianDigits(String(selectedCar.specs.horsepower))} اسب</span>
                    )}
                    {selectedCar.specs.fuelConsumption && (
                      <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">مصرف {toPersianDigits(String(selectedCar.specs.fuelConsumption))} لیتر</span>
                    )}
                    {selectedCar.specs.transmission && (
                      <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">
                        {selectedCar.specs.transmission === "automatic" ? "اتوماتیک" : selectedCar.specs.transmission === "manual" ? "دنده‌ای" : String(selectedCar.specs.transmission)}
                      </span>
                    )}
                    {selectedCar.specs.fuelType && (
                      <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">
                        {selectedCar.specs.fuelType === "gasoline" ? "بنزینی" : selectedCar.specs.fuelType === "diesel" ? "دیزلی" : selectedCar.specs.fuelType === "hybrid" ? "هیبریدی" : String(selectedCar.specs.fuelType)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Similar Cars + Alternatives - horizontal scroll */}
            {((selectedCar.similarCars && selectedCar.similarCars.length > 0) || (selectedCar.alternatives && selectedCar.alternatives.length > 0)) && (
              <div>
                <h4 className="text-xs font-black mb-2">ماشین‌های مشابه و جایگزین</h4>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {selectedCar.similarCars?.map((sc) => (
                    <button
                      key={sc.id}
                      onClick={() => openCarDetail(sc.id)}
                      className="shrink-0 bg-background rounded-xl px-3 py-2.5 min-w-[140px] text-right"
                    >
                      <div className="text-xs font-bold">{sc.nameFa}</div>
                      <div className="text-[10px] text-muted">{sc.brandFa}</div>
                      <div className="text-[11px] text-primary font-bold mt-1">{toPersianDigits(formatPrice(sc.priceMin))}</div>
                    </button>
                  ))}
                  {selectedCar.alternatives?.map((alt) => (
                    <button
                      key={alt.id}
                      onClick={() => openCarDetail(alt.id)}
                      className="shrink-0 bg-accent/5 border border-accent/15 rounded-xl px-3 py-2.5 min-w-[140px] text-right"
                    >
                      <div className="text-xs font-bold">{alt.nameFa}</div>
                      <div className="text-[10px] text-muted">{alt.brandFa}</div>
                      <div className="text-[11px] text-accent font-bold mt-1">{toPersianDigits(formatPrice(alt.priceMin))}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* User Reviews - compact */}
            {selectedCar.reviews && selectedCar.reviews.length > 0 && (
              <div>
                <h4 className="text-xs font-black mb-2">نظرات کاربران</h4>
                <div className="space-y-2">
                  {selectedCar.reviews.slice(0, 2).map((r, i) => (
                    <div key={i} className="bg-background rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] bg-surface px-2 py-0.5 rounded-full text-muted">
                          {r.source === "bama" ? "باما" : r.source === "expert" ? "کارشناس" : "کاربر"}
                        </span>
                        {r.rating && (
                          <span className="text-[11px] font-bold text-primary">
                            {toPersianDigits(r.rating.toFixed(1))} از ۵
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-5 text-muted mb-1.5">{r.summary}</p>
                      <div className="flex gap-3">
                        {r.pros.length > 0 && (
                          <div className="flex-1 space-y-0.5">
                            {r.pros.slice(0, 2).map((p, j) => (
                              <div key={j} className="flex items-start gap-1 text-[10px] text-accent">
                                <span className="shrink-0 font-bold">+</span>
                                <span className="line-clamp-1">{p}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {r.cons.length > 0 && (
                          <div className="flex-1 space-y-0.5">
                            {r.cons.slice(0, 2).map((c, j) => (
                              <div key={j} className="flex items-start gap-1 text-[10px] text-danger">
                                <span className="shrink-0 font-bold">-</span>
                                <span className="line-clamp-1">{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
