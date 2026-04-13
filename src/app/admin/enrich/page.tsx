"use client";

import { useState, useEffect, useMemo } from "react";
import { toPersianDigits, getOriginLabel } from "@/lib/utils";
import { useAdmin } from "../layout";

interface CarStatus {
  id: string; nameFa: string; brandFa: string; origin: string;
  hasDescription: boolean; hasRichIntel: boolean;
  prosCount: number; reviewCount: number; satisfaction: number;
}

interface DiffItem {
  old: string | string[] | number;
  new: string | string[] | number;
  changed: boolean;
}

interface EnrichPreview {
  success: boolean;
  preview: boolean;
  carId: string;
  nameFa: string;
  source: string;
  changedFields: number;
  generated: Record<string, DiffItem>;
  rawData: Record<string, unknown>;
}

const ORIGIN_COLORS: Record<string, string> = {
  iranian: "bg-blue-500/10 text-blue-600", chinese: "bg-rose-500/10 text-rose-600",
  korean: "bg-violet-500/10 text-violet-600", japanese: "bg-red-500/10 text-red-600",
  european: "bg-amber-500/10 text-amber-600",
};

// What enrichment generates — shown to user
const ENRICH_FIELDS = [
  { key: "description", label: "توصیف خودرو", desc: "۳-۴ جمله معرفی صمیمانه" },
  { key: "overallSummary", label: "جمع‌بندی کلی", desc: "۴-۵ جمله حرفه‌ای" },
  { key: "whyBuy", label: "چرا بخری", desc: "دلایل خرید با توجه به رقبا" },
  { key: "whyNotBuy", label: "چرا نخری", desc: "مشکلات واقعی و هشدارها" },
  { key: "ownerVerdict", label: "نظر مالکان", desc: "حس کلی بعد از استفاده" },
  { key: "frequentPros", label: "نقاط قوت", desc: "۵ قوت با جزئیات ملموس" },
  { key: "frequentCons", label: "نقاط ضعف", desc: "۴ ضعف واقعی و دقیق" },
  { key: "commonIssues", label: "خرابی‌های رایج", desc: "۳ خرابی فنی با هزینه" },
  { key: "purchaseWarnings", label: "هشدارهای خرید", desc: "۲ هشدار عملی" },
  { key: "reviews", label: "نظرات", desc: "۱ نظر کارشناسی + ۱ نظر مالک" },
  { key: "scores", label: "امتیازات هوشمند", desc: "۱۴ امتیاز تخصصی" },
];

type Filter = "all" | "needs" | "complete";

export default function AdminEnrichPage() {
  const { fetchAdmin } = useAdmin();
  const [cars, setCars] = useState<CarStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, current: "" });
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enrichPreview, setEnrichPreview] = useState<EnrichPreview | null>(null);
  const [applyingEnrich, setApplyingEnrich] = useState(false);
  const [justEnrichedIds, setJustEnrichedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAdmin("/api/admin/enrich").then((r) => r.json()).then((d) => { setCars(d); setLoading(false); }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const needsWork = (c: CarStatus) => !c.hasRichIntel || c.prosCount < 3 || c.reviewCount < 3;
  const getFilledCount = (c: CarStatus) => {
    let n = 0;
    if (c.hasDescription) n++;
    if (c.hasRichIntel) n++;
    if (c.prosCount >= 3) n++;
    if (c.reviewCount >= 3) n++;
    if (c.satisfaction > 0) n++;
    return n;
  };

  const stats = useMemo(() => ({
    total: cars.length,
    complete: cars.filter((c) => !needsWork(c)).length,
    needs: cars.filter(needsWork).length,
  }), [cars]);

  const filtered = useMemo(() => {
    let result = cars;
    if (filter === "needs") result = result.filter(needsWork);
    else if (filter === "complete") result = result.filter((c) => !needsWork(c));
    return result;
  }, [cars, filter]);

  // Sort: needs-work first, then by filled count asc, then alphabetical
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aN = needsWork(a) ? 0 : 1;
      const bN = needsWork(b) ? 0 : 1;
      if (aN !== bN) return aN - bN;
      return getFilledCount(a) - getFilledCount(b);
    });
  }, [filtered]);

  // Step 1: Request preview (AI generates but doesn't save)
  const enrichSingle = async (carId: string) => {
    setEnrichingId(carId);
    setEnrichPreview(null);
    try {
      const res = await fetchAdmin("/api/admin/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, apply: false }),
      });
      const data = await res.json();
      if (data.success && data.preview) {
        setEnrichPreview(data);
      } else {
        showToast(data.error || "خطا");
      }
    } catch {
      showToast("خطا در اتصال");
    }
    setEnrichingId(null);
  };

  // Step 2: Apply after preview
  const applyEnrich = async () => {
    if (!enrichPreview) return;
    setApplyingEnrich(true);
    try {
      const res = await fetchAdmin("/api/admin/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId: enrichPreview.carId, apply: true }),
      });
      const data = await res.json();
      if (data.success && data.applied) {
        showToast(`${enrichPreview.nameFa} غنی‌سازی و ذخیره شد`);
        setJustEnrichedIds((prev) => new Set(prev).add(enrichPreview.carId));
        setEnrichPreview(null);
        const updated = await fetchAdmin("/api/admin/enrich").then((r) => r.json());
        setCars(updated);
      } else {
        showToast(data.error || "خطا در اعمال");
      }
    } catch {
      showToast("خطا در اتصال");
    }
    setApplyingEnrich(false);
  };

  const enrichBatch = async () => {
    const work = cars.filter(needsWork);
    if (work.length === 0) { showToast("همه کامل هستن"); return; }
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: work.length, current: "" });

    for (let i = 0; i < work.length; i++) {
      setBatchProgress({ done: i, total: work.length, current: work[i].nameFa });
      try {
        await fetchAdmin("/api/admin/enrich", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carId: work[i].id }),
        });
      } catch { /* continue */ }
      await new Promise((r) => setTimeout(r, 2000));
    }

    setBatchProgress({ done: work.length, total: work.length, current: "" });
    setBatchRunning(false);
    const updated = await fetchAdmin("/api/admin/enrich").then((r) => r.json());
    setCars(updated);
    showToast(`${toPersianDigits(work.length)} خودرو غنی‌سازی شد`);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const completePct = stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0;

  return (
    <div className="p-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-black">غنی‌سازی با AI</h1>
          <p className="text-[10px] text-muted">تولید خودکار توصیف، تحلیل، نقاط قوت/ضعف، نظرات و امتیازات برای خودروها</p>
        </div>
        <button
          onClick={enrichBatch}
          disabled={batchRunning || stats.needs === 0}
          className="px-3.5 py-2 bg-primary text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-40 shadow-sm shadow-primary/20"
        >
          {batchRunning ? (
            <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> {toPersianDigits(batchProgress.done)}/{toPersianDigits(batchProgress.total)}</>
          ) : (
            <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> غنی‌سازی {toPersianDigits(stats.needs)} ناقص</>
          )}
        </button>
      </div>

      {/* ─── What does enrichment produce? ─── */}
      <details className="mb-4">
        <summary className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 text-[11px] font-bold text-primary cursor-pointer flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
          غنی‌سازی چه داده‌هایی تولید می‌کند؟
        </summary>
        <div className="bg-primary/5 border border-primary/15 border-t-0 rounded-b-xl px-4 py-3">
          <div className="grid grid-cols-3 gap-2">
            {ENRICH_FIELDS.map((f) => (
              <div key={f.key} className="flex items-start gap-1.5 text-[10px]">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary shrink-0 mt-0.5"><path d="M20 6L9 17l-5-5" /></svg>
                <div>
                  <span className="font-bold text-foreground">{f.label}</span>
                  <span className="text-muted"> — {f.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-primary/10 text-[9px] text-muted">
            منبع: دانش AI بر اساس مشخصات فنی و قیمت خودرو. برای دقت بیشتر، از منابع واقعی (صفحه منابع) استفاده و سپس ترکیب کنید.
          </div>
        </div>
      </details>

      {/* ─── Progress + Filters ─── */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black">پیشرفت</span>
              <span className={`text-sm font-black ${completePct >= 70 ? "text-emerald-600" : completePct >= 40 ? "text-amber-600" : "text-red-500"}`}>
                {toPersianDigits(completePct)}٪
              </span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${completePct >= 70 ? "bg-emerald-500" : completePct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${completePct}%` }}
              />
            </div>
          </div>
          <div className="flex gap-3 text-center shrink-0">
            <div>
              <div className="text-base font-black">{toPersianDigits(stats.total)}</div>
              <div className="text-[8px] text-muted">کل</div>
            </div>
            <div>
              <div className="text-base font-black text-emerald-600">{toPersianDigits(stats.complete)}</div>
              <div className="text-[8px] text-muted">کامل</div>
            </div>
            <div>
              <div className="text-base font-black text-red-500">{toPersianDigits(stats.needs)}</div>
              <div className="text-[8px] text-muted">ناقص</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5">
          {([
            { key: "all" as Filter, label: "همه", count: stats.total },
            { key: "needs" as Filter, label: "ناقص", count: stats.needs },
            { key: "complete" as Filter, label: "کامل", count: stats.complete },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition-all ${
                filter === f.key ? "bg-primary text-white border-primary" : "bg-background border-border text-muted"
              }`}
            >
              {f.label} {toPersianDigits(f.count)}
            </button>
          ))}
        </div>
      </div>

      {/* Batch progress */}
      {batchRunning && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold truncate">{batchProgress.current}</div>
            <div className="h-1 bg-border rounded-full overflow-hidden mt-1">
              <div className="h-full bg-primary rounded-full" style={{ width: `${batchProgress.total > 0 ? (batchProgress.done / batchProgress.total) * 100 : 0}%` }} />
            </div>
          </div>
          <span className="text-[10px] text-muted shrink-0">{toPersianDigits(batchProgress.done)}/{toPersianDigits(batchProgress.total)}</span>
        </div>
      )}

      {/* ─── Car List (compact) ─── */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {sorted.map((car, idx) => {
          const filled = getFilledCount(car);
          const needs = needsWork(car);
          const isEnriching = enrichingId === car.id;
          const isExpanded = expandedId === car.id;
          const justEnriched = justEnrichedIds.has(car.id);

          const dots = [
            { ok: car.hasDescription, tip: "توصیف" },
            { ok: car.hasRichIntel, tip: "تحلیل" },
            { ok: car.prosCount >= 3, tip: "قوت" },
            { ok: car.reviewCount >= 3, tip: "نظر" },
            { ok: car.satisfaction > 0, tip: "رضایت" },
          ];

          return (
            <div key={car.id} className={`${idx > 0 ? "border-t border-border" : ""} ${justEnriched ? "bg-emerald-500/5" : ""}`}>
              <div
                className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-background/30"
                onClick={() => setExpandedId(isExpanded ? null : car.id)}
              >
                {/* 5 dots */}
                <div className="flex gap-0.5 shrink-0" title={dots.map((d) => `${d.ok ? "+" : "-"}${d.tip}`).join(" ")}>
                  {dots.map((d, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${d.ok ? "bg-emerald-500" : "bg-red-400/40"}`} />
                  ))}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-[11px] font-bold truncate">{car.nameFa}</span>
                  <span className="text-[9px] text-muted">{car.brandFa}</span>
                  {justEnriched && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600 shrink-0"><path d="M20 6L9 17l-5-5" /></svg>
                  )}
                </div>

                {/* Origin badge */}
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${ORIGIN_COLORS[car.origin] || "bg-background text-muted"}`}>
                  {getOriginLabel(car.origin)}
                </span>

                {/* Score */}
                <span className={`text-[10px] font-black w-6 text-center shrink-0 ${
                  filled >= 4 ? "text-emerald-600" : filled >= 2 ? "text-amber-600" : "text-red-500"
                }`}>
                  {toPersianDigits(filled)}/۵
                </span>

                {/* Action — only show for partial (1-4) or complete (rebuild) */}
                {filled > 0 ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); enrichSingle(car.id); }}
                    disabled={isEnriching || batchRunning}
                    className="px-2 py-1 text-[9px] font-bold rounded-lg shrink-0 disabled:opacity-40 bg-background text-muted hover:text-primary"
                  >
                    {isEnriching ? (
                      <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : "بازسازی"}
                  </button>
                ) : (
                  // 0/5 — no individual button, use batch
                  <div className="w-[52px] shrink-0" />
                )}

                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted/30 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-border/50 bg-background/30 px-3 py-2">
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                    {[
                      { label: "توصیف", ok: car.hasDescription, detail: car.hasDescription ? "دارد" : "AI تولید می‌کند" },
                      { label: "تحلیل هوشمند", ok: car.hasRichIntel, detail: car.hasRichIntel ? "جمع‌بندی + چرا بخری/نخری" : "AI تولید می‌کند" },
                      { label: `قوت (${toPersianDigits(car.prosCount)})`, ok: car.prosCount >= 3, detail: car.prosCount >= 3 ? "کافی" : `→ AI تا ۵ اضافه` },
                      { label: `نظر (${toPersianDigits(car.reviewCount)})`, ok: car.reviewCount >= 3, detail: car.reviewCount >= 3 ? "کافی" : `→ AI ۲ نظر اضافه` },
                      { label: "رضایت", ok: car.satisfaction > 0, detail: car.satisfaction > 0 ? `${toPersianDigits(car.satisfaction)}/۱۰` : "AI تخمین" },
                      { label: "خرابی+هشدار", ok: car.hasRichIntel, detail: car.hasRichIntel ? "دارد" : "AI ۳+۲ تولید" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1 text-[9px]">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.ok ? "bg-emerald-500" : "bg-red-400"}`} />
                        <span className="font-bold">{item.label}</span>
                        <span className="text-muted">{item.detail}</span>
                      </div>
                    ))}
                  </div>

                  {needs && filled === 0 && (
                    <button
                      onClick={() => enrichSingle(car.id)}
                      disabled={isEnriching || batchRunning}
                      className="mt-2 px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg disabled:opacity-40 flex items-center gap-1"
                    >
                      {isEnriching ? (
                        <><div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" /></>
                      ) : (
                        <><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> غنی‌سازی این خودرو</>
                      )}
                    </button>
                  )}

                  {justEnriched && (
                    <div className="mt-2 pt-1.5 border-t border-border/50 text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                      غنی‌سازی اعمال شد
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Enrich Preview Modal ─── */}
      {enrichPreview && (() => {
        const FIELD_LABELS: Record<string, string> = {
          description: "توصیف خودرو", overallSummary: "جمع‌بندی کلی", whyBuy: "چرا بخری",
          whyNotBuy: "چرا نخری", ownerVerdict: "نظر مالکان",
          frequentPros: "نقاط قوت", frequentCons: "نقاط ضعف",
          commonIssues: "خرابی‌های رایج", purchaseWarnings: "هشدارهای خرید",
          ownerSatisfaction: "رضایت مالکان", purchaseRisk: "ریسک خرید", reviews: "نظرات",
        };

        const entries = Object.entries(enrichPreview.generated);
        const changedEntries = entries.filter(([, v]) => v.changed);

        return (
          <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => !applyingEnrich && setEnrichPreview(null)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl z-50 shadow-2xl w-[800px] max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-black">پیش‌نمایش غنی‌سازی — {enrichPreview.nameFa}</h3>
                    <p className="text-[10px] text-muted flex items-center gap-1.5">
                      <span>منبع:</span>
                      <span className="bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-bold text-[8px]">{enrichPreview.source}</span>
                      <span>·</span>
                      <span className="font-bold text-foreground">{toPersianDigits(enrichPreview.changedFields)} فیلد تغییر</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setEnrichPreview(null)} disabled={applyingEnrich} className="w-7 h-7 rounded-lg hover:bg-background text-muted hover:text-foreground flex items-center justify-center disabled:opacity-30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
                {/* Source warning */}
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2 flex items-start gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 shrink-0 mt-0.5">
                    <path d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 004.99 19z" />
                  </svg>
                  <div className="text-[10px] text-muted leading-5">
                    <span className="font-bold text-amber-600">توجه:</span> این داده‌ها از <span className="font-bold">دانش عمومی AI</span> تولید شدن (نه از منابع واقعی).
                    برای دقت بیشتر، از صفحه «منابع» متن واقعی اضافه و پردازش کنید.
                  </div>
                </div>

                {/* Changed fields */}
                {changedEntries.map(([key, diff]) => {
                  const label = FIELD_LABELS[key] || key;
                  const isArray = Array.isArray(diff.new);
                  const isNumber = typeof diff.new === "number";
                  const hasOld = isArray ? (diff.old as string[]).length > 0 : isNumber ? (diff.old as number) > 0 : !!(diff.old as string);

                  return (
                    <div key={key} className={`rounded-xl border p-3 ${hasOld ? "bg-amber-500/3 border-amber-500/15" : "bg-emerald-500/3 border-emerald-500/15"}`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-black text-foreground">{label}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${hasOld ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}>
                          {hasOld ? "جایگزین" : "جدید"}
                        </span>
                      </div>

                      {/* Text fields */}
                      {typeof diff.new === "string" && (
                        <div className="space-y-1.5">
                          {hasOld && (
                            <div className="bg-background/50 rounded-lg px-2.5 py-1.5">
                              <div className="text-[8px] text-muted mb-0.5">قبل</div>
                              <p className="text-[10px] leading-5 text-muted/70 line-clamp-2">{diff.old as string}</p>
                            </div>
                          )}
                          <div className={`rounded-lg px-2.5 py-1.5 ${hasOld ? "bg-emerald-500/5" : ""}`}>
                            {hasOld && <div className="text-[8px] text-emerald-600 font-bold mb-0.5">بعد</div>}
                            <p className="text-[10px] leading-5 text-foreground">{diff.new as string}</p>
                          </div>
                        </div>
                      )}

                      {/* Array fields */}
                      {isArray && (
                        <div className="space-y-1">
                          {(diff.old as string[]).length > 0 && (
                            <div className="bg-background/50 rounded-lg px-2.5 py-1.5">
                              <div className="text-[8px] text-muted mb-0.5">قبل ({toPersianDigits((diff.old as string[]).length)})</div>
                              <div className="flex flex-wrap gap-1">
                                {(diff.old as string[]).map((item, i) => (
                                  <span key={i} className="text-[9px] text-muted/70 bg-muted/10 px-1.5 py-0.5 rounded line-clamp-1">{item}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className={`rounded-lg px-2.5 py-1.5 ${hasOld ? "bg-emerald-500/5" : ""}`}>
                            {hasOld && <div className="text-[8px] text-emerald-600 font-bold mb-0.5">بعد ({toPersianDigits((diff.new as string[]).length)})</div>}
                            <div className="space-y-0.5">
                              {(diff.new as string[]).map((item, i) => (
                                <div key={i} className="flex items-start gap-1 text-[10px] leading-5">
                                  <span className="text-emerald-600 font-bold shrink-0">+</span>
                                  <span className="text-foreground">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Number fields */}
                      {isNumber && (
                        <div className="flex items-center gap-2 text-[11px]">
                          {hasOld && (
                            <>
                              <span className="text-muted">{toPersianDigits(diff.old as number)}</span>
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/50"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </>
                          )}
                          <span className="font-black text-foreground">{toPersianDigits(diff.new as number)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-background/30">
                <button
                  onClick={() => setEnrichPreview(null)}
                  disabled={applyingEnrich}
                  className="px-4 py-2 text-[11px] font-bold text-muted hover:text-foreground disabled:opacity-30"
                >
                  انصراف
                </button>
                <div className="mr-auto flex items-center gap-2">
                  <span className="text-[9px] text-amber-600 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 004.99 19z" />
                    </svg>
                    از دانش AI — نه منابع واقعی
                  </span>
                  <button
                    onClick={applyEnrich}
                    disabled={applyingEnrich}
                    className="px-4 py-2 bg-primary text-white text-[11px] font-bold rounded-xl disabled:opacity-40 flex items-center gap-1.5 shadow-sm shadow-primary/20"
                  >
                    {applyingEnrich ? (
                      <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> در حال ذخیره...</>
                    ) : (
                      <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg> تایید و اعمال</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}
