"use client";

import { useState, useEffect, useMemo } from "react";
import { formatPrice, formatPriceRange, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";
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
  isNew: boolean;
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
  priceHistory: { date: string; price: string; source: string }[];
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
  const [conditionFilter, setConditionFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price-asc");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<CarDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const { compareIds, toggleCompare, isInCompare, canCompare, goToCompare, count: compareCount, clearCompare } = useCompare();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mashinchi-view-mode");
      if (stored === "grid" || stored === "list") setViewMode(stored);
    } catch {}
  }, []);

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

    // Condition (new/used)
    if (conditionFilter === "new") {
      result = result.filter((c) => c.isNew);
    } else if (conditionFilter === "used") {
      result = result.filter((c) => !c.isNew);
    }

    // Sort
    if (sortBy === "price-asc") {
      result.sort((a, b) => (parseInt(a.priceMin) || Number.MAX_SAFE_INTEGER) - (parseInt(b.priceMin) || Number.MAX_SAFE_INTEGER));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => (parseInt(b.priceMax) || 0) - (parseInt(a.priceMax) || 0));
    } else {
      result.sort((a, b) => a.nameFa.localeCompare(b.nameFa, "fa"));
    }

    return result;
  }, [cars, search, originFilter, categoryFilter, conditionFilter, sortBy]);

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

  const activeFilterCount = (originFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0) + (conditionFilter !== "all" ? 1 : 0);

  const setView = (mode: "list" | "grid") => {
    setViewMode(mode);
    try { localStorage.setItem("mashinchi-view-mode", mode); } catch {}
  };

  return (
    <div className="flex-1 flex flex-col page-transition">
      {/* Header */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-black">کاتالوگ خودرو</h1>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted">{toPersianDigits(filtered.length)} خودرو</span>
            <div className="flex bg-background rounded-lg p-0.5">
              <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-surface shadow-sm text-foreground" : "text-muted"}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
              </button>
              <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-surface shadow-sm text-foreground" : "text-muted"}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="جستجو نام یا برند..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pr-9 pl-8 py-1.5 text-sm outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Filter Row 1: Origins */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
          {ORIGINS.map((o) => (
            <button
              key={o.key}
              onClick={() => setOriginFilter(o.key)}
              className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors ${
                originFilter === o.key ? "bg-primary text-white" : "bg-background text-muted"
              }`}
            >
              {o.label}
            </button>
          ))}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setOriginFilter("all"); setCategoryFilter("all"); setConditionFilter("all"); }}
              className="shrink-0 text-[9px] text-danger font-bold px-2 py-1"
            >
              پاک کردن
            </button>
          )}
        </div>

        {/* Filter Row 2: Category + Condition + Sort */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {CATEGORIES.filter(c => c.key !== "all").map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(prev => prev === c.key ? "all" : c.key)}
              className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors ${
                categoryFilter === c.key ? "bg-accent text-white" : "bg-background text-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
          <div className="w-px bg-border shrink-0 mx-0.5 my-1" />
          {[
            { key: "new", label: "صفر" },
            { key: "used", label: "کارکرده" },
          ].map((cond) => (
            <button
              key={cond.key}
              onClick={() => setConditionFilter(prev => prev === cond.key ? "all" : cond.key)}
              className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors ${
                conditionFilter === cond.key ? "bg-emerald-600 text-white" : "bg-background text-muted"
              }`}
            >
              {cond.label}
            </button>
          ))}
          <div className="w-px bg-border shrink-0 mx-0.5 my-1" />
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors ${
                sortBy === s.key ? "bg-foreground text-background" : "bg-background text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Car List / Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1.5">
        <div className={viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-1.5"}>
          {filtered.map((car) => {
            const satisfaction = car.intel?.ownerSatisfaction;
            const originColor = ORIGIN_COLORS[car.origin] || "bg-muted/10 text-muted";
            const hasValidPrice = parseInt(car.priceMin) > 0 || parseInt(car.priceMax) > 0;

            return viewMode === "grid" ? (
              /* ── Grid Card ── */
              <div
                key={car.id}
                onClick={() => compareMode ? toggleCompare(car.id) : openCarDetail(car.id)}
                className={`relative bg-surface rounded-xl border overflow-hidden active:scale-[0.98] transition-all cursor-pointer ${
                  compareMode && isInCompare(car.id) ? "border-primary ring-2 ring-primary/20" : "border-border"
                }`}
              >
                {compareMode && (
                  <div className={`absolute top-2 left-2 z-10 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isInCompare(car.id) ? "bg-primary border-primary" : "bg-white/80 dark:bg-black/50 border-border"
                  }`}>
                    {isInCompare(car.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                  </div>
                )}

                {/* Top: origin + fav */}
                <div className="flex items-center justify-between px-2.5 pt-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${originColor}`}>
                    {getOriginLabel(car.origin)}
                  </span>
                  <button onClick={(e) => toggleFavorite(car.id, e)} className="p-0.5">
                    <svg width="13" height="13" viewBox="0 0 24 24"
                      fill={favoriteIds.has(car.id) ? "currentColor" : "none"}
                      stroke="currentColor" strokeWidth="2"
                      className={favoriteIds.has(car.id) ? "text-danger" : "text-muted/30"}
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
                    </svg>
                  </button>
                </div>

                {/* Satisfaction */}
                <div className="flex justify-center py-1.5">
                  {satisfaction ? (
                    <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center ${
                      satisfaction >= 7 ? "bg-accent/10" : satisfaction >= 5 ? "bg-primary/10" : "bg-background"
                    }`}>
                      <span className={`text-sm font-black leading-none ${
                        satisfaction >= 7 ? "text-accent" : satisfaction >= 5 ? "text-primary" : "text-muted"
                      }`}>{toPersianDigits(satisfaction)}</span>
                      <span className="text-[7px] text-muted">رضایت</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/20">
                        <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                        <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" /><path d="M9 17h6" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-2.5 pb-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${car.isNew ? "bg-emerald-500" : "bg-orange-400"}`} />
                    <h3 className="text-[11px] font-black truncate">{car.nameFa}</h3>
                  </div>
                  <p className="text-[9px] text-muted">{car.brandFa}</p>
                  <p className={`text-[10px] font-bold mt-0.5 ${hasValidPrice ? "text-primary" : "text-muted"}`}>
                    {formatPriceRange(car.priceMin, car.priceMax)}
                  </p>
                  {getTopTraits(car).length > 0 && (
                    <div className="flex justify-center gap-1 mt-1">
                      {getTopTraits(car).slice(0, 2).map((trait) => (
                        <span key={trait} className="text-[8px] font-bold bg-accent/8 text-accent px-1.5 py-0.5 rounded-full">{trait}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── List Card ── */
              <div
                key={car.id}
                onClick={() => compareMode ? toggleCompare(car.id) : openCarDetail(car.id)}
                className={`bg-surface rounded-xl border overflow-hidden active:scale-[0.99] transition-all cursor-pointer shadow-sm ${
                  compareMode && isInCompare(car.id) ? "border-primary ring-2 ring-primary/20" : "border-border"
                }`}
              >
                <div className="flex items-stretch relative">
                  {compareMode && (
                    <div className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isInCompare(car.id) ? "bg-primary border-primary" : "bg-white/80 dark:bg-black/50 border-border"
                    }`}>
                      {isInCompare(car.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                    </div>
                  )}

                  {/* Satisfaction sidebar */}
                  <div className={`w-12 shrink-0 flex flex-col items-center justify-center border-e-2 ${
                    satisfaction && satisfaction >= 7 ? "bg-accent/5 border-e-accent" :
                    satisfaction && satisfaction >= 5 ? "bg-primary/5 border-e-primary" : "bg-background border-e-transparent"
                  }`}>
                    {satisfaction ? (
                      <>
                        <span className={`text-base font-black ${
                          satisfaction >= 7 ? "text-accent" : satisfaction >= 5 ? "text-primary" : "text-muted"
                        }`}>{toPersianDigits(satisfaction)}</span>
                        <span className="text-[7px] text-muted">رضایت</span>
                      </>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/20">
                        <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                        <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" /><path d="M9 17h6" />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-2.5 min-w-0">
                    {/* Name + Fav */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${car.isNew ? "bg-emerald-500" : "bg-orange-400"}`} />
                        <h3 className="text-[13px] font-black truncate">{car.nameFa}</h3>
                      </div>
                      <button onClick={(e) => toggleFavorite(car.id, e)} className="shrink-0 mr-1 p-1 -m-1">
                        <svg width="15" height="15" viewBox="0 0 24 24"
                          fill={favoriteIds.has(car.id) ? "currentColor" : "none"}
                          stroke="currentColor" strokeWidth="2"
                          className={favoriteIds.has(car.id) ? "text-danger" : "text-muted/30"}
                        >
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
                        </svg>
                      </button>
                    </div>

                    {/* Brand + badges */}
                    <div className="flex items-center gap-1 mt-0.5 mb-1">
                      <span className="text-[10px] text-muted">{car.brandFa}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${originColor}`}>
                        {getOriginLabel(car.origin)}
                      </span>
                      <span className="text-[8px] bg-background text-muted px-1.5 py-0.5 rounded-full">
                        {getCategoryLabel(car.category)}
                      </span>
                    </div>

                    {/* Price + Specs */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold ${hasValidPrice ? "text-primary" : "text-muted"}`}>
                        {formatPriceRange(car.priceMin, car.priceMax)}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9px] text-muted">
                        {car.specs?.horsepower && (
                          <span className="flex items-center gap-0.5">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/50"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                            {toPersianDigits(car.specs.horsepower)}
                          </span>
                        )}
                        {car.specs?.fuelConsumption && (
                          <span>{toPersianDigits(car.specs.fuelConsumption)}L</span>
                        )}
                        {car.specs?.transmission && (
                          <span>{car.specs.transmission === "automatic" ? "AT" : car.specs.transmission === "manual" ? "MT" : ""}</span>
                        )}
                      </div>
                    </div>

                    {/* Traits */}
                    {getTopTraits(car).length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {getTopTraits(car).map((trait) => (
                          <span key={trait} className="text-[8px] font-bold bg-accent/8 text-accent px-1.5 py-0.5 rounded-full">{trait}</span>
                        ))}
                        {car.tags
                          .filter(t => !getTopTraits(car).includes(t) && t !== getCategoryLabel(car.category))
                          .slice(0, 1)
                          .map((tag) => (
                            <span key={tag} className="text-[8px] bg-background text-muted px-1.5 py-0.5 rounded-full">{tag}</span>
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
          <div className="text-center py-16">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-muted/20 mb-3">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M8 11h6" />
            </svg>
            <p className="text-sm font-bold text-muted mb-1">خودرویی پیدا نشد</p>
            <p className="text-[11px] text-muted/60">فیلترها را تغییر دهید</p>
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
                  title="افزودن به مقایسه"
                  className={`h-8 px-2.5 rounded-full flex items-center justify-center gap-1 transition-colors text-[10px] font-bold ${
                    isInCompare(selectedCar.id) ? "bg-primary/15 text-primary" : "bg-background text-muted"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" />
                  </svg>
                  {isInCompare(selectedCar.id) ? "در مقایسه" : "مقایسه"}
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

            {/* Price Chart */}
            <PriceChartMini history={selectedCar.priceHistory} />

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

// ── Mini Price Chart for BottomSheet ──
function PriceChartMini({ history }: { history: { date: string; price: string; source: string }[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-background rounded-xl p-4">
        <h4 className="text-xs font-black mb-2">روند قیمت</h4>
        <div className="text-center py-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-muted/30 mb-1.5">
            <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
          </svg>
          <p className="text-[10px] text-muted">داده قیمتی هنوز ثبت نشده</p>
        </div>
      </div>
    );
  }

  const prices = history.map((p) => Number(p.price));
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const W = 300;
  const H = 120;
  const PAD = 25;

  const points = history.map((p, i) => {
    const x = PAD + ((W - PAD - 10) * i) / Math.max(history.length - 1, 1);
    const y = PAD + (H - PAD * 2) * (1 - (Number(p.price) - minP) / range);
    return { x, y, ...p };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const change = ((lastPrice - firstPrice) / firstPrice) * 100;
  const isUp = change > 0;

  return (
    <div className="bg-background rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-black">روند قیمت</h4>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isUp ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"
        }`}>
          {isUp ? "+" : ""}{toPersianDigits(change.toFixed(1))}٪
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H + 15}`} className="w-full">
        {[0, 0.5, 1].map((frac) => {
          const y = PAD + (H - PAD * 2) * (1 - frac);
          const val = minP + range * frac;
          return (
            <g key={frac}>
              <line x1={PAD} y1={y} x2={W - 10} y2={y} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={PAD - 2} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="6" fontFamily="Vazirmatn">
                {formatPrice(val)}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="priceGradMini" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        {points.length >= 2 && (
          <polygon
            fill="url(#priceGradMini)"
            points={`${points[0].x},${PAD + H - PAD * 2} ${polyline} ${points[points.length - 1].x},${PAD + H - PAD * 2}`}
          />
        )}

        <polyline fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={polyline} />

        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#2563eb" />
        ))}

        {[0, history.length - 1].map((idx) => {
          if (!history[idx]) return null;
          const x = PAD + ((W - PAD - 10) * idx) / Math.max(history.length - 1, 1);
          return (
            <text key={idx} x={x} y={H + 8} textAnchor="middle" fill="var(--muted)" fontSize="6" fontFamily="Vazirmatn">
              {history[idx].date.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
