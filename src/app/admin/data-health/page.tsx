"use client";

import { useState, useEffect, useMemo } from "react";
import { toPersianDigits, getOriginLabel } from "@/lib/utils";
import { useAdmin } from "../layout";

interface CarHealth {
  id: string;
  nameEn: string;
  nameFa: string;
  brandFa: string;
  origin: string;
  category: string;
  imageUrl: string | null;
  healthScore: number;
  sections: {
    scores: boolean;
    specs: boolean;
    specsDetail: number;
    tags: boolean;
    tagsCount: number;
    intel: boolean;
    intelDetail: number;
    reviews: boolean;
    reviewsCount: number;
    prices: boolean;
    sources: boolean;
    sourcesCount: number;
    sourcesApproved: number;
    rawAnalysis: boolean;
    rawAnalysisCount: number;
    rawAnalysisProcessed: number;
    image: boolean;
    description: boolean;
  };
  missing: string[];
}

interface Summary {
  total: number;
  avgHealth: number;
  complete: number;
  needsWork: number;
  noScores: number;
  noIntel: number;
  noRawAnalysis: number;
  noPrices: number;
  noImage: number;
}

const ORIGIN_COLORS: Record<string, string> = {
  iranian: "bg-blue-500", chinese: "bg-rose-500", korean: "bg-violet-500",
  japanese: "bg-red-500", european: "bg-amber-500",
};

const SECTION_ICONS: Record<string, { label: string; key: keyof CarHealth["sections"] }> = {
  scores: { label: "امتیاز", key: "scores" },
  specs: { label: "مشخصات", key: "specs" },
  intel: { label: "تحلیل", key: "intel" },
  reviews: { label: "نظرات", key: "reviews" },
  prices: { label: "قیمت", key: "prices" },
  rawAnalysis: { label: "خام", key: "rawAnalysis" },
  sources: { label: "منابع", key: "sources" },
  image: { label: "تصویر", key: "image" },
};

export default function DataHealthPage() {
  const { fetchAdmin } = useAdmin();
  const [data, setData] = useState<{ cars: CarHealth[]; summary: Summary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"health" | "name" | "missing">("health");
  const [filterOrigin, setFilterOrigin] = useState("all");
  const [filterMissing, setFilterMissing] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmin("/api/admin/data-health").then((r: Response) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!data) return [];
    let cars = data.cars;

    if (filterOrigin !== "all") cars = cars.filter((c) => c.origin === filterOrigin);
    if (filterMissing) cars = cars.filter((c) => !c.sections[filterMissing as keyof CarHealth["sections"]]);

    if (sortBy === "health") cars = [...cars].sort((a, b) => a.healthScore - b.healthScore);
    else if (sortBy === "missing") cars = [...cars].sort((a, b) => b.missing.length - a.missing.length);
    else cars = [...cars].sort((a, b) => a.nameFa.localeCompare(b.nameFa, "fa"));

    return cars;
  }, [data, sortBy, filterOrigin, filterMissing]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return null;

  const { summary } = data;

  return (
    <div className="p-6">
      <h1 className="text-xl font-black mb-5">سلامت دیتا</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <SummaryCard label="کل خودروها" value={summary.total} color="primary" />
        <SummaryCard label="میانگین سلامت" value={`${summary.avgHealth}%`} color={summary.avgHealth >= 70 ? "green" : summary.avgHealth >= 40 ? "amber" : "red"} />
        <SummaryCard label="کامل (بالای ۸۰٪)" value={summary.complete} color="green" />
        <SummaryCard label="نیازمند کار (زیر ۵۰٪)" value={summary.needsWork} color="red" />
        <SummaryCard label="بدون تحلیل خام" value={summary.noRawAnalysis} color="amber" />
      </div>

      {/* Missing data quick filters */}
      <div className="bg-surface rounded-xl border border-border p-3 mb-5">
        <h3 className="text-[10px] font-bold text-muted mb-2">فیلتر خودروهای بدون:</h3>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterMissing(null)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${!filterMissing ? "bg-primary text-white" : "bg-background text-muted"}`}>
            همه
          </button>
          {[
            { key: "scores", label: "امتیاز", count: summary.noScores },
            { key: "intel", label: "تحلیل هوشمند", count: summary.noIntel },
            { key: "rawAnalysis", label: "تحلیل خام", count: summary.noRawAnalysis },
            { key: "prices", label: "تاریخچه قیمت", count: summary.noPrices },
            { key: "image", label: "تصویر", count: summary.noImage },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilterMissing(filterMissing === f.key ? null : f.key)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                filterMissing === f.key ? "bg-red-500 text-white" : "bg-background text-muted"
              }`}>
              {f.label} ({toPersianDigits(f.count)})
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1.5">
          {[
            { key: "all", label: "همه" },
            { key: "iranian", label: "ایرانی" },
            { key: "chinese", label: "چینی" },
            { key: "korean", label: "کره‌ای" },
            { key: "japanese", label: "ژاپنی" },
            { key: "european", label: "اروپایی" },
          ].map((o) => (
            <button key={o.key} onClick={() => setFilterOrigin(o.key)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                filterOrigin === o.key ? "bg-primary text-white" : "bg-surface border border-border text-muted"
              }`}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[
            { key: "health" as const, label: "سلامت" },
            { key: "missing" as const, label: "کمبود" },
            { key: "name" as const, label: "نام" },
          ].map((s) => (
            <button key={s.key} onClick={() => setSortBy(s.key)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                sortBy === s.key ? "bg-foreground/10 text-foreground" : "text-muted"
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Car list */}
      <div className="space-y-2">
        {filtered.map((car) => (
          <div key={car.id} className="bg-surface rounded-xl border border-border p-3">
            <div className="flex items-center gap-3">
              {/* Health ring */}
              <div className="relative w-11 h-11 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none"
                    stroke={car.healthScore >= 70 ? "#10b981" : car.healthScore >= 40 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${car.healthScore * 0.975} 100`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black">
                  {toPersianDigits(car.healthScore)}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${ORIGIN_COLORS[car.origin] || "bg-gray-400"}`} />
                  <span className="text-sm font-bold text-foreground">{car.nameFa}</span>
                  <span className="text-[10px] text-muted">{car.brandFa}</span>
                </div>

                {/* Section pills */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {Object.entries(SECTION_ICONS).map(([key, info]) => {
                    const has = car.sections[info.key];
                    return (
                      <span key={key} className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        has ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {has ? "+" : "-"}{info.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Detail scores */}
              <div className="text-left shrink-0 space-y-0.5">
                {car.sections.specs && (
                  <div className="text-[9px] text-muted">
                    مشخصات: <span className="font-bold text-foreground">{toPersianDigits(car.sections.specsDetail)}%</span>
                  </div>
                )}
                {car.sections.intel && (
                  <div className="text-[9px] text-muted">
                    تحلیل: <span className="font-bold text-foreground">{toPersianDigits(car.sections.intelDetail)}%</span>
                  </div>
                )}
                {car.sections.reviewsCount > 0 && (
                  <div className="text-[9px] text-muted">
                    نظر: <span className="font-bold">{toPersianDigits(car.sections.reviewsCount)}</span>
                  </div>
                )}
                {car.sections.rawAnalysisCount > 0 && (
                  <div className="text-[9px] text-muted">
                    خام: <span className="font-bold">{toPersianDigits(car.sections.rawAnalysisProcessed)}/{toPersianDigits(car.sections.rawAnalysisCount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Missing items */}
            {car.missing.length > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[9px] text-red-400 font-bold">کمبود:</span>
                <span className="text-[9px] text-muted">{car.missing.join("، ")}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted">خودرویی با این فیلتر یافت نشد</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colorClass = color === "primary" ? "text-primary" :
    color === "green" ? "text-emerald-500" :
    color === "amber" ? "text-amber-500" : "text-red-500";

  return (
    <div className="bg-surface rounded-xl border border-border p-3 text-center">
      <div className={`text-lg font-black ${colorClass}`}>
        {typeof value === "number" ? toPersianDigits(value) : toPersianDigits(value)}
      </div>
      <div className="text-[10px] text-muted mt-0.5">{label}</div>
    </div>
  );
}
