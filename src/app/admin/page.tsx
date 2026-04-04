"use client";

import { useState, useEffect } from "react";
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

export default function AdminDashboard() {
  const { fetchAdmin } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmin("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
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

  const statCards = [
    { label: "خودرو", value: stats.totalCars, color: "text-primary", bg: "bg-primary/10" },
    { label: "کاربر", value: stats.totalUsers, color: "text-accent", bg: "bg-accent/10" },
    { label: "تعامل", value: stats.totalInteractions, color: "text-foreground", bg: "bg-background" },
    { label: "نشان‌شده", value: stats.totalFavorites, color: "text-danger", bg: "bg-danger/10" },
    { label: "نظر", value: stats.totalReviews, color: "text-amber-600", bg: "bg-amber-500/10" },
  ];

  const maxTypeCount = Math.max(...stats.userTypes.map((t) => t.count), 1);

  return (
    <div className="p-6">
      <h1 className="text-xl font-black mb-6">داشبورد</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <div className={`text-2xl font-black ${s.color}`}>{toPersianDigits(s.value)}</div>
            <div className="text-xs text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Liked Cars */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <h2 className="text-sm font-black mb-4">محبوب‌ترین خودروها</h2>
          <div className="space-y-2">
            {stats.topLikedCars.map((car, i) => (
              <div key={car.carId} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                  {toPersianDigits(i + 1)}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold truncate block">{car.nameFa}</span>
                  <span className="text-[10px] text-muted">{car.brandFa}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-danger">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <span className="text-xs font-bold">{toPersianDigits(car.likes)}</span>
                </div>
              </div>
            ))}
            {stats.topLikedCars.length === 0 && <p className="text-xs text-muted">هنوز داده‌ای نیست</p>}
          </div>
        </div>

        {/* User Type Distribution */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <h2 className="text-sm font-black mb-4">توزیع تیپ خریداران</h2>
          <div className="space-y-2.5">
            {stats.userTypes.map((type) => (
              <div key={type.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{type.label}</span>
                  <span className="text-[10px] text-muted">{toPersianDigits(type.count)} کاربر</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(type.count / maxTypeCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {stats.userTypes.length === 0 && <p className="text-xs text-muted">هنوز داده‌ای نیست</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
