"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";

interface Recommendation {
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
  matchScore: number;
}

export default function ResultsPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  useEffect(() => {
    // First load recommendations quickly
    fetch("/api/recommend")
      .then((res) => res.json())
      .then((data) => {
        if (data.recommendations) {
          setRecommendations(data.recommendations);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Then load AI summary (slower)
    fetch("/api/summary")
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.recommendations) {
          setRecommendations(data.recommendations);
        }
        setAiLoading(false);
      })
      .catch(() => setAiLoading(false));
  }, []);

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

        {/* Car Cards */}
        <div className="space-y-4">
          {recommendations.map((car, index) => (
            <div
              key={`${car.nameEn}-${index}`}
              className="bg-surface rounded-2xl border border-border overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() =>
                  setExpandedCard(expandedCard === index ? null : index)
                }
                className="w-full p-5 text-right"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-black">
                      {toPersianDigits(index + 1)}
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
                    className={`text-muted transition-transform duration-200 ${
                      expandedCard === index ? "rotate-180" : ""
                    }`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>

                {/* Price */}
                <div className="mr-11">
                  <span className="text-sm font-bold text-primary">
                    {toPersianDigits(formatPrice(car.priceMin))}
                  </span>
                  <span className="text-xs text-muted"> تا </span>
                  <span className="text-sm font-bold text-primary">
                    {toPersianDigits(formatPrice(car.priceMax))}
                  </span>
                  <span className="text-xs text-muted"> تومان</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3 mr-11">
                  {car.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-background text-muted px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>

              {/* Expanded Details */}
              {expandedCard === index && (
                <div className="px-5 pb-5 border-t border-border pt-4">
                  <p className="text-sm leading-7 text-muted mb-4">
                    {car.description}
                  </p>

                  {/* Score Bars */}
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
                        <span className="text-xs text-muted w-24 shrink-0">
                          {label}
                        </span>
                        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              key === "maintenanceRisk"
                                ? "bg-danger"
                                : "bg-primary"
                            }`}
                            style={{
                              width: `${((car.scores?.[key] || 5) / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold w-6 text-left">
                          {toPersianDigits(car.scores?.[key] || 5)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Specs */}
                  {car.specs && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {car.specs.engine && (
                        <span className="text-xs bg-background px-3 py-1.5 rounded-lg">
                          موتور: {String(car.specs.engine)}
                        </span>
                      )}
                      {car.specs.horsepower && (
                        <span className="text-xs bg-background px-3 py-1.5 rounded-lg">
                          {toPersianDigits(String(car.specs.horsepower))} اسب بخار
                        </span>
                      )}
                      {car.specs.fuelConsumption && (
                        <span className="text-xs bg-background px-3 py-1.5 rounded-lg">
                          مصرف: {toPersianDigits(String(car.specs.fuelConsumption))} لیتر
                        </span>
                      )}
                    </div>
                  )}

                  {/* Match Score */}
                  <div className="mt-4 p-3 bg-primary/5 rounded-xl text-center">
                    <span className="text-xs text-muted">تطبیق با سلیقه تو: </span>
                    <span className="text-sm font-black text-primary">
                      {toPersianDigits(Math.min(Math.round(car.matchScore * 10), 100))}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

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
    </div>
  );
}
