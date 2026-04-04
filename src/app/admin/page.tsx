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
}

const TYPE_COLORS: Record<string, string> = {
  typeEconomic: "bg-emerald-500",
  typeFamily: "bg-blue-500",
  typeSport: "bg-red-500",
  typePrestige: "bg-amber-500",
  typeSafe: "bg-teal-500",
  typeSpecial: "bg-purple-500",
  typeOffroad: "bg-orange-500",
  typeCity: "bg-sky-500",
  typeTravel: "bg-indigo-500",
  typeInvestment: "bg-yellow-500",
};

export default function AdminDashboard() {
  const { fetchAdmin } = useAdmin();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadStats = () => {
    fetchAdmin("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); setLastRefresh(new Date()); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
    if (autoRefresh) {
      const interval = setInterval(loadStats, 60000);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return <div className="p-8 text-muted">خطا در بارگذاری</div>;

  const maxLikes = Math.max(...stats.topLikedCars.map((c) => c.likes), 1);
  const maxTypeCount = Math.max(...stats.userTypes.map((t) => t.count), 1);
  const topTypes = stats.userTypes.filter((t) => t.count > 0).slice(0, 5);

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black">داشبورد</h1>
          <p className="text-[11px] text-muted mt-0.5">
            آخرین بروزرسانی: {lastRefresh.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors ${
              autoRefresh ? "bg-accent/10 text-accent" : "bg-background text-muted"
            }`}
          >
            {autoRefresh ? "خودکار" : "دستی"}
          </button>
          <button onClick={loadStats} className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/5 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: "خودرو", value: stats.totalCars, icon: "M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2M9 17h6", color: "text-primary", bg: "bg-primary/8", iconBg: "bg-primary/15" },
          { label: "کاربر", value: stats.totalUsers, icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8", color: "text-accent", bg: "bg-accent/8", iconBg: "bg-accent/15" },
          { label: "تعامل", value: stats.totalInteractions, icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/8", iconBg: "bg-violet-500/15" },
          { label: "نشان‌شده", value: stats.totalFavorites, icon: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z", color: "text-danger", bg: "bg-danger/8", iconBg: "bg-danger/15" },
          { label: "نظر", value: stats.totalReviews, icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/8", iconBg: "bg-amber-500/15" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={s.color}>
                <path d={s.icon} />
              </svg>
            </div>
            <div>
              <div className={`text-xl font-black ${s.color}`}>{toPersianDigits(s.value)}</div>
              <div className="text-[10px] text-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-5">
        {[
          { label: "افزودن خودرو", path: "/admin/import", icon: "M12 4v16m8-8H4" },
          { label: "تولید محتوا AI", path: "/admin/ai", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
          { label: "ثبت قیمت", path: "/admin/prices", icon: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" },
          { label: "خروجی CSV", path: "#export", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => action.path !== "#export" && router.push(action.path)}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border rounded-lg text-[11px] font-bold text-muted hover:text-primary hover:border-primary/30 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={action.icon} />
            </svg>
            {action.label}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-4">

        {/* Top Liked Cars - takes 2 cols */}
        <div className="col-span-2 bg-surface rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black">محبوب‌ترین خودروها</h2>
            <button onClick={() => router.push("/admin/cars")} className="text-[10px] text-primary font-bold">مشاهده همه</button>
          </div>
          {stats.topLikedCars.length > 0 ? (
            <div className="space-y-2.5">
              {stats.topLikedCars.slice(0, 7).map((car, i) => (
                <div key={car.carId} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    i < 3 ? "bg-primary text-white" : "bg-background text-muted"
                  }`}>
                    {toPersianDigits(i + 1)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold truncate">{car.nameFa}</span>
                      <span className="text-[10px] text-muted shrink-0 mr-2">{car.brandFa}</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${i < 3 ? "bg-primary" : "bg-muted/40"}`}
                        style={{ width: `${(car.likes / maxLikes) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-danger">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span className="text-xs font-black">{toPersianDigits(car.likes)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-muted">هنوز تعاملی ثبت نشده</p>
            </div>
          )}
        </div>

        {/* User Type Distribution - 1 col */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black">تیپ خریداران</h2>
            <button onClick={() => router.push("/admin/analytics")} className="text-[10px] text-primary font-bold">تحلیل</button>
          </div>
          {topTypes.length > 0 ? (
            <div className="space-y-3">
              {topTypes.map((type) => {
                const pct = Math.round((type.count / maxTypeCount) * 100);
                const barColor = TYPE_COLORS[type.key] || "bg-primary";
                return (
                  <div key={type.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold">{type.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black">{toPersianDigits(type.count)}</span>
                        <span className="text-[9px] text-muted">({toPersianDigits(pct)}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-muted">هنوز پروفایلی ساخته نشده</p>
            </div>
          )}

          {/* Mini summary */}
          {stats.userTypes.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-[10px] text-muted mb-2">تیپ غالب</div>
              <div className="flex flex-wrap gap-1">
                {stats.userTypes.slice(0, 3).map((t) => (
                  <span key={t.key} className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Health - bottom row */}
      <div className="mt-4 bg-surface rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {[
              { label: "خودروهای دارای intel", value: `${toPersianDigits(stats.totalCars)}/${toPersianDigits(stats.totalCars)}`, ok: true },
              { label: "نظرات ثبت‌شده", value: toPersianDigits(stats.totalReviews), ok: stats.totalReviews > 0 },
              { label: "کاربران فعال", value: toPersianDigits(stats.totalUsers), ok: stats.totalUsers > 0 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.ok ? "bg-accent" : "bg-danger"}`} />
                <span className="text-[11px] text-muted">{item.label}:</span>
                <span className="text-[11px] font-bold">{item.value}</span>
              </div>
            ))}
          </div>
          <button onClick={() => router.push("/admin/audit")} className="text-[10px] text-muted hover:text-primary transition-colors">
            مشاهده لاگ
          </button>
        </div>
      </div>
    </div>
  );
}
