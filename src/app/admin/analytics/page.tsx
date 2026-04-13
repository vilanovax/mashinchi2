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
  const hasUsers = f.totalUsers > 0;
  const hasDaily = data.dailyData.some((d) => d.likes + d.skips > 0);
  const hasOrigin = Object.values(data.originDistribution).some((v) => v > 0);
  const hasCat = Object.values(data.categoryDistribution).some((v) => v > 0);
  const hasBudget = data.budgetDistribution.some((b) => b.count > 0);

  const funnelSteps = [
    { label: "کل کاربران", value: f.totalUsers, icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8" },
    { label: "تعیین بودجه", value: f.usersWithBudget, icon: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" },
    { label: "بررسی", value: f.usersWithInteractions, icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7" },
    { label: "پروفایل", value: f.usersWithProfile, icon: "M9 12l2 2 4-4" },
    { label: "نشان‌گذاری", value: f.usersWithFavorites, icon: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" },
  ];

  const maxDaily = Math.max(...data.dailyData.map((d) => d.likes + d.skips), 1);
  const maxBudget = Math.max(...data.budgetDistribution.map((b) => b.count), 1);

  return (
    <div className="p-5">
      <h1 className="text-lg font-black mb-4">تحلیل و آمار</h1>

      {/* ─── Funnel: horizontal compact ─── */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-3">
        <h2 className="text-[11px] font-black text-muted mb-3">فانل کاربران</h2>
        {hasUsers ? (
          <div className="flex items-end gap-1">
            {funnelSteps.map((step, i) => {
              const pct = f.totalUsers > 0 ? (step.value / f.totalUsers) * 100 : 0;
              const prevValue = i > 0 ? funnelSteps[i - 1].value : step.value;
              const dropRate = prevValue > 0 && i > 0 ? Math.round(((prevValue - step.value) / prevValue) * 100) : 0;
              const barH = Math.max(pct * 0.8, 4);

              return (
                <div key={step.label} className="flex-1 text-center">
                  {/* Drop rate arrow */}
                  {i > 0 && dropRate > 0 && (
                    <div className="text-[8px] text-red-500 font-bold mb-0.5">-{toPersianDigits(dropRate)}٪</div>
                  )}
                  {i === 0 && <div className="h-3" />}
                  {/* Bar */}
                  <div className="mx-auto w-full max-w-[60px] bg-background rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: "80px" }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        i === 0 ? "bg-primary" : i === funnelSteps.length - 1 ? "bg-danger" : "bg-primary/60"
                      }`}
                      style={{ height: `${barH}%` }}
                    />
                  </div>
                  {/* Value */}
                  <div className="text-sm font-black mt-1">{toPersianDigits(step.value)}</div>
                  <div className="text-[8px] text-muted">{step.label}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="هنوز کاربری ثبت نشده" />
        )}
      </div>

      {/* ─── Row 2: Daily + Budget ─── */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Daily Activity */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <h2 className="text-[11px] font-black text-muted mb-2">فعالیت روزانه (۱۴ روز)</h2>
          {hasDaily ? (
            <div className="space-y-1">
              {data.dailyData.map((d) => {
                const total = d.likes + d.skips;
                return (
                  <div key={d.date} className="flex items-center gap-1.5">
                    <span className="text-[8px] text-muted w-12 shrink-0">{new Date(d.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" })}</span>
                    <div className="flex-1 flex gap-px h-2 bg-background rounded overflow-hidden">
                      {d.likes > 0 && <div className="bg-emerald-500 rounded-sm" style={{ width: `${(d.likes / maxDaily) * 100}%` }} />}
                      {d.skips > 0 && <div className="bg-muted/20 rounded-sm" style={{ width: `${(d.skips / maxDaily) * 100}%` }} />}
                    </div>
                    <span className="text-[8px] text-muted w-5 text-left">{toPersianDigits(total)}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 mt-1.5 text-[8px] text-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm inline-block" /> لایک</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-muted/20 rounded-sm inline-block" /> رد</span>
              </div>
            </div>
          ) : (
            <EmptyState text="فعالیتی ثبت نشده" />
          )}
        </div>

        {/* Budget Distribution */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <h2 className="text-[11px] font-black text-muted mb-2">توزیع بودجه</h2>
          {hasBudget ? (
            <div className="space-y-1.5">
              {data.budgetDistribution.map((b) => (
                <div key={b.label} className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted w-20 shrink-0">{b.label}</span>
                  <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(b.count / maxBudget) * 100}%` }} />
                  </div>
                  <span className="text-[9px] font-black w-5 text-left">{toPersianDigits(b.count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="بودجه‌ای ثبت نشده" />
          )}
        </div>
      </div>

      {/* ─── Row 3: Origin + Category ─── */}
      {(hasOrigin || hasCat) && (
        <div className="grid grid-cols-2 gap-3">
          {hasOrigin && (
            <div className="bg-surface rounded-2xl border border-border p-4">
              <h2 className="text-[11px] font-black text-muted mb-2">مبدا پسندیده‌ها</h2>
              <div className="space-y-1.5">
                {Object.entries(data.originDistribution).sort(([,a],[,b]) => b - a).filter(([,v]) => v > 0).map(([origin, count]) => {
                  const maxO = Math.max(...Object.values(data.originDistribution), 1);
                  return (
                    <div key={origin} className="flex items-center gap-1.5">
                      <span className="text-[9px] w-14 shrink-0">{getOriginLabel(origin)}</span>
                      <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${(count / maxO) * 100}%` }} />
                      </div>
                      <span className="text-[9px] font-black w-5 text-left">{toPersianDigits(count)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {hasCat && (
            <div className="bg-surface rounded-2xl border border-border p-4">
              <h2 className="text-[11px] font-black text-muted mb-2">دسته پسندیده‌ها</h2>
              <div className="space-y-1.5">
                {Object.entries(data.categoryDistribution).sort(([,a],[,b]) => b - a).filter(([,v]) => v > 0).map(([cat, count]) => {
                  const maxC = Math.max(...Object.values(data.categoryDistribution), 1);
                  return (
                    <div key={cat} className="flex items-center gap-1.5">
                      <span className="text-[9px] w-16 shrink-0">{getCategoryLabel(cat)}</span>
                      <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(count / maxC) * 100}%` }} />
                      </div>
                      <span className="text-[9px] font-black w-5 text-left">{toPersianDigits(count)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-6 text-center">
      <p className="text-[10px] text-muted/60">{text}</p>
    </div>
  );
}
