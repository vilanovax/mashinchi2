"use client";

import { useState, useEffect, useMemo } from "react";
import { formatPrice, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";
import BottomSheet from "@/components/BottomSheet";

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

  return (
    <div className="flex-1 flex flex-col page-transition">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-lg font-black mb-3">کاتالوگ خودرو</h1>

        {/* Search */}
        <div className="relative mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="جستجو نام یا برند..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Origin Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
          {ORIGINS.map((o) => (
            <button
              key={o.key}
              onClick={() => setOriginFilter(o.key)}
              className={`shrink-0 text-[11px] px-3 py-1 rounded-full font-bold transition-colors ${
                originFilter === o.key
                  ? "bg-primary text-white"
                  : "bg-background text-muted hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Category + Sort Row */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategoryFilter(c.key)}
                className={`shrink-0 text-[11px] px-2.5 py-0.5 rounded-full transition-colors ${
                  categoryFilter === c.key
                    ? "bg-accent/15 text-accent font-bold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-[11px] bg-background border border-border rounded-lg px-2 py-1 text-muted outline-none shrink-0 mr-2"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="px-5 py-1.5">
        <span className="text-[11px] text-muted">{toPersianDigits(filtered.length)} خودرو</span>
      </div>

      {/* Car List */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="space-y-2.5">
          {filtered.map((car) => (
            <div
              key={car.id}
              onClick={() => openCarDetail(car.id)}
              className="w-full bg-surface rounded-2xl border border-border p-3.5 text-right flex items-center gap-3 active:scale-[0.99] transition-transform cursor-pointer"
            >
              {/* Car mini icon */}
              <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/50">
                  <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                  <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                  <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" />
                  <path d="M9 17h6" />
                </svg>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold truncate">{car.nameFa}</h3>
                  <button
                    onClick={(e) => toggleFavorite(car.id, e)}
                    className="shrink-0 mr-1 p-1"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={favoriteIds.has(car.id) ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      className={favoriteIds.has(car.id) ? "text-danger" : "text-muted"}
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
                    </svg>
                  </button>
                </div>
                <p className="text-[11px] text-muted">
                  {car.brandFa} | {getOriginLabel(car.origin)} | {getCategoryLabel(car.category)}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-bold text-primary">
                    {toPersianDigits(formatPrice(car.priceMin))}
                    <span className="text-[10px] text-muted font-normal"> تا </span>
                    {toPersianDigits(formatPrice(car.priceMax))}
                  </span>
                  {car.specs?.horsepower && (
                    <span className="text-[10px] text-muted">
                      {toPersianDigits(car.specs.horsepower)} اسب
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted text-sm">خودرویی پیدا نشد</p>
          </div>
        )}
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
              <button
                onClick={() => toggleFavorite(selectedCar.id)}
                className="w-10 h-10 rounded-full bg-background flex items-center justify-center"
              >
                <svg
                  width="20"
                  height="20"
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
