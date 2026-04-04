"use client";

import { useState, useEffect } from "react";
import { toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";
import { useAdmin } from "../layout";

interface AnalyticsData {
  funnel: { totalUsers: number; usersWithBudget: number; usersWithInteractions: number; usersWithProfile: number; usersWithFavorites: number };
  dailyData: { date: string; likes: number; skips: number; favorites: number }[];
  originDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  budgetDistribution: { label: string; count: number }[];
}

export default function AdminAnalyticsPage() {
  const { fetchAdmin } = useAdmin();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmin("/api/admin/analytics").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="p-8 text-muted">خطا</div>;

  const f = data.funnel;
  const funnelSteps = [
    { label: "کل کاربران", value: f.totalUsers, color: "bg-primary" },
    { label: "تعیین بودجه", value: f.usersWithBudget, color: "bg-blue-500" },
    { label: "شروع بررسی", value: f.usersWithInteractions, color: "bg-violet-500" },
    { label: "تکمیل پروفایل", value: f.usersWithProfile, color: "bg-accent" },
    { label: "نشان‌گذاری", value: f.usersWithFavorites, color: "bg-danger" },
  ];

  const maxDaily = Math.max(...data.dailyData.map((d) => d.likes + d.skips), 1);
  const maxOrigin = Math.max(...Object.values(data.originDistribution), 1);
  const maxCat = Math.max(...Object.values(data.categoryDistribution), 1);
  const maxBudget = Math.max(...data.budgetDistribution.map((b) => b.count), 1);

  return (
    <div className="p-6">
      <h1 className="text-xl font-black mb-6">تحلیل و آمار</h1>

      {/* Funnel */}
      <div className="bg-surface rounded-2xl border border-border p-5 mb-5">
        <h2 className="text-sm font-black mb-4">فانل کاربران</h2>
        <div className="space-y-3">
          {funnelSteps.map((step, i) => {
            const pct = f.totalUsers > 0 ? (step.value / f.totalUsers) * 100 : 0;
            const prevValue = i > 0 ? funnelSteps[i - 1].value : step.value;
            const dropRate = prevValue > 0 ? Math.round(((prevValue - step.value) / prevValue) * 100) : 0;
            return (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{step.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">{toPersianDigits(step.value)}</span>
                    <span className="text-[10px] text-muted">({toPersianDigits(Math.round(pct))}%)</span>
                    {i > 0 && dropRate > 0 && (
                      <span className="text-[9px] text-danger">-{toPersianDigits(dropRate)}%</span>
                    )}
                  </div>
                </div>
                <div className="h-3 bg-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${step.color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Daily Activity */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <h2 className="text-sm font-black mb-4">فعالیت روزانه (۱۴ روز اخیر)</h2>
          {data.dailyData.length > 0 ? (
            <div className="space-y-1.5">
              {data.dailyData.map((d) => (
                <div key={d.date} className="flex items-center gap-2">
                  <span className="text-[9px] text-muted w-16 shrink-0">{new Date(d.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" })}</span>
                  <div className="flex-1 flex gap-0.5 h-3">
                    <div className="bg-accent rounded-sm" style={{ width: `${(d.likes / maxDaily) * 100}%` }} title={`لایک: ${d.likes}`} />
                    <div className="bg-muted/30 rounded-sm" style={{ width: `${(d.skips / maxDaily) * 100}%` }} title={`اسکیپ: ${d.skips}`} />
                  </div>
                  <span className="text-[9px] text-muted w-8 text-left">{toPersianDigits(d.likes + d.skips)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted">داده‌ای نیست</p>}
        </div>

        {/* Budget Distribution */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <h2 className="text-sm font-black mb-4">توزیع بودجه</h2>
          <div className="space-y-2.5">
            {data.budgetDistribution.map((b) => (
              <div key={b.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs">{b.label}</span>
                  <span className="text-xs font-bold">{toPersianDigits(b.count)}</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(b.count / maxBudget) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Origin Distribution */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <h2 className="text-sm font-black mb-4">مبدا ماشین‌های پسندیده</h2>
          <div className="space-y-2">
            {Object.entries(data.originDistribution).sort(([,a],[,b]) => b - a).map(([origin, count]) => (
              <div key={origin} className="flex items-center gap-2">
                <span className="text-xs w-16 shrink-0">{getOriginLabel(origin)}</span>
                <div className="flex-1 h-2.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(count / maxOrigin) * 100}%` }} />
                </div>
                <span className="text-xs font-bold w-6 text-left">{toPersianDigits(count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <h2 className="text-sm font-black mb-4">دسته ماشین‌های پسندیده</h2>
          <div className="space-y-2">
            {Object.entries(data.categoryDistribution).sort(([,a],[,b]) => b - a).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-xs w-20 shrink-0">{getCategoryLabel(cat)}</span>
                <div className="flex-1 h-2.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(count / maxCat) * 100}%` }} />
                </div>
                <span className="text-xs font-bold w-6 text-left">{toPersianDigits(count)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
