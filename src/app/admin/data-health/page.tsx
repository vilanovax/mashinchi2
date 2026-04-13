"use client";

import { useState, useEffect, useMemo } from "react";
import { toPersianDigits, getOriginLabel } from "@/lib/utils";
import { useAdmin } from "../layout";
import { useRouter } from "next/navigation";

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
    scores: boolean; specs: boolean; specsDetail: number;
    tags: boolean; tagsCount: number;
    intel: boolean; intelDetail: number;
    reviews: boolean; reviewsCount: number;
    prices: boolean;
    sources: boolean; sourcesCount: number; sourcesApproved: number;
    rawAnalysis: boolean; rawAnalysisCount: number; rawAnalysisProcessed: number;
    image: boolean; description: boolean;
  };
  missing: string[];
}

interface Summary {
  total: number; avgHealth: number; complete: number; needsWork: number;
  noScores: number; noIntel: number; noRawAnalysis: number; noPrices: number; noImage: number;
}

const HEALTH_SECTIONS = [
  { key: "scores", label: "امتیاز" },
  { key: "specs", label: "مشخصات" },
  { key: "intel", label: "تحلیل" },
  { key: "reviews", label: "نظر" },
  { key: "prices", label: "قیمت" },
  { key: "sources", label: "منبع" },
  { key: "image", label: "تصویر" },
  { key: "description", label: "توصیف" },
] as const;

export default function DataHealthPage() {
  const { fetchAdmin } = useAdmin();
  const router = useRouter();
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
  const healthColor = summary.avgHealth >= 70 ? "text-emerald-600" : summary.avgHealth >= 40 ? "text-amber-600" : "text-red-500";
  const healthBar = summary.avgHealth >= 70 ? "bg-emerald-500" : summary.avgHealth >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="p-5">
      {/* ─── Header: progress + inline stats ─── */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <h1 className="text-base font-black">سلامت دیتا</h1>
              <span className={`text-lg font-black ${healthColor}`}>{toPersianDigits(summary.avgHealth)}٪</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${healthBar} transition-all`} style={{ width: `${summary.avgHealth}%` }} />
            </div>
          </div>
          <div className="flex gap-3 text-center shrink-0">
            <div>
              <div className="text-base font-black">{toPersianDigits(summary.total)}</div>
              <div className="text-[8px] text-muted">کل</div>
            </div>
            <div>
              <div className="text-base font-black text-emerald-600">{toPersianDigits(summary.complete)}</div>
              <div className="text-[8px] text-muted">کامل</div>
            </div>
            <div>
              <div className="text-base font-black text-red-500">{toPersianDigits(summary.needsWork)}</div>
              <div className="text-[8px] text-muted">ناقص</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filters: all in one row ─── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Missing filter */}
        <div className="flex gap-1">
          <button onClick={() => setFilterMissing(null)}
            className={`px-2 py-1 rounded-full text-[9px] font-bold border ${!filterMissing ? "bg-primary text-white border-primary" : "bg-surface border-border text-muted"}`}>
            همه
          </button>
          {[
            { key: "scores", label: "بدون امتیاز", count: summary.noScores },
            { key: "intel", label: "بدون تحلیل", count: summary.noIntel },
            { key: "prices", label: "بدون قیمت", count: summary.noPrices },
            { key: "image", label: "بدون تصویر", count: summary.noImage },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilterMissing(filterMissing === f.key ? null : f.key)}
              className={`px-2 py-1 rounded-full text-[9px] font-bold border ${
                filterMissing === f.key ? "bg-red-500 text-white border-red-500" : "bg-surface border-border text-muted"
              }`}>
              {f.label} {toPersianDigits(f.count)}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Origin */}
        <div className="flex gap-1">
          {["all", "iranian", "chinese", "korean", "japanese", "european"].map((o) => (
            <button key={o} onClick={() => setFilterOrigin(o)}
              className={`px-2 py-1 rounded-full text-[9px] font-bold border ${
                filterOrigin === o ? "bg-primary text-white border-primary" : "bg-surface border-border text-muted"
              }`}>
              {o === "all" ? "همه" : getOriginLabel(o)}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="bg-surface border border-border rounded-lg px-2 py-1 text-[9px] outline-none mr-auto">
          <option value="health">بدترین اول</option>
          <option value="missing">بیشترین کمبود</option>
          <option value="name">نام</option>
        </select>

        <span className="text-[9px] text-muted">{toPersianDigits(filtered.length)} خودرو</span>
      </div>

      {/* ─── Car Table ─── */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-background/50 text-[8px] text-muted font-bold">
          <span className="w-7 text-center">٪</span>
          <span className="flex-1">خودرو</span>
          {HEALTH_SECTIONS.map((s) => (
            <span key={s.key} className="w-10 text-center">{s.label}</span>
          ))}
          <span className="w-12 text-center">عملیات</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30 max-h-[70vh] overflow-y-auto">
          {filtered.map((car) => {
            const scoreColor = car.healthScore >= 70 ? "text-emerald-600" : car.healthScore >= 40 ? "text-amber-600" : "text-red-500";

            return (
              <div key={car.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-background/40 transition-colors">
                {/* Health score */}
                <span className={`w-7 text-center text-[10px] font-black ${scoreColor}`}>
                  {toPersianDigits(car.healthScore)}
                </span>

                {/* Car name */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-[11px] font-bold truncate">{car.nameFa}</span>
                  <span className="text-[9px] text-muted">{car.brandFa}</span>
                </div>

                {/* Section dots */}
                {HEALTH_SECTIONS.map((s) => {
                  const has = car.sections[s.key as keyof CarHealth["sections"]];
                  return (
                    <div key={s.key} className="w-10 flex justify-center">
                      <div className={`w-2 h-2 rounded-full ${has ? "bg-emerald-500" : "bg-red-400/40"}`} title={`${has ? "+" : "-"}${s.label}`} />
                    </div>
                  );
                })}

                {/* Actions */}
                <div className="w-12 flex items-center justify-center gap-0.5">
                  <button onClick={() => router.push(`/admin/cars/${car.id}`)} title="ویرایش"
                    className="p-1 rounded text-muted hover:text-primary hover:bg-primary/10">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button onClick={() => router.push(`/admin/cars/${car.id}/data`)} title="دیتای خام"
                    className="p-1 rounded text-muted hover:text-accent hover:bg-accent/10">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-xs text-muted">خودرویی با این فیلتر یافت نشد</p>
        </div>
      )}
    </div>
  );
}
