"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatPrice, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";
import BottomSheet from "@/components/BottomSheet";

interface Car {
  id: string;
  nameEn: string;
  nameFa: string;
  brand: string;
  brandFa: string;
  category: string;
  priceMin: string;
  priceMax: string;
  origin: string;
  description: string;
  tags: string[];
  scores: {
    comfort: number;
    performance: number;
    economy: number;
    safety: number;
    prestige: number;
    reliability: number;
    resaleValue: number;
    familyFriendly: number;
    sportiness: number;
    maintenanceRisk: number;
    afterSales: number;
  } | null;
  specs: {
    engine: string | null;
    horsepower: number | null;
    transmission: string | null;
    fuelType: string | null;
    fuelConsumption: number | null;
  } | null;
  reviews: {
    source: string;
    summary: string;
    pros: string[];
    cons: string[];
    warnings: string[];
    rating: number | null;
  }[];
}

interface CarDetail extends Car {
  intel: {
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
  } | null;
  similarCars: { id: string; nameFa: string; brandFa: string; priceMin: string; priceMax: string }[];
}

const ROUND_SIZE = 6;
const MIN_INTERACTIONS = 6;

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const budget = searchParams.get("budget") || "2500000000";

  const [cars, setCars] = useState<Car[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interactedIds, setInteractedIds] = useState<string[]>([]);
  const [totalInteractions, setTotalInteractions] = useState(0);
  const [animClass, setAnimClass] = useState("card-enter");
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [carDetail, setCarDetail] = useState<CarDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCars = useCallback(async () => {
    setLoading(true);
    const budgetNum = parseInt(budget);
    const minBudget = Math.floor(budgetNum * 0.7);
    const maxBudget = Math.floor(budgetNum * 1.3);

    const excludeParam = interactedIds.length > 0 ? `&exclude=${interactedIds.join(",")}` : "";
    const res = await fetch(
      `/api/cars?budgetMin=${minBudget}&budgetMax=${maxBudget}${excludeParam}`
    );
    const data = await res.json();

    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, ROUND_SIZE);
    setCars(shuffled);
    setCurrentIndex(0);
    setLoading(false);
  }, [budget, interactedIds]);

  useEffect(() => {
    fetchCars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const currentCar = cars[currentIndex];

  const handleAction = async (action: "like" | "skip") => {
    if (!currentCar) return;

    setAnimClass(action === "like" ? "card-exit-right" : "card-exit-left");

    await fetch("/api/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carId: currentCar.id,
        action,
        round,
      }),
    });

    setInteractedIds((prev) => [...prev, currentCar.id]);
    const newTotal = totalInteractions + 1;
    setTotalInteractions(newTotal);

    setTimeout(() => {
      if (currentIndex < cars.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setAnimClass("card-enter");
        setSheetOpen(false);
        setCarDetail(null);
      } else if (newTotal >= MIN_INTERACTIONS) {
        router.push("/results");
      } else {
        setRound((prev) => prev + 1);
        setAnimClass("card-enter");
        setSheetOpen(false);
        setCarDetail(null);
      }
    }, 280);
  };

  const openDetail = async (carId: string) => {
    setSheetOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/cars/${carId}`);
      if (res.ok) {
        const data = await res.json();
        setCarDetail(data);
      }
    } catch {
      // ignore
    }
    setDetailLoading(false);
  };

  const getTopTraits = (car: Car): string[] => {
    if (!car.scores) return [];
    const traits: { label: string; value: number }[] = [
      { label: "راحت", value: car.scores.comfort },
      { label: "قدرتمند", value: car.scores.performance },
      { label: "اقتصادی", value: car.scores.economy },
      { label: "امن", value: car.scores.safety },
      { label: "باکلاس", value: car.scores.prestige },
      { label: "مطمئن", value: car.scores.reliability },
      { label: "نقدشونده", value: car.scores.resaleValue },
      { label: "خانوادگی", value: car.scores.familyFriendly },
      { label: "اسپرت", value: car.scores.sportiness },
    ];
    return traits
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((t) => t.label);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted">در حال پیدا کردن ماشین‌ها...</p>
        </div>
      </div>
    );
  }

  if (!currentCar) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-lg font-bold mb-4">ماشینی پیدا نشد!</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold"
          >
            برگرد و بودجه رو عوض کن
          </button>
        </div>
      </div>
    );
  }

  const progress = Math.min((totalInteractions / MIN_INTERACTIONS) * 100, 100);

  return (
    <div className="flex-1 flex flex-col page-transition">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push("/")}
            className="text-muted hover:text-foreground transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-sm text-muted">
            {toPersianDigits(totalInteractions)} از {toPersianDigits(MIN_INTERACTIONS)}
          </div>
          {totalInteractions >= MIN_INTERACTIONS && (
            <button
              onClick={() => router.push("/results")}
              className="text-sm font-bold text-primary"
            >
              نتایج
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Car Card */}
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <div
          className={`w-full max-w-sm bg-surface rounded-3xl shadow-xl border border-border overflow-hidden ${animClass}`}
        >
          {/* Car Image Placeholder */}
          <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative">
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-primary/30"
            >
              <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" />
              <path d="M9 17h6" />
            </svg>

            {/* Origin badge */}
            <span className="absolute top-3 right-3 text-xs font-bold bg-white/80 dark:bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
              {getOriginLabel(currentCar.origin)}
            </span>

            {/* Category badge */}
            <span className="absolute top-3 left-3 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
              {getCategoryLabel(currentCar.category)}
            </span>
          </div>

          {/* Card Body */}
          <div className="p-5">
            {/* Name */}
            <div className="mb-1">
              <h3 className="text-xl font-black">{currentCar.nameFa}</h3>
              <p className="text-sm text-muted">{currentCar.brandFa} | {currentCar.nameEn}</p>
            </div>

            {/* Price */}
            <div className="mb-4">
              <span className="text-lg font-bold text-primary">
                {toPersianDigits(formatPrice(currentCar.priceMin))}
              </span>
              <span className="text-muted text-sm"> تا </span>
              <span className="text-lg font-bold text-primary">
                {toPersianDigits(formatPrice(currentCar.priceMax))}
              </span>
            </div>

            {/* Quick Specs */}
            {currentCar.specs && (
              <div className="flex gap-3 mb-4 text-xs text-muted">
                {currentCar.specs.engine && (
                  <span className="bg-background px-2 py-1 rounded-lg">
                    {currentCar.specs.engine}
                  </span>
                )}
                {currentCar.specs.horsepower && (
                  <span className="bg-background px-2 py-1 rounded-lg">
                    {toPersianDigits(currentCar.specs.horsepower)} اسب
                  </span>
                )}
                {currentCar.specs.transmission && (
                  <span className="bg-background px-2 py-1 rounded-lg">
                    {currentCar.specs.transmission === "automatic"
                      ? "اتوماتیک"
                      : currentCar.specs.transmission === "manual"
                      ? "دنده‌ای"
                      : currentCar.specs.transmission}
                  </span>
                )}
              </div>
            )}

            {/* Top Traits */}
            <div className="flex flex-wrap gap-2 mb-4">
              {getTopTraits(currentCar).map((trait) => (
                <span
                  key={trait}
                  className="text-xs font-bold bg-accent/10 text-accent px-3 py-1 rounded-full"
                >
                  {trait}
                </span>
              ))}
              {currentCar.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-background text-muted px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Detail Button */}
            <button
              onClick={() => openDetail(currentCar.id)}
              className="w-full text-center text-sm text-primary font-bold py-2 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
            >
              جزئیات و تحلیل هوشمند
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 pb-8">
        <div className="flex gap-4 max-w-sm mx-auto">
          {/* Skip */}
          <button
            onClick={() => handleAction("skip")}
            className="flex-1 py-4 bg-surface border-2 border-border hover:border-danger text-foreground font-bold text-base rounded-2xl transition-all duration-200 active:scale-[0.95] flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            رد میشم
          </button>

          {/* Like */}
          <button
            onClick={() => handleAction("like")}
            className="flex-1 py-4 bg-primary hover:bg-primary-dark text-white font-bold text-base rounded-2xl transition-all duration-200 active:scale-[0.95] shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            می‌خوام!
          </button>
        </div>
      </div>

      {/* Bottom Sheet - Car Detail */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={carDetail ? carDetail.nameFa : currentCar.nameFa}
      >
        {detailLoading ? (
          <div className="py-8 text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">در حال بارگذاری...</p>
          </div>
        ) : carDetail ? (
          <div className="space-y-5 pb-4">
            {/* Overview */}
            {carDetail.intel && (
              <div className="bg-background rounded-xl p-4">
                <h4 className="text-sm font-bold mb-2">جمع‌بندی</h4>
                <p className="text-sm leading-7 text-muted">{carDetail.intel.overallSummary}</p>
              </div>
            )}

            {/* Why Buy / Why Not */}
            {carDetail.intel && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-accent/5 rounded-xl p-3">
                  <h5 className="text-xs font-bold text-accent mb-1">چرا بخری</h5>
                  <p className="text-xs leading-6 text-muted">{carDetail.intel.whyBuy}</p>
                </div>
                <div className="bg-danger/5 rounded-xl p-3">
                  <h5 className="text-xs font-bold text-danger mb-1">چرا نخری</h5>
                  <p className="text-xs leading-6 text-muted">{carDetail.intel.whyNotBuy}</p>
                </div>
              </div>
            )}

            {/* Scores */}
            {carDetail.scores && (
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
                          style={{ width: `${(((carDetail.scores as Record<string, number>)[key] || 5) / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-6 text-left">
                        {toPersianDigits((carDetail.scores as Record<string, number>)[key] || 5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pros & Cons from intel */}
            {carDetail.intel && (
              <div className="space-y-3">
                {carDetail.intel.frequentPros.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-accent mb-2">نقاط قوت</h4>
                    {carDetail.intel.frequentPros.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs mb-1.5">
                        <span className="text-accent shrink-0 mt-0.5">+</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                )}
                {carDetail.intel.frequentCons.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-danger mb-2">نقاط ضعف</h4>
                    {carDetail.intel.frequentCons.map((c, i) => (
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
            {carDetail.intel && carDetail.intel.commonIssues.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-4">
                <h4 className="text-sm font-bold text-yellow-700 dark:text-yellow-400 mb-2">خرابی‌های رایج</h4>
                {carDetail.intel.commonIssues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400 mb-1.5">
                    <span className="shrink-0 mt-0.5">!</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Purchase Warnings */}
            {carDetail.intel && carDetail.intel.purchaseWarnings.length > 0 && (
              <div className="bg-danger/5 rounded-xl p-4">
                <h4 className="text-sm font-bold text-danger mb-2">هشدارهای خرید</h4>
                {carDetail.intel.purchaseWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-danger mb-1.5">
                    <span className="shrink-0 mt-0.5">!</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Owner Verdict */}
            {carDetail.intel && (
              <div className="bg-background rounded-xl p-4">
                <h4 className="text-sm font-bold mb-2">نظر مالکان</h4>
                <p className="text-sm leading-7 text-muted">{carDetail.intel.ownerVerdict}</p>
              </div>
            )}

            {/* Specs */}
            {carDetail.specs && (
              <div>
                <h4 className="text-sm font-bold mb-2">مشخصات فنی</h4>
                <div className="flex flex-wrap gap-2">
                  {carDetail.specs.engine && (
                    <span className="text-xs bg-background px-3 py-1.5 rounded-lg">
                      موتور: {carDetail.specs.engine}
                    </span>
                  )}
                  {carDetail.specs.horsepower && (
                    <span className="text-xs bg-background px-3 py-1.5 rounded-lg">
                      {toPersianDigits(String(carDetail.specs.horsepower))} اسب بخار
                    </span>
                  )}
                  {carDetail.specs.fuelConsumption && (
                    <span className="text-xs bg-background px-3 py-1.5 rounded-lg">
                      مصرف: {toPersianDigits(String(carDetail.specs.fuelConsumption))} لیتر
                    </span>
                  )}
                  {carDetail.specs.transmission && (
                    <span className="text-xs bg-background px-3 py-1.5 rounded-lg">
                      {carDetail.specs.transmission === "automatic" ? "اتوماتیک" : carDetail.specs.transmission === "manual" ? "دنده‌ای" : carDetail.specs.transmission}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Similar Cars */}
            {carDetail.similarCars && carDetail.similarCars.length > 0 && (
              <div>
                <h4 className="text-sm font-bold mb-2">ماشین‌های مشابه</h4>
                <div className="space-y-2">
                  {carDetail.similarCars.map((sc) => (
                    <div key={sc.id} className="flex items-center justify-between bg-background rounded-xl px-4 py-3">
                      <div>
                        <span className="text-sm font-bold">{sc.nameFa}</span>
                        <span className="text-xs text-muted mr-2">{sc.brandFa}</span>
                      </div>
                      <span className="text-xs text-primary font-bold">
                        {toPersianDigits(formatPrice(sc.priceMin))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Reviews */}
            {carDetail.reviews && carDetail.reviews.length > 0 && (
              <div>
                <h4 className="text-sm font-bold mb-2">نظرات کاربران</h4>
                <div className="space-y-3">
                  {carDetail.reviews.slice(0, 3).map((r, i) => (
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

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
