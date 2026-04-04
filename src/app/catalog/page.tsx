"use client";

import { useState, useEffect, useMemo } from "react";
import { formatPrice, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";
import BottomSheet from "@/components/BottomSheet";
import { useCompare } from "@/lib/useCompare";

interface Car {
  id: string;
  nameFa: string;
  nameEn: string;
  brandFa: string;
  category: string;
  origin: string;
  priceMin: string;
  priceMax: string;
  description: string | null;
  tags: string[];
  scores: Record<string, number> | null;
  specs: {
    engine: string | null;
    horsepower: number | null;
    transmission: string | null;
    fuelType: string | null;
    fuelConsumption: number | null;
  } | null;
  intel: { ownerSatisfaction: number; purchaseRisk: number } | null;
}

const ORIGIN_COLORS: Record<string, string> = {
  iranian: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  chinese: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  korean: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  japanese: "bg-red-500/10 text-red-600 dark:text-red-400",
  european: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

interface CarDetail {
  id: string;
  nameFa: string;
  nameEn: string;
  brandFa: string;
  category: string;
  origin: string;
  priceMin: string;
  priceMax: string;
  description: string | null;
  tags: string[];
  scores: Record<string, number> | null;
  specs: {
    engine: string | null;
    horsepower: number | null;
    transmission: string | null;
    fuelType: string | null;
    fuelConsumption: number | null;
  } | null;
  reviews: { source: string; summary: string; pros: string[]; cons: string[]; warnings: string[]; rating: number | null }[];
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
  alternatives: { id: string; nameFa: string; brandFa: string; priceMin: string; priceMax: string }[];
}

const ORIGINS = [
  { key: "all", label: "همه" },
  { key: "iranian", label: "ایرانی" },
  { key: "chinese", label: "چینی" },
  { key: "korean", label: "کره‌ای" },
  { key: "japanese", label: "ژاپنی" },
  { key: "european", label: "اروپایی" },
];

const CATEGORIES = [
  { key: "all", label: "همه" },
  { key: "sedan", label: "سدان" },
  { key: "suv", label: "شاسی‌بلند" },
  { key: "hatchback", label: "هاچبک" },
  { key: "crossover", label: "کراس‌اوور" },
  { key: "pickup", label: "وانت" },
];

const SORT_OPTIONS = [
  { key: "price-asc", label: "ارزان‌ترین" },
  { key: "price-desc", label: "گران‌ترین" },
  { key: "name", label: "نام" },
];

export default function CatalogPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price-asc");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<CarDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const { compareIds, toggleCompare, isInCompare, canCompare, goToCompare, count: compareCount, clearCompare } = useCompare();

  useEffect(() => {
    fetch("/api/cars")
      .then((res) => res.json())
      .then((data) => {
        setCars(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Load favorites
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        if (data.favorites) {
          setFavoriteIds(new Set(data.favorites.map((f: { id: string }) => f.id)));
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let result = [...cars];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.nameFa.includes(q) ||
          c.nameEn.toLowerCase().includes(q) ||
          c.brandFa.includes(q)
      );
    }

    // Origin
    if (originFilter !== "all") {
      result = result.filter((c) => c.origin === originFilter);
    }

    // Category
    if (categoryFilter !== "all") {
      result = result.filter((c) => c.category === categoryFilter);
    }

    // Sort
    if (sortBy === "price-asc") {
      result.sort((a, b) => parseInt(a.priceMin) - parseInt(b.priceMin));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => parseInt(b.priceMin) - parseInt(a.priceMin));
    } else {
      result.sort((a, b) => a.nameFa.localeCompare(b.nameFa, "fa"));
    }

    return result;
  }, [cars, search, originFilter, categoryFilter, sortBy]);

  const openCarDetail = async (carId: string) => {
    setSheetOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/cars/${carId}`);
      if (res.ok) setSelectedCar(await res.json());
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const toggleFavorite = async (carId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId }),
    });
    const data = await res.json();
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (data.favorited) next.add(carId);
      else next.delete(carId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  // Get top traits for a car
  const getTopTraits = (car: Car): string[] => {
    if (!car.scores) return [];
    const traits: { label: string; value: number }[] = [
      { label: "راحت", value: car.scores.comfort || 0 },
      { label: "قدرتمند", value: car.scores.performance || 0 },
      { label: "اقتصادی", value: car.scores.economy || 0 },
      { label: "امن", value: car.scores.safety || 0 },
      { label: "باکلاس", value: car.scores.prestige || 0 },
      { label: "خانوادگی", value: car.scores.familyFriendly || 0 },
    ];
    return traits.sort((a, b) => b.value - a.value).slice(0, 2).map((t) => t.label);
  };

  return (
    <div className="flex-1 flex flex-col page-transition">
      {/* Header */}
      <div className="px-5 pt-4 pb-1">
        <div className="flex items-center justify-between mb-2.5">
          <h1 className="text-lg font-black">کاتالوگ خودرو</h1>
          <span className="text-[11px] text-muted">{toPersianDigits(filtered.length)} خودرو</span>
        </div>

        {/* Search */}
        <div className="relative mb-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="جستجو نام یا برند..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pr-10 pl-4 py-2 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Single-line filters: Origin + Category + Sort */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
          {ORIGINS.map((o) => (
            <button
              key={o.key}
              onClick={() => setOriginFilter(o.key)}
              className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors ${
                originFilter === o.key
                  ? "bg-primary text-white"
                  : "bg-background text-muted"
              }`}
            >
              {o.label}
            </button>
          ))}
          <div className="w-px bg-border shrink-0 mx-0.5" />
          {CATEGORIES.filter(c => c.key !== "all").map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(prev => prev === c.key ? "all" : c.key)}
              className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors ${
                categoryFilter === c.key
                  ? "bg-accent text-white"
                  : "bg-background text-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
          <div className="w-px bg-border shrink-0 mx-0.5" />
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors ${
                sortBy === s.key
                  ? "bg-foreground text-background"
                  : "bg-background text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Car List */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2">
        <div className="space-y-2">
          {filtered.map((car) => {
            const satisfaction = car.intel?.ownerSatisfaction;
            const originColor = ORIGIN_COLORS[car.origin] || "bg-muted/10 text-muted";

            return (
              <div
                key={car.id}
                onClick={() => compareMode ? toggleCompare(car.id) : openCarDetail(car.id)}
                className={`bg-surface rounded-2xl border overflow-hidden active:scale-[0.99] transition-all cursor-pointer ${
                  compareMode && isInCompare(car.id)
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border"
                }`}
              >
                <div className="flex items-stretch relative">
                  {/* Compare checkbox overlay */}
                  {compareMode && (
                    <div className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isInCompare(car.id) ? "bg-primary border-primary" : "bg-white/80 dark:bg-black/50 border-border"
                    }`}>
                      {isInCompare(car.id) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Left: Satisfaction Score */}
                  <div className={`w-14 shrink-0 flex flex-col items-center justify-center ${
                    satisfaction && satisfaction >= 7 ? "bg-accent/8" :
                    satisfaction && satisfaction >= 5 ? "bg-primary/8" : "bg-background"
                  }`}>
                    {satisfaction ? (
                      <>
                        <span className={`text-base font-black ${
                          satisfaction >= 7 ? "text-accent" :
                          satisfaction >= 5 ? "text-primary" : "text-muted"
                        }`}>{toPersianDigits(satisfaction)}</span>
                        <span className="text-[8px] text-muted">رضایت</span>
                      </>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/30">
                        <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                        <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                        <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" />
                        <path d="M9 17h6" />
                      </svg>
                    )}
                  </div>

                  {/* Right: Info */}
                  <div className="flex-1 p-3 min-w-0">
                    {/* Row 1: Name + Favorite */}
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-sm font-black truncate">{car.nameFa}</h3>
                      <button
                        onClick={(e) => toggleFavorite(car.id, e)}
                        className="shrink-0 mr-1 p-1 -m-1"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24"
                          fill={favoriteIds.has(car.id) ? "currentColor" : "none"}
                          stroke="currentColor" strokeWidth="2"
                          className={favoriteIds.has(car.id) ? "text-danger" : "text-muted/40"}
                        >
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
                        </svg>
                      </button>
                    </div>

                    {/* Row 2: Brand + Origin badge */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[11px] text-muted">{car.brandFa}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${originColor}`}>
                        {getOriginLabel(car.origin)}
                      </span>
                      <span className="text-[9px] bg-background text-muted px-1.5 py-0.5 rounded-full">
                        {getCategoryLabel(car.category)}
                      </span>
                    </div>

                    {/* Row 3: Price + Specs */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-primary">
                        {toPersianDigits(formatPrice(car.priceMin))}
                        <span className="text-[9px] text-muted font-normal mx-0.5">~</span>
                        {toPersianDigits(formatPrice(car.priceMax))}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted">
                        {car.specs?.horsepower && (
                          <span>{toPersianDigits(car.specs.horsepower)} hp</span>
                        )}
                        {car.specs?.transmission && (
                          <span>{car.specs.transmission === "automatic" ? "AT" : car.specs.transmission === "manual" ? "MT" : car.specs.transmission}</span>
                        )}
                      </div>
                    </div>

                    {/* Row 4: Traits */}
                    {getTopTraits(car).length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {getTopTraits(car).map((trait) => (
                          <span key={trait} className="text-[9px] font-bold bg-accent/8 text-accent px-2 py-0.5 rounded-full">
                            {trait}
                          </span>
                        ))}
                        {car.tags
                          .filter(t => !getTopTraits(car).includes(t) && t !== getCategoryLabel(car.category))
                          .slice(0, 1)
                          .map((tag) => (
                            <span key={tag} className="text-[9px] bg-background text-muted px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted text-sm">خودرویی پیدا نشد</p>
          </div>
        )}
      </div>

      {/* Floating Compare Button */}
      <div className="sticky bottom-14 px-5 pb-2 pt-1 z-20">
        <div className="max-w-md mx-auto">
          {compareMode ? (
            <div className="flex gap-2">
              <button
                onClick={() => { setCompareMode(false); clearCompare(); }}
                className="py-2.5 px-4 bg-surface border border-border text-foreground text-xs font-bold rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={goToCompare}
                disabled={!canCompare}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  canCompare
                    ? "bg-primary text-white shadow-lg shadow-primary/25 active:scale-[0.97]"
                    : "bg-primary/20 text-primary/50"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" />
                </svg>
                {canCompare ? "مقایسه کن" : `${toPersianDigits(compareCount)} از ۲ انتخاب شده`}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCompareMode(true)}
              className="w-full py-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-muted flex items-center justify-center gap-2 hover:text-foreground transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" />
              </svg>
              مقایسه دو خودرو
            </button>
          )}
        </div>
      </div>

      {/* Bottom Sheet - Car Detail */}
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
            {/* Favorite + Price Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">{selectedCar.brandFa} | {getOriginLabel(selectedCar.origin)} | {getCategoryLabel(selectedCar.category)}</p>
                <div className="mt-1">
                  <span className="text-sm font-bold text-primary">{toPersianDigits(formatPrice(selectedCar.priceMin))}</span>
                  <span className="text-xs text-muted"> تا </span>
                  <span className="text-sm font-bold text-primary">{toPersianDigits(formatPrice(selectedCar.priceMax))}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Compare button */}
                <button
                  onClick={() => { toggleCompare(selectedCar.id); }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    isInCompare(selectedCar.id) ? "bg-primary/15" : "bg-background"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={isInCompare(selectedCar.id) ? "text-primary" : "text-muted"}
                  >
                    <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" />
                  </svg>
                </button>
                {/* Favorite button */}
                <button
                  onClick={() => toggleFavorite(selectedCar.id)}
                  className="w-9 h-9 rounded-full bg-background flex items-center justify-center"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={favoriteIds.has(selectedCar.id) ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                  className={favoriteIds.has(selectedCar.id) ? "text-danger" : "text-muted"}
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
                </svg>
                </button>
              </div>
            </div>

            {/* Quick Stats */}
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

            {/* Pros & Cons */}
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

            {/* Scores */}
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
                    const score = selectedCar.scores![key] || 5;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[11px] text-muted w-20 shrink-0">{label}</span>
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
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

            {/* Warnings */}
            {selectedCar.intel && (selectedCar.intel.commonIssues.length > 0 || selectedCar.intel.purchaseWarnings.length > 0) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-4">
                <h4 className="text-xs font-black text-yellow-700 dark:text-yellow-400 mb-2">هشدارها</h4>
                <div className="space-y-1.5">
                  {selectedCar.intel.purchaseWarnings.map((w, i) => (
                    <div key={`w-${i}`} className="flex items-start gap-1.5 text-[11px] text-danger">
                      <span className="shrink-0 mt-px font-bold">!</span><span>{w}</span>
                    </div>
                  ))}
                  {selectedCar.intel.commonIssues.map((issue, i) => (
                    <div key={`i-${i}`} className="flex items-start gap-1.5 text-[11px] text-yellow-700 dark:text-yellow-400">
                      <span className="shrink-0 mt-px font-bold">!</span><span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specs */}
            {selectedCar.specs && (
              <div className="bg-background rounded-xl p-4">
                <h4 className="text-xs font-black mb-2">مشخصات فنی</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCar.specs.engine && <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">{selectedCar.specs.engine}</span>}
                  {selectedCar.specs.horsepower && <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">{toPersianDigits(String(selectedCar.specs.horsepower))} اسب</span>}
                  {selectedCar.specs.fuelConsumption && <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">مصرف {toPersianDigits(String(selectedCar.specs.fuelConsumption))} لیتر</span>}
                  {selectedCar.specs.transmission && <span className="text-[11px] bg-surface px-2.5 py-1 rounded-lg">{selectedCar.specs.transmission === "automatic" ? "اتوماتیک" : selectedCar.specs.transmission === "manual" ? "دنده‌ای" : selectedCar.specs.transmission}</span>}
                </div>
              </div>
            )}

            {/* Similar Cars */}
            {selectedCar.similarCars && selectedCar.similarCars.length > 0 && (
              <div>
                <h4 className="text-xs font-black mb-2">ماشین‌های مشابه</h4>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {selectedCar.similarCars.map((sc) => (
                    <button key={sc.id} onClick={() => openCarDetail(sc.id)} className="shrink-0 bg-background rounded-xl px-3 py-2.5 min-w-[130px] text-right">
                      <div className="text-xs font-bold">{sc.nameFa}</div>
                      <div className="text-[10px] text-muted">{sc.brandFa}</div>
                      <div className="text-[11px] text-primary font-bold mt-1">{toPersianDigits(formatPrice(sc.priceMin))}</div>
                    </button>
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
