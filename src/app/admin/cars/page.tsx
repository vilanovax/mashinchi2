"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";
import { useAdmin } from "../layout";

interface Car {
  id: string;
  nameEn: string;
  nameFa: string;
  brand: string;
  brandFa: string;
  category: string;
  origin: string;
  year: number;
  priceMin: string;
  priceMax: string;
  imageUrl: string | null;
  isNew: boolean;
  hasScores: boolean;
  hasSpecs: boolean;
  hasIntel: boolean;
  intelProsCount: number;
  hasIntelSummary: boolean;
  reviewsCount: number;
  sourcesCount: number;
  tagsCount: number;
}

const ORIGINS = [
  { key: "all", label: "همه" },
  { key: "iranian", label: "ایرانی", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { key: "chinese", label: "چینی", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  { key: "korean", label: "کره‌ای", color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  { key: "japanese", label: "ژاپنی", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  { key: "european", label: "اروپایی", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
];

const CATEGORIES = [
  { key: "all", label: "همه" },
  { key: "sedan", label: "سدان" },
  { key: "suv", label: "شاسی‌بلند" },
  { key: "hatchback", label: "هاچبک" },
  { key: "crossover", label: "کراس‌اوور" },
  { key: "pickup", label: "وانت" },
];

type SortKey = "name" | "price-asc" | "price-desc" | "sources" | "health";

// Health score: how complete is this car's data
function healthScore(c: Car): number {
  let s = 0;
  if (c.hasScores) s++;
  if (c.hasSpecs) s++;
  if (c.hasIntelSummary) s++;
  if (c.reviewsCount >= 2) s++;
  if (c.sourcesCount >= 2) s++;
  if (c.imageUrl) s++;
  return s; // 0-6
}

function formatBillions(toman: string): string {
  const n = parseInt(toman);
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000_000) {
    const b = n / 1_000_000_000;
    return toPersianDigits(b.toFixed(1).replace(/\.0$/, ""));
  }
  if (n >= 1_000_000) return toPersianDigits(Math.round(n / 1_000_000)) + "م";
  return toPersianDigits(n);
}

export default function AdminCarsPage() {
  const { fetchAdmin } = useAdmin();
  const router = useRouter();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
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
      return matchSearch && matchOrigin && matchCategory;
    });

    if (sortBy === "price-asc") result.sort((a, b) => parseInt(a.priceMin) - parseInt(b.priceMin));
    else if (sortBy === "price-desc") result.sort((a, b) => parseInt(b.priceMin) - parseInt(a.priceMin));
    else if (sortBy === "sources") result.sort((a, b) => b.sourcesCount - a.sourcesCount);
    else if (sortBy === "health") result.sort((a, b) => healthScore(b) - healthScore(a));
    else result.sort((a, b) => a.nameFa.localeCompare(b.nameFa, "fa"));

    return result;
  }, [cars, search, originFilter, categoryFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-black">خودروها</h1>
          <p className="text-[10px] text-muted">{toPersianDigits(filtered.length)} از {toPersianDigits(cars.length)}</p>
        </div>
        <button onClick={() => router.push("/admin/import")} className="px-3.5 py-2 bg-primary text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-primary/20">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
          افزودن خودرو
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-surface border border-border rounded-lg pr-8 pl-3 py-1.5 text-[11px] outline-none focus:border-primary w-[160px]"
          />
        </div>

        {/* Origin chips */}
        <div className="flex gap-1">
          {ORIGINS.map((o) => (
            <button
              key={o.key}
              onClick={() => setOriginFilter(originFilter === o.key ? "all" : o.key)}
              className={`text-[9px] px-2 py-1 rounded-full font-bold transition-all border ${
                originFilter === o.key
                  ? o.key === "all" ? "bg-primary text-white border-primary" : `${o.color} border`
                  : "bg-surface border-border text-muted"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Category chips */}
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(categoryFilter === c.key ? "all" : c.key)}
              className={`text-[9px] px-2 py-1 rounded-full font-bold transition-all border ${
                categoryFilter === c.key ? "bg-accent text-white border-accent" : "bg-surface border-border text-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-surface border border-border rounded-lg px-2 py-1.5 text-[10px] outline-none mr-auto"
        >
          <option value="name">نام</option>
          <option value="price-asc">ارزان‌ترین</option>
          <option value="price-desc">گران‌ترین</option>
          <option value="sources">بیشترین منبع</option>
          <option value="health">کامل‌ترین</option>
        </select>
      </div>

      {/* ─── Car Table (compact) ─── */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background/50 text-[9px] text-muted font-bold">
              <th className="text-right px-3 py-2 w-8">#</th>
              <th className="text-right px-3 py-2">خودرو</th>
              <th className="text-right px-3 py-2 w-20">مبدا</th>
              <th className="text-right px-3 py-2 w-20">قیمت (میلیارد)</th>
              <th className="text-center px-3 py-2 w-28">وضعیت</th>
              <th className="text-center px-3 py-2 w-16">منابع</th>
              <th className="text-center px-2 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((car, idx) => {
              const health = healthScore(car);
              const originInfo = ORIGINS.find((o) => o.key === car.origin);

              return (
                <tr
                  key={car.id}
                  className="border-b border-border/30 hover:bg-background/40 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/cars/${car.id}`)}
                >
                  {/* # */}
                  <td className="px-3 py-1.5 text-[9px] text-muted">{toPersianDigits(idx + 1)}</td>

                  {/* Car name + image */}
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt="" className="w-8 h-6 object-cover rounded border border-border shrink-0" />
                      ) : (
                        <div className="w-8 h-6 bg-background rounded border border-border/50 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold truncate">{car.nameFa}</div>
                        <div className="text-[9px] text-muted truncate">{car.brandFa}</div>
                      </div>
                    </div>
                  </td>

                  {/* Origin + Category */}
                  <td className="px-3 py-1.5">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${originInfo?.color || "bg-background text-muted"}`}>
                      {getOriginLabel(car.origin)}
                    </span>
                  </td>

                  {/* Price (billions) */}
                  <td className="px-3 py-1.5">
                    <span className="text-[11px] font-bold">{formatBillions(car.priceMin)}</span>
                  </td>

                  {/* Health dots */}
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-center gap-0.5" title={`${health}/6 کامل`}>
                      {[
                        { ok: car.hasScores, tip: "امتیاز" },
                        { ok: car.hasSpecs, tip: "مشخصات" },
                        { ok: car.hasIntelSummary, tip: "تحلیل" },
                        { ok: car.reviewsCount >= 2, tip: "نظر" },
                        { ok: car.sourcesCount >= 2, tip: "منبع" },
                        { ok: !!car.imageUrl, tip: "تصویر" },
                      ].map((d, i) => (
                        <div
                          key={i}
                          title={d.tip}
                          className={`w-2 h-2 rounded-full ${d.ok ? "bg-emerald-500" : "bg-red-400/40"}`}
                        />
                      ))}
                    </div>
                  </td>

                  {/* Sources count */}
                  <td className="px-3 py-1.5 text-center">
                    <span className={`text-[10px] font-black ${car.sourcesCount > 0 ? "text-primary" : "text-muted/40"}`}>
                      {toPersianDigits(car.sourcesCount)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => router.push(`/admin/cars/${car.id}/data`)}
                        className="p-1 rounded text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                        title="دیتای خام"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => router.push(`/admin/cars/${car.id}`)}
                        className="p-1 rounded text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                        title="ویرایش"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(car.id)}
                        className="p-1 rounded text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="حذف"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
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
            <p className="text-xs text-muted">خودرویی پیدا نشد</p>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl p-5 z-50 shadow-2xl w-72">
            <p className="text-sm font-bold text-center mb-1">حذف خودرو</p>
            <p className="text-[11px] text-muted text-center mb-3">
              {cars.find((c) => c.id === deleteConfirm)?.nameFa} و تمام داده‌ها حذف شود؟
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-background text-xs font-bold rounded-xl">انصراف</button>
              <button onClick={() => deleteCar(deleteConfirm)} className="flex-1 py-2 bg-danger text-white text-xs font-bold rounded-xl">حذف</button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}
