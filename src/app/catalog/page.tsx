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

const TRANSMISSIONS = [
  { key: "all", label: "همه" },
  { key: "automatic", label: "اتوماتیک" },
  { key: "manual", label: "دنده‌ای" },
  { key: "CVT", label: "CVT" },
];

const PRICE_PRESETS = [
  { label: "همه", min: 0, max: Infinity },
  { label: "زیر ۱ میلیارد", min: 0, max: 1_000_000_000 },
  { label: "۱ تا ۲ میلیارد", min: 1_000_000_000, max: 2_000_000_000 },
  { label: "۲ تا ۵ میلیارد", min: 2_000_000_000, max: 5_000_000_000 },
  { label: "بالای ۵ میلیارد", min: 5_000_000_000, max: Infinity },
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
  const [transmissionFilter, setTransmissionFilter] = useState("all");
  const [pricePreset, setPricePreset] = useState(0); // index into PRICE_PRESETS
  const [sortBy, setSortBy] = useState("price-asc");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<CarDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showFilters, setShowFilters] = useState(false);

  // Report modal
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState<"wrong_info" | "suggestion" | "experience">("wrong_info");
  const [reportText, setReportText] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);
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

    // Transmission
    if (transmissionFilter !== "all") {
      result = result.filter((c) => c.specs?.transmission === transmissionFilter);
    }

    // Price range
    const preset = PRICE_PRESETS[pricePreset];
    if (preset && (preset.min !== 0 || preset.max !== Infinity)) {
      result = result.filter((c) => {
        const min = parseInt(c.priceMin) || 0;
        const max = parseInt(c.priceMax) || 0;
        const price = max > 0 ? max : min;
        if (price === 0) return false;
        return price >= preset.min && price <= preset.max;
      });
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
  }, [cars, search, originFilter, categoryFilter, conditionFilter, transmissionFilter, pricePreset, sortBy]);

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

  const activeFilterCount = (originFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0) + (conditionFilter !== "all" ? 1 : 0) + (transmissionFilter !== "all" ? 1 : 0) + (pricePreset !== 0 ? 1 : 0);

  const setView = (mode: "list" | "grid") => {
    setViewMode(mode);
    try { localStorage.setItem("mashinchi-view-mode", mode); } catch {}
  };

  const getTransmissionLabel = (t: string) => {
    if (t === "automatic") return "اتوماتیک";
    if (t === "manual") return "دنده‌ای";
    return t;
  };

  return (
    <div className="flex-1 flex flex-col page-transition">
      {/* ─── Sticky Header ─── */}
      <div className="px-4 pt-3 pb-2 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-30">
        {/* Top row: Title + actions */}
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h1 className="text-lg font-black leading-tight">کاتالوگ</h1>
            <p className="text-[11px] text-muted mt-0.5">{toPersianDigits(filtered.length)} خودرو</p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all ${
                showFilters || activeFilterCount > 0
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-background text-muted border border-border"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
              فیلتر
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 w-4.5 h-4.5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {toPersianDigits(activeFilterCount)}
                </span>
              )}
            </button>
            {/* View toggle */}
            <div className="flex bg-background rounded-xl border border-border p-0.5">
              <button onClick={() => setView("list")} className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-surface shadow-sm text-foreground" : "text-muted"}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
              </button>
              <button onClick={() => setView("grid")} className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-surface shadow-sm text-foreground" : "text-muted"}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="جستجوی نام یا برند..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pr-10 pl-9 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Sort row — always visible */}
        <div className="flex gap-1.5 mt-2.5 overflow-x-auto no-scrollbar">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                sortBy === s.key
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Filter Panel (collapsible) ─── */}
      {showFilters && (
        <div className="px-4 py-3 bg-background border-b border-border space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Origin */}
          <div>
            <p className="text-[10px] font-bold text-muted mb-1.5">کشور سازنده</p>
            <div className="flex flex-wrap gap-1.5">
              {ORIGINS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setOriginFilter(o.key)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                    originFilter === o.key
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface border border-border text-muted"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-[10px] font-bold text-muted mb-1.5">نوع بدنه</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategoryFilter(c.key)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                    categoryFilter === c.key
                      ? "bg-accent text-white shadow-sm"
                      : "bg-surface border border-border text-muted"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition + Transmission row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-muted mb-1.5">وضعیت</p>
              <div className="flex gap-1.5">
                {[
                  { key: "all", label: "همه" },
                  { key: "new", label: "صفر" },
                  { key: "used", label: "کارکرده" },
                ].map((cond) => (
                  <button
                    key={cond.key}
                    onClick={() => setConditionFilter(cond.key)}
                    className={`text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                      conditionFilter === cond.key
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-surface border border-border text-muted"
                    }`}
                  >
                    {cond.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-muted mb-1.5">گیربکس</p>
              <div className="flex gap-1.5">
                {TRANSMISSIONS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTransmissionFilter(t.key)}
                    className={`text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                      transmissionFilter === t.key
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-surface border border-border text-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Price range */}
          <div>
            <p className="text-[10px] font-bold text-muted mb-1.5">محدوده قیمت</p>
            <div className="flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPricePreset(i)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                    pricePreset === i
                      ? "bg-orange-600 text-white shadow-sm"
                      : "bg-surface border border-border text-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setOriginFilter("all"); setCategoryFilter("all"); setConditionFilter("all"); setTransmissionFilter("all"); setPricePreset(0); }}
              className="w-full py-2 text-xs font-bold text-danger hover:bg-danger/5 rounded-lg transition-colors"
            >
              پاک کردن همه فیلترها
            </button>
          )}
        </div>
      )}

      {/* Active filter chips (when panel is closed) */}
      {!showFilters && activeFilterCount > 0 && (
        <div className="px-4 py-2 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-border/50">
          {originFilter !== "all" && (
            <button onClick={() => setOriginFilter("all")} className="shrink-0 flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              {getOriginLabel(originFilter)}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
          {categoryFilter !== "all" && (
            <button onClick={() => setCategoryFilter("all")} className="shrink-0 flex items-center gap-1 text-[10px] font-bold bg-accent/10 text-accent px-2.5 py-1 rounded-full">
              {getCategoryLabel(categoryFilter)}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
          {conditionFilter !== "all" && (
            <button onClick={() => setConditionFilter("all")} className="shrink-0 flex items-center gap-1 text-[10px] font-bold bg-emerald-600/10 text-emerald-600 px-2.5 py-1 rounded-full">
              {conditionFilter === "new" ? "صفر" : "کارکرده"}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
          {transmissionFilter !== "all" && (
            <button onClick={() => setTransmissionFilter("all")} className="shrink-0 flex items-center gap-1 text-[10px] font-bold bg-violet-600/10 text-violet-600 px-2.5 py-1 rounded-full">
              {getTransmissionLabel(transmissionFilter)}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
          {pricePreset !== 0 && (
            <button onClick={() => setPricePreset(0)} className="shrink-0 flex items-center gap-1 text-[10px] font-bold bg-orange-600/10 text-orange-600 px-2.5 py-1 rounded-full">
              {PRICE_PRESETS[pricePreset].label}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      )}

      {/* ─── Car List / Grid ─── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <div className={viewMode === "grid" ? "grid grid-cols-2 gap-2.5" : "space-y-2"}>
          {filtered.map((car) => {
            const satisfaction = car.intel?.ownerSatisfaction;
            const originColor = ORIGIN_COLORS[car.origin] || "bg-muted/10 text-muted";
            const hasValidPrice = parseInt(car.priceMin) > 0 || parseInt(car.priceMax) > 0;

            return viewMode === "grid" ? (
              /* ── Grid Card ── */
              <div
                key={car.id}
                onClick={() => compareMode ? toggleCompare(car.id) : openCarDetail(car.id)}
                className={`relative bg-surface rounded-2xl border overflow-hidden active:scale-[0.97] transition-all cursor-pointer ${
                  compareMode && isInCompare(car.id) ? "border-primary ring-2 ring-primary/20" : "border-border"
                }`}
              >
                {compareMode && (
                  <div className={`absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isInCompare(car.id) ? "bg-primary border-primary" : "bg-white/80 dark:bg-black/50 border-border"
                  }`}>
                    {isInCompare(car.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                  </div>
                )}

                {/* Satisfaction circle */}
                <div className="flex justify-center pt-4 pb-2">
                  {satisfaction ? (
                    <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center border-2 ${
                      satisfaction >= 7 ? "border-accent/30 bg-accent/5" : satisfaction >= 5 ? "border-primary/30 bg-primary/5" : "border-border bg-background"
                    }`}>
                      <span className={`text-base font-black leading-none ${
                        satisfaction >= 7 ? "text-accent" : satisfaction >= 5 ? "text-primary" : "text-muted"
                      }`}>{toPersianDigits(satisfaction)}</span>
                      <span className="text-[7px] text-muted mt-0.5">از ۱۰</span>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/30">
                        <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                        <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" /><path d="M9 17h6" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-3 pb-3 text-center">
                  <h3 className="text-xs font-black truncate">{car.nameFa}</h3>
                  <p className="text-[10px] text-muted mt-0.5">{car.brandFa}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${originColor}`}>
                      {getOriginLabel(car.origin)}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${car.isNew ? "bg-emerald-500" : "bg-orange-400"}`} />
                  </div>
                  <p className={`text-[11px] font-bold mt-2 ${hasValidPrice ? "text-primary" : "text-muted"}`}>
                    {formatPriceRange(car.priceMin, car.priceMax)}
                  </p>
                </div>

                {/* Favorite */}
                <button onClick={(e) => toggleFavorite(car.id, e)} className="absolute top-2.5 right-2.5 p-1">
                  <svg width="14" height="14" viewBox="0 0 24 24"
                    fill={favoriteIds.has(car.id) ? "currentColor" : "none"}
                    stroke="currentColor" strokeWidth="2"
                    className={favoriteIds.has(car.id) ? "text-danger" : "text-muted/30"}
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
                  </svg>
                </button>
              </div>
            ) : (
              /* ── List Card ── */
              <div
                key={car.id}
                onClick={() => compareMode ? toggleCompare(car.id) : openCarDetail(car.id)}
                className={`bg-surface rounded-2xl border overflow-hidden active:scale-[0.98] transition-all cursor-pointer ${
                  compareMode && isInCompare(car.id) ? "border-primary ring-2 ring-primary/20" : "border-border"
                }`}
              >
                <div className="flex items-center gap-3 px-3.5 py-3 relative">
                  {compareMode && (
                    <div className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isInCompare(car.id) ? "bg-primary border-primary" : "bg-white/80 dark:bg-black/50 border-border"
                    }`}>
                      {isInCompare(car.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                    </div>
                  )}

                  {/* Satisfaction indicator */}
                  <div className="shrink-0">
                    {satisfaction ? (
                      <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center ${
                        satisfaction >= 7 ? "bg-accent/10" : satisfaction >= 5 ? "bg-primary/10" : "bg-background"
                      }`}>
                        <span className={`text-sm font-black leading-none ${
                          satisfaction >= 7 ? "text-accent" : satisfaction >= 5 ? "text-primary" : "text-muted"
                        }`}>{toPersianDigits(satisfaction)}</span>
                        <span className="text-[7px] text-muted">رضایت</span>
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-background flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/20">
                          <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                          <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" /><path d="M9 17h6" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Car info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black truncate">{car.nameFa}</h3>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${car.isNew ? "bg-emerald-500" : "bg-orange-400"}`} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${originColor}`}>
                        {getOriginLabel(car.origin)}
                      </span>
                      <span className="text-[9px] text-muted">
                        {getCategoryLabel(car.category)}
                      </span>
                      {car.specs?.transmission && (
                        <span className="text-[9px] text-muted/60">{car.specs.transmission === "automatic" ? "اتوماتیک" : car.specs.transmission === "manual" ? "دنده‌ای" : car.specs.transmission}</span>
                      )}
                    </div>
                  </div>

                  {/* Price + Favorite */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-xs font-black ${hasValidPrice ? "text-primary" : "text-muted/40"}`}>
                      {hasValidPrice ? formatPriceRange(car.priceMin, car.priceMax) : "—"}
                    </span>
                    <button onClick={(e) => toggleFavorite(car.id, e)} className="p-0.5">
                      <svg width="15" height="15" viewBox="0 0 24 24"
                        fill={favoriteIds.has(car.id) ? "currentColor" : "none"}
                        stroke="currentColor" strokeWidth="2"
                        className={favoriteIds.has(car.id) ? "text-danger" : "text-muted/20"}
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-background rounded-2xl flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/30">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M8 11h6" />
              </svg>
            </div>
            <p className="text-sm font-bold text-muted mb-1">خودرویی پیدا نشد</p>
            <p className="text-xs text-muted/60">فیلترها رو تغییر بده یا عبارت دیگه‌ای جستجو کن</p>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setOriginFilter("all"); setCategoryFilter("all"); setConditionFilter("all"); setTransmissionFilter("all"); setPricePreset(0); setSearch(""); }}
                className="mt-3 px-5 py-2 bg-primary/10 text-primary text-xs font-bold rounded-xl"
              >
                پاک کردن فیلترها
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Floating Compare Button ─── */}
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
              className="w-full py-2.5 bg-surface/90 backdrop-blur-sm border border-border rounded-xl text-xs font-bold text-muted flex items-center justify-center gap-2 hover:text-foreground transition-colors shadow-sm"
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
                {/* Report button */}
                <button
                  onClick={() => { setShowReport(true); setReportSent(false); setReportText(""); }}
                  title="گزارش"
                  className="w-9 h-9 rounded-full bg-background flex items-center justify-center text-muted hover:text-orange-500 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
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

            {/* Warnings */}
            {selectedCar.intel && (selectedCar.intel.commonIssues.length > 0 || selectedCar.intel.purchaseWarnings.length > 0) && (
              <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
                <h4 className="text-xs font-black text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 004.99 19z" /></svg>
                  هشدارها
                </h4>
                <div className="space-y-1.5">
                  {selectedCar.intel.purchaseWarnings.map((w, i) => (
                    <div key={`w-${i}`} className="flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-400">
                      <span className="shrink-0 mt-0.5 font-black">!</span><span className="leading-5">{w}</span>
                    </div>
                  ))}
                  {selectedCar.intel.commonIssues.map((issue, i) => (
                    <div key={`i-${i}`} className="flex items-start gap-1.5 text-[11px] text-orange-600 dark:text-orange-400">
                      <span className="shrink-0 mt-0.5 font-black">!</span><span className="leading-5">{issue}</span>
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

      {/* ─── Report Modal ─── */}
      {showReport && selectedCar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => !reportSending && setShowReport(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-2xl z-[60] shadow-2xl max-h-[70vh] overflow-y-auto safe-bottom">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-2 mb-3" />
            <div className="px-5 pb-6">
              <h3 className="text-sm font-black mb-1">گزارش درباره {selectedCar.nameFa}</h3>
              <p className="text-[10px] text-muted mb-4">کمک کن اطلاعات رو بهتر کنیم</p>

              {reportSent ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-3 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">ممنون از گزارشت!</p>
                  <p className="text-[10px] text-muted mt-1">تیم ما بررسی می‌کنه</p>
                  <button onClick={() => setShowReport(false)} className="mt-4 px-6 py-2 bg-background text-xs font-bold rounded-xl">بستن</button>
                </div>
              ) : (
                <>
                  {/* Report type */}
                  <div className="flex gap-1.5 mb-3">
                    {[
                      { key: "wrong_info" as const, label: "اطلاعات غلط", icon: "M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 004.99 19z" },
                      { key: "suggestion" as const, label: "پیشنهاد / تکمیل", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3" },
                      { key: "experience" as const, label: "تجربه من", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setReportType(t.key)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                          reportType === t.key ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border text-muted"
                        }`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={t.icon} /></svg>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Text input */}
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder={
                      reportType === "wrong_info" ? "کدوم اطلاعات غلطه؟ مثلا: قیمت اشتباهه، مشخصات فنی درست نیست..." :
                      reportType === "suggestion" ? "چه اطلاعاتی اضافه بشه؟ مثلا: مصرف واقعی سوخت، تجربه سرویس..." :
                      "تجربه‌ت از این خودرو رو بنویس..."
                    }
                    rows={4}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs leading-6 outline-none resize-none focus:border-primary mb-3"
                  />

                  {/* Submit */}
                  <button
                    onClick={async () => {
                      if (!reportText.trim()) return;
                      setReportSending(true);
                      try {
                        await fetch("/api/report", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            carId: selectedCar.id,
                            carName: selectedCar.nameFa,
                            type: reportType,
                            text: reportText,
                          }),
                        });
                      } catch {}
                      setReportSending(false);
                      setReportSent(true);
                    }}
                    disabled={reportSending || !reportText.trim()}
                    className="w-full py-3 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    {reportSending ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> ارسال...</>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                        ارسال گزارش
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
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
