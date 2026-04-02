"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatPrice, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";

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
  tags: { id: string; tag: string }[];
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
  const [showDetail, setShowDetail] = useState(false);
  const [round, setRound] = useState(1);

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

    // Shuffle and take ROUND_SIZE
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
      } else if (newTotal >= MIN_INTERACTIONS) {
        // Enough interactions, show results
        router.push("/results");
      } else {
        // Load more cars
        setRound((prev) => prev + 1);
        setAnimClass("card-enter");
      }
    }, 280);
  };

  const getTopTraits = (car: Car): string[] => {
    if (!car.scores) return [];
    const traits: { key: string; label: string; value: number }[] = [
      { key: "comfort", label: "راحت", value: car.scores.comfort },
      { key: "performance", label: "قدرتمند", value: car.scores.performance },
      { key: "economy", label: "اقتصادی", value: car.scores.economy },
      { key: "safety", label: "امن", value: car.scores.safety },
      { key: "prestige", label: "باکلاس", value: car.scores.prestige },
      { key: "reliability", label: "مطمئن", value: car.scores.reliability },
      { key: "resaleValue", label: "نقدشونده", value: car.scores.resaleValue },
      { key: "familyFriendly", label: "خانوادگی", value: car.scores.familyFriendly },
      { key: "sportiness", label: "اسپرت", value: car.scores.sportiness },
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
              {currentCar.tags.slice(0, 2).map((t) => (
                <span
                  key={t.id}
                  className="text-xs bg-background text-muted px-3 py-1 rounded-full"
                >
                  {t.tag}
                </span>
              ))}
            </div>

            {/* Description (toggle) */}
            {showDetail && currentCar.description && (
              <p className="text-sm text-muted mb-4 leading-7">
                {currentCar.description}
              </p>
            )}

            <button
              onClick={() => setShowDetail(!showDetail)}
              className="text-xs text-primary mb-2"
            >
              {showDetail ? "بستن" : "جزئیات بیشتر"}
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
