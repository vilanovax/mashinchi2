"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
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
  isNew: boolean;
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

// Greedy diversity sampling: picks cards to maximize spread across origin & category,
// so each round gives richer taste signals than pure random.
function selectDiverseCards<T extends { origin: string; category: string }>(
  pool: T[],
  count: number
): T[] {
  if (pool.length <= count) return pool;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected: T[] = [];
  const originCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  while (selected.length < count && shuffled.length > 0) {
    let bestIdx = 0;
    let bestScore = Infinity;
    for (let i = 0; i < shuffled.length; i++) {
      const car = shuffled[i];
      const score = (originCounts[car.origin] || 0) * 2 + (categoryCounts[car.category] || 0);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    const picked = shuffled.splice(bestIdx, 1)[0];
    selected.push(picked);
    originCounts[picked.origin] = (originCounts[picked.origin] || 0) + 1;
    categoryCounts[picked.category] = (categoryCounts[picked.category] || 0) + 1;
  }

  return selected;
}

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

  // Touch swipe (already handled by cardRef handlers below)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Load favorites on mount
  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => { if (d.favorites) setFavoriteIds(new Set(d.favorites.map((f: { id: string }) => f.id))); })
      .catch(() => {});
  }, []);

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

  const fetchCars = useCallback(async () => {
    setLoading(true);
    const budgetNum = parseInt(budget);
    const minBudget = Math.floor(budgetNum * 0.7);
    const maxBudget = Math.floor(budgetNum * 1.3);

    const excludeParam = interactedIds.length > 0 ? `&exclude=${interactedIds.join(",")}` : "";
    const res = await fetch(
      `/api/cars?budgetMin=${minBudget}&budgetMax=${maxBudget}${excludeParam}`
    );
    const data: Car[] = await res.json();

    const diverse = selectDiverseCards(data, ROUND_SIZE);
    setCars(diverse);
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

  // Touch swipe state
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const isSwiping = useRef(false);

  const handleCardTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isSwiping.current = true;
  }, []);

  const handleCardTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping.current || !cardRef.current) return;
    touchCurrentX.current = e.touches[0].clientX;
    const deltaX = touchCurrentX.current - touchStartX.current;
    const rotation = deltaX * 0.08;
    cardRef.current.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
    cardRef.current.style.opacity = `${1 - Math.abs(deltaX) / 400}`;
  }, []);

  const handleCardTouchEnd = useCallback(() => {
    if (!isSwiping.current || !cardRef.current) return;
    isSwiping.current = false;
    const deltaX = touchCurrentX.current - touchStartX.current;

    if (deltaX > 80) {
      handleAction("like");
    } else if (deltaX < -80) {
      handleAction("skip");
    } else {
      cardRef.current.style.transform = "";
      cardRef.current.style.opacity = "";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCar]);

  const getOriginGradient = (origin: string) => {
    const gradients: Record<string, string> = {
      iranian: "from-blue-500/12 via-blue-400/6 to-emerald-400/8",
      chinese: "from-rose-500/10 via-orange-400/6 to-amber-400/8",
      korean: "from-sky-500/12 via-indigo-400/6 to-violet-400/8",
      japanese: "from-red-500/10 via-pink-400/6 to-rose-300/8",
      european: "from-amber-500/10 via-yellow-400/6 to-lime-400/8",
    };
    return gradients[origin] || "from-primary/10 via-primary/4 to-accent/6";
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

  return (
    <div className="flex-1 flex flex-col page-transition">
      {/* Header */}
      <div className="px-5 pt-4 pb-1">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push("/")}
            className="text-muted hover:text-foreground transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted">
              {toPersianDigits(totalInteractions)} از {toPersianDigits(MIN_INTERACTIONS)}
            </div>
            {totalInteractions >= MIN_INTERACTIONS && (
              <button
                onClick={() => router.push("/results")}
                className="text-xs font-bold text-white bg-primary px-3 py-1 rounded-full"
              >
                نتایج
              </button>
            )}
          </div>
        </div>

        {/* Progress bar - segmented */}
        <div className="flex gap-1">
          {Array.from({ length: MIN_INTERACTIONS }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                i < totalInteractions ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card + Buttons Container - no gap */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        {/* Swipeable Car Card */}
        <div
          ref={cardRef}
          onTouchStart={handleCardTouchStart}
          onTouchMove={handleCardTouchMove}
          onTouchEnd={handleCardTouchEnd}
          className={`w-full max-w-sm bg-surface rounded-3xl shadow-xl border border-border overflow-hidden transition-transform ${animClass}`}
          style={{ touchAction: "pan-y" }}
        >
          {/* Car Visual - origin-based gradient with large icon */}
          <div className={`h-32 bg-gradient-to-br ${getOriginGradient(currentCar.origin)} flex items-center justify-center relative`}>
            {/* Car silhouette based on category */}
            {currentCar.category === "suv" || currentCar.category === "crossover" ? (
              <svg width="120" height="60" viewBox="0 0 120 60" fill="none" className="opacity-20">
                <path d="M15 45 L25 25 L45 15 L85 15 L100 25 L110 35 L110 45 Z" stroke="currentColor" strokeWidth="2" className="text-foreground"/>
                <circle cx="30" cy="45" r="8" stroke="currentColor" strokeWidth="2" className="text-foreground"/>
                <circle cx="95" cy="45" r="8" stroke="currentColor" strokeWidth="2" className="text-foreground"/>
                <path d="M45 15 L48 25 L82 25 L85 15" stroke="currentColor" strokeWidth="1.5" className="text-foreground"/>
              </svg>
            ) : currentCar.category === "hatchback" ? (
              <svg width="110" height="55" viewBox="0 0 110 55" fill="none" className="opacity-20">
                <path d="M10 40 L20 25 L40 18 L70 18 L90 25 L95 35 L100 40 Z" stroke="currentColor" strokeWidth="2" className="text-foreground"/>
                <circle cx="25" cy="40" r="7" stroke="currentColor" strokeWidth="2" className="text-foreground"/>
                <circle cx="85" cy="40" r="7" stroke="currentColor" strokeWidth="2" className="text-foreground"/>
                <path d="M40 18 L43 25 L68 25 L70 18" stroke="currentColor" strokeWidth="1.5" className="text-foreground"/>
              </svg>
            ) : (
              <svg width="120" height="55" viewBox="0 0 120 55" fill="none" className="opacity-20">
                <path d="M10 40 L18 28 L35 18 L80 18 L98 28 L108 35 L110 40 Z" stroke="currentColor" strokeWidth="2" className="text-foreground"/>
                <circle cx="28" cy="40" r="7" stroke="currentColor" strokeWidth="2" className="text-foreground"/>
                <circle cx="92" cy="40" r="7" stroke="currentColor" strokeWidth="2" className="text-foreground"/>
                <path d="M35 18 L38 28 L78 28 L80 18" stroke="currentColor" strokeWidth="1.5" className="text-foreground"/>
              </svg>
            )}

            {/* Origin badge */}
            <span className="absolute top-2.5 right-2.5 text-[10px] font-bold bg-white/80 dark:bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {getOriginLabel(currentCar.origin)}
            </span>

            {/* Category + Condition badges */}
            <div className="absolute top-2.5 left-2.5 flex gap-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                currentCar.isNew
                  ? "bg-emerald-500/90 text-white"
                  : "bg-orange-500/90 text-white"
              }`}>{currentCar.isNew ? "صفر" : "کارکرده"}</span>
              <span className="text-[10px] bg-white/60 dark:bg-black/40 backdrop-blur-sm text-foreground px-2 py-0.5 rounded-full font-bold">
                {getCategoryLabel(currentCar.category)}
              </span>
            </div>

            {/* Swipe hint on first card */}
            {totalInteractions === 0 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-muted/60 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                بکش برای انتخاب
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse rotate-180">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>

          {/* Card Body */}
          <div className="p-4 pb-3">
            {/* Name + Price Row */}
            <div className="flex items-start justify-between mb-2.5">
              <div>
                <h3 className="text-lg font-black leading-tight">{currentCar.nameFa}</h3>
                <p className="text-[11px] text-muted mt-0.5">{currentCar.brandFa} | {currentCar.nameEn}</p>
              </div>
              <div className="text-left shrink-0 mr-3">
                <div className="text-sm font-bold text-primary leading-tight">
                  {toPersianDigits(formatPrice(currentCar.priceMin))}
                </div>
                <div className="text-[10px] text-muted">
                  تا {toPersianDigits(formatPrice(currentCar.priceMax))}
                </div>
              </div>
            </div>

            {/* Iconic Specs Row */}
            {currentCar.specs && (
              <div className="flex items-center gap-3 mb-2.5 text-[11px] text-muted">
                {currentCar.specs.engine && (
                  <div className="flex items-center gap-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/70">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                    </svg>
                    <span>{currentCar.specs.engine}</span>
                  </div>
                )}
                {currentCar.specs.horsepower && (
                  <div className="flex items-center gap-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/70">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    <span>{toPersianDigits(currentCar.specs.horsepower)} اسب</span>
                  </div>
                )}
                {currentCar.specs.transmission && (
                  <div className="flex items-center gap-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/70">
                      <circle cx="5" cy="6" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="19" cy="6" r="2" />
                      <path d="M5 8v8a2 2 0 002 2h3m2-10v10m7-10v8a2 2 0 01-2 2h-3" />
                    </svg>
                    <span>
                      {currentCar.specs.transmission === "automatic"
                        ? "اتوماتیک"
                        : currentCar.specs.transmission === "manual"
                        ? "دنده‌ای"
                        : currentCar.specs.transmission === "CVT"
                        ? "CVT"
                        : currentCar.specs.transmission}
                    </span>
                  </div>
                )}
                {currentCar.specs.fuelConsumption && (
                  <div className="flex items-center gap-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/70">
                      <path d="M3 22V5a2 2 0 012-2h6a2 2 0 012 2v17M3 22h10M14 15l2-2 2 2v5a1 1 0 001 1h0a1 1 0 001-1v-8l-3-4" />
                    </svg>
                    <span>{toPersianDigits(currentCar.specs.fuelConsumption)} لیتر</span>
                  </div>
                )}
              </div>
            )}

            {/* Top Traits - deduplicated */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {getTopTraits(currentCar).map((trait) => (
                <span
                  key={trait}
                  className="text-[11px] font-bold bg-accent/10 text-accent px-2.5 py-0.5 rounded-full"
                >
                  {trait}
                </span>
              ))}
              {currentCar.tags
                .filter((tag) => {
                  const traitLabels = getTopTraits(currentCar);
                  const categoryLabel = getCategoryLabel(currentCar.category);
                  return !traitLabels.includes(tag) && tag !== categoryLabel;
                })
                .slice(0, 2)
                .map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] bg-background text-muted px-2.5 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
            </div>

            {/* Detail Button */}
            <button
              onClick={() => openDetail(currentCar.id)}
              className="w-full text-center text-[11px] text-primary font-bold py-1.5 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
            >
              جزئیات و تحلیل هوشمند
            </button>
          </div>
        </div>

        {/* Action Buttons - attached to card */}
        <div className="w-full max-w-sm mt-3">
          <div className="flex gap-3">
            {/* Skip */}
            <button
              onClick={() => handleAction("skip")}
              className="flex-1 py-3 bg-surface border-2 border-border hover:border-danger text-foreground font-bold text-sm rounded-2xl transition-all duration-200 active:scale-[0.95] flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              رد میشم
            </button>

            {/* Like */}
            <button
              onClick={() => handleAction("like")}
              className="flex-[1.3] py-3 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-2xl transition-all duration-200 active:scale-[0.95] shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              می‌خوام!
            </button>
          </div>
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
          <div className="space-y-4 pb-4">

            {/* Favorite Button */}
            <div className="flex justify-end">
              <button
                onClick={() => toggleFavorite(carDetail.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                  favoriteIds.has(carDetail.id)
                    ? "bg-danger/10 text-danger"
                    : "bg-background text-muted hover:text-foreground"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={favoriteIds.has(carDetail.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
                </svg>
                {favoriteIds.has(carDetail.id) ? "نشان شده" : "نشان کردن"}
              </button>
            </div>

            {/* Hero: Quick Stats Row */}
            {carDetail.intel && (
              <div className="flex gap-2">
                <div className="flex-1 bg-accent/8 rounded-xl p-3 text-center">
                  <div className="text-lg font-black text-accent">{toPersianDigits(carDetail.intel.ownerSatisfaction)}<span className="text-xs font-normal text-muted">/۱۰</span></div>
                  <div className="text-[10px] text-muted mt-0.5">رضایت مالکان</div>
                </div>
                <div className="flex-1 bg-primary/8 rounded-xl p-3 text-center">
                  <div className="text-lg font-black text-primary">{toPersianDigits(10 - carDetail.intel.purchaseRisk)}<span className="text-xs font-normal text-muted">/۱۰</span></div>
                  <div className="text-[10px] text-muted mt-0.5">امنیت خرید</div>
                </div>
                {carDetail.reviews.length > 0 && (
                  <div className="flex-1 bg-amber-500/8 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {toPersianDigits((carDetail.reviews.reduce((s, r) => s + (r.rating || 3), 0) / carDetail.reviews.length).toFixed(1))}
                      <span className="text-xs font-normal text-muted">/۵</span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">امتیاز کاربران</div>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {carDetail.intel && (
              <p className="text-sm leading-7 text-muted">{carDetail.intel.overallSummary}</p>
            )}

            {/* Why Buy / Why Not - improved layout */}
            {carDetail.intel && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-accent/6 border border-accent/15 rounded-xl p-3">
                  <h5 className="text-xs font-black text-accent mb-1.5">چرا بخری</h5>
                  <p className="text-xs leading-6">{carDetail.intel.whyBuy}</p>
                </div>
                <div className="bg-danger/6 border border-danger/15 rounded-xl p-3">
                  <h5 className="text-xs font-black text-danger mb-1.5">چرا نخری</h5>
                  <p className="text-xs leading-6">{carDetail.intel.whyNotBuy}</p>
                </div>
              </div>
            )}

            {/* Pros & Cons Side by Side */}
            {carDetail.intel && (carDetail.intel.frequentPros.length > 0 || carDetail.intel.frequentCons.length > 0) && (
              <div className="bg-background rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  {carDetail.intel.frequentPros.length > 0 && (
                    <div>
                      <h5 className="text-xs font-black text-accent mb-2">نقاط قوت</h5>
                      <div className="space-y-1.5">
                        {carDetail.intel.frequentPros.slice(0, 4).map((p, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px]">
                            <span className="text-accent shrink-0 mt-px font-bold">+</span>
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {carDetail.intel.frequentCons.length > 0 && (
                    <div>
                      <h5 className="text-xs font-black text-danger mb-2">نقاط ضعف</h5>
                      <div className="space-y-1.5">
                        {carDetail.intel.frequentCons.slice(0, 4).map((c, i) => (
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
            {carDetail.scores && (
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
                    const score = (carDetail.scores as Record<string, number>)[key] || 5;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[11px] text-muted w-20 shrink-0">{label}</span>
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              key === "maintenanceRisk"
                                ? score >= 7 ? "bg-danger" : score >= 4 ? "bg-orange-500" : "bg-accent"
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

            {/* Warnings Section - merged issues + warnings */}
            {carDetail.intel && (carDetail.intel.commonIssues.length > 0 || carDetail.intel.purchaseWarnings.length > 0) && (
              <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
                <h4 className="text-xs font-black text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 004.99 19z" /></svg>
                  هشدارها و خرابی‌ها
                </h4>
                <div className="space-y-1.5">
                  {carDetail.intel.purchaseWarnings.map((w, i) => (
                    <div key={`w-${i}`} className="flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-400">
                      <span className="shrink-0 mt-0.5 font-black">!</span>
                      <span className="leading-5">{w}</span>
                    </div>
                  ))}
                  {carDetail.intel.commonIssues.map((issue, i) => (
                    <div key={`i-${i}`} className="flex items-start gap-1.5 text-[11px] text-orange-600 dark:text-orange-400">
                      <span className="shrink-0 mt-0.5 font-black">!</span>
                      <span className="leading-5">{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Owner Verdict + Specs - combined */}
            <div className="bg-background rounded-xl p-4 space-y-3">
              {carDetail.intel && (
                <div>
                  <h4 className="text-xs font-black mb-1.5">نظر مالکان</h4>
                  <p className="text-[11px] leading-6 text-muted">{carDetail.intel.ownerVerdict}</p>
                </div>
              )}
              {carDetail.specs && (
                <div className={carDetail.intel ? "pt-3 border-t border-border" : ""}>
                  <h4 className="text-xs font-black mb-2">مشخصات فنی</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {carDetail.specs.engine && (
                      <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">{carDetail.specs.engine}</span>
                    )}
                    {carDetail.specs.horsepower && (
                      <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">{toPersianDigits(String(carDetail.specs.horsepower))} اسب</span>
                    )}
                    {carDetail.specs.fuelConsumption && (
                      <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">مصرف {toPersianDigits(String(carDetail.specs.fuelConsumption))} لیتر</span>
                    )}
                    {carDetail.specs.transmission && (
                      <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">
                        {carDetail.specs.transmission === "automatic" ? "اتوماتیک" : carDetail.specs.transmission === "manual" ? "دنده‌ای" : carDetail.specs.transmission}
                      </span>
                    )}
                    {carDetail.specs.fuelType && (
                      <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">
                        {carDetail.specs.fuelType === "gasoline" ? "بنزینی" : carDetail.specs.fuelType === "diesel" ? "دیزلی" : carDetail.specs.fuelType === "hybrid" ? "هیبریدی" : carDetail.specs.fuelType}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Similar Cars - horizontal scroll */}
            {carDetail.similarCars && carDetail.similarCars.length > 0 && (
              <div>
                <h4 className="text-xs font-black mb-2">ماشین‌های مشابه</h4>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {carDetail.similarCars.map((sc) => (
                    <div key={sc.id} className="shrink-0 bg-background rounded-xl px-3 py-2.5 min-w-[140px]">
                      <div className="text-xs font-bold">{sc.nameFa}</div>
                      <div className="text-[10px] text-muted">{sc.brandFa}</div>
                      <div className="text-[11px] text-primary font-bold mt-1">{toPersianDigits(formatPrice(sc.priceMin))}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Reviews - compact */}
            {carDetail.reviews && carDetail.reviews.length > 0 && (
              <div>
                <h4 className="text-xs font-black mb-2">نظرات کاربران</h4>
                <div className="space-y-2">
                  {carDetail.reviews.slice(0, 2).map((r, i) => (
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
