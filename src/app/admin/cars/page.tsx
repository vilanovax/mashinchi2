"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";
import { useAdmin } from "../layout";

interface Car {
  id: string;
  nameEn: string;
  nameFa: string;
  brand: string;
  brandFa: string;
  category: string;
  origin: string;
  priceMin: string;
  priceMax: string;
  description: string | null;
  scores: Record<string, number> | null;
  specs: Record<string, unknown> | null;
  intel: Record<string, unknown> | null;
  tags: { id: string; tag: string }[];
  reviews: { id: string }[];
}

const ORIGINS = [
  { key: "all", label: "همه" },
  { key: "iranian", label: "ایرانی", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { key: "chinese", label: "چینی", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  { key: "korean", label: "کره‌ای", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  { key: "japanese", label: "ژاپنی", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  { key: "european", label: "اروپایی", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
];

const CATEGORIES = [
  { key: "all", label: "همه" },
  { key: "sedan", label: "سدان" },
  { key: "suv", label: "شاسی‌بلند" },
  { key: "hatchback", label: "هاچبک" },
  { key: "crossover", label: "کراس‌اوور" },
  { key: "pickup", label: "وانت" },
];

type DataFilter = "all" | "complete" | "missing_scores" | "missing_intel" | "missing_reviews";

export default function AdminCarsPage() {
  const { fetchAdmin } = useAdmin();
  const router = useRouter();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dataFilter, setDataFilter] = useState<DataFilter>("all");
  const [sortBy, setSortBy] = useState<"name" | "price-asc" | "price-desc" | "reviews">("name");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmin("/api/admin/cars")
      .then((r) => r.json())
      .then((data) => { setCars(data); setLoading(false); })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const deleteCar = async (id: string) => {
    const name = cars.find((c) => c.id === id)?.nameFa || "";
    await fetchAdmin(`/api/admin/cars/${id}`, { method: "DELETE" });
    setCars((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirm(null);
    showToast(`${name} حذف شد`);
  };

  const filtered = useMemo(() => {
    let result = cars.filter((c) => {
      const matchSearch = !search || c.nameFa.includes(search) || c.nameEn.toLowerCase().includes(search.toLowerCase()) || c.brandFa.includes(search);
      const matchOrigin = originFilter === "all" || c.origin === originFilter;
      const matchCategory = categoryFilter === "all" || c.category === categoryFilter;

      let matchData = true;
      if (dataFilter === "complete") matchData = !!c.scores && !!c.specs && !!c.intel && c.reviews.length > 0;
      else if (dataFilter === "missing_scores") matchData = !c.scores;
      else if (dataFilter === "missing_intel") matchData = !c.intel;
      else if (dataFilter === "missing_reviews") matchData = c.reviews.length === 0;

      return matchSearch && matchOrigin && matchCategory && matchData;
    });

    if (sortBy === "price-asc") result.sort((a, b) => parseInt(a.priceMin) - parseInt(b.priceMin));
    else if (sortBy === "price-desc") result.sort((a, b) => parseInt(b.priceMin) - parseInt(a.priceMin));
    else if (sortBy === "reviews") result.sort((a, b) => b.reviews.length - a.reviews.length);
    else result.sort((a, b) => a.nameFa.localeCompare(b.nameFa, "fa"));

    return result;
  }, [cars, search, originFilter, categoryFilter, dataFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const complete = cars.filter((c) => !!c.scores && !!c.specs && !!c.intel && c.reviews.length > 0).length;
    const missingScores = cars.filter((c) => !c.scores).length;
    const missingIntel = cars.filter((c) => !c.intel).length;
    const missingReviews = cars.filter((c) => c.reviews.length === 0).length;
    return { complete, missingScores, missingIntel, missingReviews };
  }, [cars]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeFilters = [originFilter !== "all", categoryFilter !== "all", dataFilter !== "all"].filter(Boolean).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black">مدیریت خودروها</h1>
          <p className="text-[11px] text-muted mt-0.5">{toPersianDigits(filtered.length)} از {toPersianDigits(cars.length)} خودرو</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/admin/import")} className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
            اضافه کردن
          </button>
          <button onClick={() => router.push("/admin/ai")} className="px-3 py-1.5 bg-surface border border-border text-[11px] font-bold rounded-lg flex items-center gap-1 text-muted hover:text-primary transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            تولید AI
          </button>
        </div>
      </div>

      {/* Data Completeness Bar */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "all" as DataFilter, label: "همه", count: cars.length, color: "" },
          { key: "complete" as DataFilter, label: "کامل", count: stats.complete, color: "text-accent" },
          { key: "missing_scores" as DataFilter, label: "بدون امتیاز", count: stats.missingScores, color: "text-danger" },
          { key: "missing_intel" as DataFilter, label: "بدون intel", count: stats.missingIntel, color: "text-amber-600" },
          { key: "missing_reviews" as DataFilter, label: "بدون نظر", count: stats.missingReviews, color: "text-violet-600" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setDataFilter(item.key)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
              dataFilter === item.key
                ? "bg-primary text-white border-primary"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            <span className={dataFilter !== item.key ? item.color : ""}>{item.label}</span>
            <span className="mr-1 opacity-70">{toPersianDigits(item.count)}</span>
          </button>
        ))}
      </div>

      {/* Search + Filter Chips */}
      <div className="space-y-2.5 mb-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="جستجو نام، برند..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pr-9 pl-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-[11px] outline-none shrink-0"
          >
            <option value="name">نام</option>
            <option value="price-asc">ارزان‌ترین</option>
            <option value="price-desc">گران‌ترین</option>
            <option value="reviews">بیشترین نظر</option>
          </select>
          {activeFilters > 0 && (
            <button
              onClick={() => { setOriginFilter("all"); setCategoryFilter("all"); setDataFilter("all"); }}
              className="px-3 py-2 text-[10px] text-danger font-bold bg-danger/5 border border-danger/15 rounded-lg shrink-0"
            >
              پاک کردن فیلترها
            </button>
          )}
        </div>

        {/* Origin Chips */}
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted self-center ml-1">مبدا:</span>
          {ORIGINS.map((o) => (
            <button
              key={o.key}
              onClick={() => setOriginFilter(originFilter === o.key ? "all" : o.key)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-all border ${
                originFilter === o.key
                  ? o.key === "all" ? "bg-primary text-white border-primary" : `${o.color} border`
                  : "bg-surface border-border text-muted hover:text-foreground"
              }`}
            >
              {o.label}
              {o.key !== "all" && (
                <span className="mr-0.5 opacity-60">
                  {toPersianDigits(cars.filter((c) => c.origin === o.key).length)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Category Chips */}
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted self-center ml-1">دسته:</span>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(categoryFilter === c.key ? "all" : c.key)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-all border ${
                categoryFilter === c.key
                  ? "bg-accent text-white border-accent"
                  : "bg-surface border-border text-muted hover:text-foreground"
              }`}
            >
              {c.label}
              {c.key !== "all" && (
                <span className="mr-0.5 opacity-60">
                  {toPersianDigits(cars.filter((car) => car.category === c.key).length)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="text-right px-4 py-2.5 font-bold text-[10px] text-muted w-8">#</th>
              <th className="text-right px-4 py-2.5 font-bold text-[10px] text-muted">خودرو</th>
              <th className="text-right px-4 py-2.5 font-bold text-[10px] text-muted">مبدا / دسته</th>
              <th className="text-right px-4 py-2.5 font-bold text-[10px] text-muted">قیمت</th>
              <th className="text-center px-4 py-2.5 font-bold text-[10px] text-muted">وضعیت داده</th>
              <th className="text-center px-2 py-2.5 font-bold text-[10px] text-muted w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((car, idx) => {
              const hasScores = !!car.scores;
              const hasSpecs = !!car.specs;
              const hasIntel = !!car.intel;
              const reviewCount = car.reviews?.length || 0;
              const isComplete = hasScores && hasSpecs && hasIntel && reviewCount > 0;
              const originInfo = ORIGINS.find((o) => o.key === car.origin);

              return (
                <tr
                  key={car.id}
                  className="border-b border-border/50 hover:bg-background/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/cars/${car.id}`)}
                >
                  <td className="px-4 py-2.5 text-[10px] text-muted">{toPersianDigits(idx + 1)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isComplete ? "bg-accent/10" : "bg-background"}`}>
                        {isComplete ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent"><path d="M20 6L9 17l-5-5" /></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/40">
                            <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2M9 17h6" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold">{car.nameFa}</div>
                        <div className="text-[10px] text-muted">{car.nameEn}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${originInfo?.color || "bg-background text-muted"}`}>
                        {getOriginLabel(car.origin)}
                      </span>
                      <span className="text-[10px] text-muted">{getCategoryLabel(car.category)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-xs font-bold text-primary">{toPersianDigits(formatPrice(car.priceMin))}</div>
                    <div className="text-[9px] text-muted">تا {toPersianDigits(formatPrice(car.priceMax))}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      {[
                        { ok: hasScores, label: "S", title: "امتیازات" },
                        { ok: hasSpecs, label: "Sp", title: "مشخصات" },
                        { ok: hasIntel, label: "I", title: "هوش" },
                      ].map((d) => (
                        <span
                          key={d.label}
                          title={d.title}
                          className={`text-[8px] font-bold w-5 h-5 rounded flex items-center justify-center ${
                            d.ok ? "bg-accent/10 text-accent" : "bg-danger/10 text-danger"
                          }`}
                        >
                          {d.label}
                        </span>
                      ))}
                      <span
                        title="نظرات"
                        className={`text-[8px] font-bold px-1.5 h-5 rounded flex items-center justify-center ${
                          reviewCount > 0 ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"
                        }`}
                      >
                        R{toPersianDigits(reviewCount)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => router.push(`/admin/cars/${car.id}`)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors"
                        title="ویرایش"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(car.id)}
                        className="p-1.5 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-colors"
                        title="حذف"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted">خودرویی پیدا نشد</p>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl p-6 z-50 shadow-2xl w-80">
            <p className="text-sm font-bold text-center mb-1">حذف خودرو</p>
            <p className="text-xs text-muted text-center mb-4">
              {cars.find((c) => c.id === deleteConfirm)?.nameFa} و تمام داده‌های مرتبط حذف شود؟
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-background text-foreground text-sm font-bold rounded-xl">انصراف</button>
              <button onClick={() => deleteCar(deleteConfirm)} className="flex-1 py-2 bg-danger text-white text-sm font-bold rounded-xl">حذف</button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50" style={{ animation: "fadeIn 0.2s ease-out" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
