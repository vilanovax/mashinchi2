"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "./layout";

interface Stats {
  totalCars: number;
  totalUsers: number;
  totalInteractions: number;
  totalFavorites: number;
  totalReviews: number;
  topLikedCars: { carId: string; nameFa: string; brandFa: string; likes: number }[];
  userTypes: { key: string; label: string; count: number }[];
  pipeline: { totalSources: number; pending: number; processed: number; approved: number };
  dataHealth: { carsWithIntel: number; carsWithScores: number; carsWithSources: number; carsWithPrices: number; carsWithImage: number };
  topCarsWithSources: { carId: string; nameFa: string; count: number }[];
  carsNeedingData: { carId: string; nameFa: string; count: number }[];
  recentActivity: { action: string; entityType: string; entityId: string; details: string | null; createdAt: string }[];
}

const ACTION_LABELS: Record<string, string> = {
  create: "ایجاد", update: "بروزرسانی", delete: "حذف",
};
const ENTITY_LABELS: Record<string, string> = {
  car: "خودرو", source: "منبع", review: "نظر", price: "قیمت", admin: "ادمین", settings: "تنظیمات",
};

export default function AdminDashboard() {
  const { fetchAdmin } = useAdmin();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadStats = () => {
    fetchAdmin("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); setLastRefresh(new Date()); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 120000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return <div className="p-8 text-muted">خطا در بارگذاری</div>;

  const pipeline = stats.pipeline;
  const health = stats.dataHealth;
  const pipelineTotal = pipeline.pending + pipeline.processed + pipeline.approved;

  // Only show sections that have data
  const hasActivity = stats.recentActivity.length > 0;
  const hasLikedCars = stats.topLikedCars.length > 0;
  const hasUserTypes = stats.userTypes.some((t) => t.count > 0);
  const hasTopSources = stats.topCarsWithSources.length > 0;

  return (
    <div className="p-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-black">مرکز فرماندهی</h1>
          <p className="text-[10px] text-muted">
            {lastRefresh.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <button onClick={loadStats} className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/5 transition-colors" title="بروزرسانی">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
      </div>

      {/* ─── Row 1: Hero — Stats + Pipeline ─── */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-3">
        <div className="flex items-start gap-4">
          {/* Inline stats */}
          <div className="flex gap-2 shrink-0">
            {[
              { label: "خودرو", value: stats.totalCars, color: "text-primary" },
              { label: "کاربر", value: stats.totalUsers, color: "text-foreground" },
              { label: "نظر", value: stats.totalReviews, color: "text-foreground" },
              { label: "علاقه", value: stats.totalFavorites, color: "text-foreground" },
            ].map((s) => (
              <div key={s.label} className="bg-background rounded-xl px-3 py-2 text-center min-w-[60px]">
                <div className={`text-lg font-black leading-tight ${s.color}`}>{toPersianDigits(s.value)}</div>
                <div className="text-[9px] text-muted">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px bg-border self-stretch" />

          {/* Pipeline */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-black flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                خط پردازش
              </h2>
              <button onClick={() => router.push("/admin/sources")} className="text-[9px] text-primary font-bold">مشاهده ←</button>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              {[
                { label: "در صف", value: pipeline.pending, color: "text-amber-600", bg: "bg-amber-500/8" },
                { label: "پردازش‌شده", value: pipeline.processed, color: "text-primary", bg: "bg-primary/8" },
                { label: "تایید‌شده", value: pipeline.approved, color: "text-emerald-600", bg: "bg-emerald-500/8" },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-1.5 flex-1">
                  <div className={`flex-1 ${step.bg} rounded-lg px-2 py-1.5 text-center`}>
                    <span className={`text-sm font-black ${step.color}`}>{toPersianDigits(step.value)}</span>
                    <span className="text-[8px] text-muted mr-1">{step.label}</span>
                  </div>
                  {i < 2 && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/30 shrink-0">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>

            {/* Pipeline bar */}
            {pipelineTotal > 0 && (
              <div className="h-1.5 rounded-full bg-background overflow-hidden flex">
                {pipeline.approved > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(pipeline.approved / pipelineTotal) * 100}%` }} />}
                {pipeline.processed > 0 && <div className="bg-primary h-full" style={{ width: `${(pipeline.processed / pipelineTotal) * 100}%` }} />}
                {pipeline.pending > 0 && <div className="bg-amber-500 h-full" style={{ width: `${(pipeline.pending / pipelineTotal) * 100}%` }} />}
              </div>
            )}

            {/* Action chips */}
            {(pipeline.pending > 0 || pipeline.processed > 0) && (
              <div className="flex gap-1.5 mt-2">
                {pipeline.pending > 0 && (
                  <button onClick={() => router.push("/admin/sources")} className="text-[9px] font-bold px-2 py-1 bg-amber-500/10 text-amber-600 rounded-lg">
                    {toPersianDigits(pipeline.pending)} در صف ←
                  </button>
                )}
                {pipeline.processed > 0 && (
                  <button onClick={() => router.push("/admin/sources")} className="text-[9px] font-bold px-2 py-1 bg-primary/10 text-primary rounded-lg">
                    {toPersianDigits(pipeline.processed)} آماده ترکیب ←
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Quick Actions (horizontal chips with pending-work badges) ─── */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span className="text-[9px] text-muted font-bold ml-1">دسترسی سریع:</span>
        {[
          {
            label: "افزودن خودرو",
            path: "/admin/import",
            icon: "M12 4v16m8-8H4",
            pending: 0,
          },
          {
            label: "افزودن منبع",
            path: "/admin/sources",
            icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7",
            pending: Math.max(0, stats.totalCars - health.carsWithSources),
          },
          {
            label: "ثبت قیمت",
            path: "/admin/prices",
            icon: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z",
            pending: Math.max(0, stats.totalCars - health.carsWithPrices),
          },
          {
            label: "تصاویر",
            path: "/admin/cars/images",
            icon: "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 8.5a2 2 0 100-4 2 2 0 000 4zM21 15l-5-5L5 21",
            pending: Math.max(0, stats.totalCars - health.carsWithImage),
          },
          {
            label: "تولید AI",
            path: "/admin/ai",
            icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
            pending: 0,
          },
          {
            label: "سلامت دیتا",
            path: "/admin/data-health",
            icon: "M9 12l2 2 4-4",
            pending: 0,
          },
        ].map((a) => {
          const urgent = a.pending > 0;
          return (
            <button
              key={a.label}
              onClick={() => router.push(a.path)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors border ${
                urgent
                  ? "bg-red-500/5 border-red-500/20 text-red-600 hover:bg-red-500/10"
                  : "bg-surface border-border text-muted hover:text-primary hover:border-primary/30"
              }`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={a.icon} />
              </svg>
              {a.label}
              {urgent && (
                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                  {toPersianDigits(a.pending)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Row 2: Data Health + Needs Attention ─── */}
      <div className="grid grid-cols-5 gap-3 mb-3">
        {/* Data Health - 3 cols */}
        <div className="col-span-3 bg-surface rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-black flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              پوشش دیتا
            </h2>
            <button onClick={() => router.push("/admin/data-health")} className="text-[9px] text-primary font-bold">جزئیات ←</button>
          </div>

          <div className="space-y-1.5">
            {[
              { label: "Intel",  have: health.carsWithIntel,   total: stats.totalCars, path: "/admin/enrich",     cta: "غنی‌سازی" },
              { label: "امتیاز", have: health.carsWithScores,  total: stats.totalCars, path: "/admin/scoring",    cta: "ویرایش" },
              { label: "منابع",  have: health.carsWithSources, total: stats.totalCars, path: "/admin/sources",    cta: "افزودن" },
              { label: "قیمت",   have: health.carsWithPrices,  total: stats.totalCars, path: "/admin/prices",     cta: "ثبت قیمت" },
              { label: "تصویر",  have: health.carsWithImage,   total: stats.totalCars, path: "/admin/cars/images", cta: "آپلود" },
            ].map((d) => {
              const pct = d.total > 0 ? Math.round((d.have / d.total) * 100) : 0;
              const critical = pct < 10;
              const barColor = critical ? "bg-red-500" : pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : pct >= 20 ? "bg-orange-500" : "bg-red-500";
              const textColor = critical ? "text-red-500" : pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500";
              return (
                <div key={d.label} className={`flex items-center gap-2.5 ${critical ? "bg-red-500/5 border border-red-500/20 rounded-lg px-2 py-1.5" : ""}`}>
                  <span className={`text-[10px] w-10 shrink-0 ${critical ? "font-black text-red-500" : "text-muted"}`}>{d.label}</span>
                  {critical && (
                    <span className="text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full shrink-0">بحرانی</span>
                  )}
                  <div className="flex-1 h-2 rounded-full bg-background overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <span className={`text-[10px] font-black w-10 text-left ${textColor}`}>{toPersianDigits(pct)}٪</span>
                  <span className="text-[8px] text-muted/60 w-12 text-left">{toPersianDigits(d.have)}/{toPersianDigits(d.total)}</span>
                  <button
                    onClick={() => router.push(d.path)}
                    className={`text-[9px] font-bold px-2 py-1 rounded-md shrink-0 transition-colors ${
                      critical
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-background hover:bg-primary/10 text-primary"
                    }`}
                  >
                    {d.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Needs Attention - 2 cols */}
        <div className="col-span-2 bg-surface rounded-2xl border border-border p-4 flex flex-col">
          <h2 className="text-[11px] font-black flex items-center gap-1 mb-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
              <path d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 004.99 19z" />
            </svg>
            نیازمند توجه
          </h2>
          <div className="space-y-1">
            {stats.carsNeedingData.map((c) => (
              <div
                key={c.carId}
                className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-red-500/5 transition-colors"
              >
                <button
                  onClick={() => router.push(`/admin/cars/${c.carId}/data`)}
                  className="flex-1 flex items-center justify-between text-right min-w-0"
                >
                  <span className="text-[10px] font-bold text-foreground truncate">{c.nameFa}</span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    c.count === 0 ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-600"
                  }`}>
                    {c.count === 0 ? "بدون منبع" : `${toPersianDigits(c.count)} منبع`}
                  </span>
                </button>
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => router.push(`/admin/cars/${c.carId}/data`)}
                    title="افزودن منبع"
                    className="w-5 h-5 rounded bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                  <button
                    onClick={() => router.push(`/admin/cars/${c.carId}`)}
                    title="ویرایش خودرو"
                    className="w-5 h-5 rounded bg-background hover:bg-muted/20 text-muted flex items-center justify-center"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                </div>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted/40 shrink-0 group-hover:opacity-0 transition-opacity"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── Row 3: Activity + Rankings (conditional) ─── */}
      {(hasActivity || hasLikedCars || hasUserTypes || hasTopSources) && (
      <div className={`grid gap-3 ${hasActivity ? "grid-cols-3" : "grid-cols-2"}`}>

        {/* Recent Activity (only if has data) */}
        {hasActivity && (
          <div className={`bg-surface rounded-2xl border border-border p-4 ${hasLikedCars || hasUserTypes || hasTopSources ? "col-span-2" : "col-span-3"}`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-black flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                فعالیت اخیر
              </h2>
              <button onClick={() => router.push("/admin/audit")} className="text-[9px] text-primary font-bold">لاگ کامل ←</button>
            </div>
            <div className="space-y-0.5">
              {stats.recentActivity.map((a, i) => {
                const actionLabel = ACTION_LABELS[a.action] || a.action;
                const entityLabel = ENTITY_LABELS[a.entityType] || a.entityType;
                const time = new Date(a.createdAt);
                const timeStr = time.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
                const dateStr = time.toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
                let detail = "";
                if (a.details) {
                  try { const d = JSON.parse(a.details); detail = d.nameFa || d.carName || d.action || ""; } catch { detail = ""; }
                }

                return (
                  <div key={i} className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-background/50">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      a.action === "create" ? "bg-emerald-500" : a.action === "delete" ? "bg-red-500" : "bg-primary"
                    }`} />
                    <span className="text-[10px] text-foreground flex-1 truncate">
                      <span className="font-bold">{actionLabel}</span> {entityLabel}
                      {detail && <span className="text-muted"> · {detail}</span>}
                    </span>
                    <span className="text-[8px] text-muted/50 shrink-0">{dateStr} {timeStr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unified Stats & Distribution card */}
        {(hasLikedCars || hasUserTypes || hasTopSources) && (
          <div className="bg-surface rounded-2xl border border-border p-4">
            <h2 className="text-[11px] font-black flex items-center gap-1 mb-3 text-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18M7 16l4-8 4 4 4-6" />
              </svg>
              آمار و توزیع
            </h2>

            <div className="space-y-3">
              {/* Top Sources */}
              {hasTopSources && (
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                      <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1" />
                    </svg>
                    <h3 className="text-[10px] font-black">بیشترین منابع</h3>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {stats.topCarsWithSources.slice(0, 5).map((c, i) => (
                      <button
                        key={c.carId}
                        onClick={() => router.push(`/admin/cars/${c.carId}/data`)}
                        className="text-[9px] bg-background hover:bg-primary/5 rounded-full px-2 py-0.5 flex items-center gap-1 transition-colors"
                      >
                        <span className="font-bold text-muted">{toPersianDigits(i + 1)}.</span>
                        <span>{c.nameFa}</span>
                        <span className="text-primary font-black">{toPersianDigits(c.count)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Most Liked */}
              {hasLikedCars && (
                <div>
                  {hasTopSources && <div className="border-t border-border/50 -mx-1 mb-3" />}
                  <div className="flex items-center gap-1 mb-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-danger">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <h3 className="text-[10px] font-black">محبوب‌ترین</h3>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {stats.topLikedCars.slice(0, 5).map((car, i) => (
                      <span key={car.carId} className="text-[9px] bg-background rounded-full px-2 py-0.5 flex items-center gap-1">
                        <span className="font-bold text-muted">{toPersianDigits(i + 1)}.</span>
                        <span>{car.nameFa}</span>
                        <span className="text-danger font-black">{toPersianDigits(car.likes)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Buyer Types */}
              {hasUserTypes && (
                <div>
                  {(hasTopSources || hasLikedCars) && <div className="border-t border-border/50 -mx-1 mb-3" />}
                  <div className="flex items-center gap-1 mb-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-500">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8" />
                    </svg>
                    <h3 className="text-[10px] font-black">تیپ خریداران</h3>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {stats.userTypes.filter((t) => t.count > 0).slice(0, 5).map((type) => (
                      <span key={type.key} className="text-[9px] bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full px-2 py-0.5 font-bold">
                        {type.label} ({toPersianDigits(type.count)})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}

    </div>
  );
}
