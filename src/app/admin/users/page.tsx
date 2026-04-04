"use client";

import { useState, useEffect, useMemo } from "react";
import { formatPrice, toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface User {
  id: string; sessionId: string; budget: string | null;
  totalInteractions: number; likes: number; skips: number; favorites: number;
  userTypes: string[]; hasTasteProfile: boolean;
  createdAt: string; updatedAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  "اقتصادی": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "خانوادگی": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "اسپرت": "bg-red-500/10 text-red-600 dark:text-red-400",
  "پرستیژ": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "کم‌ریسک": "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  "خاص‌پسند": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "آفرود": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "شهری": "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "سفر": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  "سرمایه": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
};

type FilterType = "all" | "active" | "with_profile" | "with_favorites";

export default function AdminUsersPage() {
  const { fetchAdmin } = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmin("/api/admin/users").then((r) => r.json()).then((d) => { setUsers(d); setLoading(false); }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.totalInteractions > 0).length,
    withProfile: users.filter((u) => u.hasTasteProfile).length,
    withFavorites: users.filter((u) => u.favorites > 0).length,
    totalLikes: users.reduce((s, u) => s + u.likes, 0),
    totalSkips: users.reduce((s, u) => s + u.skips, 0),
    avgInteractions: users.length > 0 ? Math.round(users.reduce((s, u) => s + u.totalInteractions, 0) / users.length) : 0,
  }), [users]);

  const filtered = useMemo(() => {
    let result = users;
    if (filter === "active") result = result.filter((u) => u.totalInteractions > 0);
    else if (filter === "with_profile") result = result.filter((u) => u.hasTasteProfile);
    else if (filter === "with_favorites") result = result.filter((u) => u.favorites > 0);
    return result.sort((a, b) => b.totalInteractions - a.totalInteractions);
  }, [users, filter]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black">کاربران</h1>
          <p className="text-[11px] text-muted mt-0.5">{toPersianDigits(filtered.length)} کاربر نمایش داده شده</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "کل کاربران", value: stats.total, icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8", color: "text-primary", bg: "bg-primary/8", iconBg: "bg-primary/15" },
          { label: "فعال", value: stats.active, icon: "M22 11.08V12a10 10 0 11-5.93-9.14", color: "text-accent", bg: "bg-accent/8", iconBg: "bg-accent/15" },
          { label: "میانگین تعامل", value: stats.avgInteractions, icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/8", iconBg: "bg-violet-500/15" },
          { label: "نشان‌گذاری", value: stats.withFavorites, icon: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z", color: "text-danger", bg: "bg-danger/8", iconBg: "bg-danger/15" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3.5 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={s.color}><path d={s.icon} /></svg>
            </div>
            <div>
              <div className={`text-xl font-black ${s.color}`}>{toPersianDigits(s.value)}</div>
              <div className="text-[9px] text-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Chips */}
      <div className="flex gap-1.5 mb-4">
        {([
          { key: "all" as FilterType, label: "همه", count: stats.total },
          { key: "active" as FilterType, label: "فعال", count: stats.active },
          { key: "with_profile" as FilterType, label: "دارای پروفایل", count: stats.withProfile },
          { key: "with_favorites" as FilterType, label: "نشان‌گذاری کرده", count: stats.withFavorites },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition-all border ${
              filter === f.key ? "bg-primary text-white border-primary" : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            {f.label}
            <span className="mr-1 opacity-70">{toPersianDigits(f.count)}</span>
          </button>
        ))}
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {filtered.map((u) => {
          const isExpanded = expandedUser === u.id;
          const likeRatio = u.totalInteractions > 0 ? Math.round((u.likes / u.totalInteractions) * 100) : 0;

          return (
            <div key={u.id} className="bg-surface rounded-xl border border-border overflow-hidden hover:border-primary/20 transition-colors">
              {/* Main Row */}
              <div
                onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  u.totalInteractions > 10 ? "bg-primary/15" : u.totalInteractions > 0 ? "bg-accent/10" : "bg-background"
                }`}>
                  {u.totalInteractions > 0 ? (
                    <span className={`text-xs font-black ${u.totalInteractions > 10 ? "text-primary" : "text-accent"}`}>
                      {toPersianDigits(u.totalInteractions)}
                    </span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/40">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted">{u.sessionId}</span>
                    {u.hasTasteProfile && (
                      <span className="text-[8px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-bold">پروفایل</span>
                    )}
                  </div>
                  {/* User Types */}
                  {u.userTypes.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {u.userTypes.map((t) => (
                        <span key={t} className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[t] || "bg-background text-muted"}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-4 shrink-0">
                  {u.budget && u.budget !== "0" && (
                    <div className="text-left">
                      <div className="text-[10px] text-primary font-bold">{toPersianDigits(formatPrice(u.budget))}</div>
                      <div className="text-[8px] text-muted">بودجه</div>
                    </div>
                  )}

                  {/* Like ratio bar */}
                  {u.totalInteractions > 0 && (
                    <div className="w-16">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[8px] text-accent">{toPersianDigits(u.likes)}</span>
                        <span className="text-[8px] text-muted">{toPersianDigits(u.skips)}</span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden flex">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${likeRatio}%` }} />
                      </div>
                    </div>
                  )}

                  {u.favorites > 0 && (
                    <div className="flex items-center gap-0.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-danger">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                      </svg>
                      <span className="text-[10px] font-bold text-danger">{toPersianDigits(u.favorites)}</span>
                    </div>
                  )}

                  <span className="text-[9px] text-muted">{new Date(u.updatedAt).toLocaleDateString("fa-IR")}</span>

                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-3 bg-background/30">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Activity */}
                    <div>
                      <h4 className="text-[10px] font-black mb-2">فعالیت</h4>
                      <div className="space-y-1.5">
                        {[
                          { label: "تعامل", value: u.totalInteractions, color: "text-foreground" },
                          { label: "لایک", value: u.likes, color: "text-accent" },
                          { label: "اسکیپ", value: u.skips, color: "text-muted" },
                          { label: "نشان", value: u.favorites, color: "text-danger" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between">
                            <span className="text-[10px] text-muted">{item.label}</span>
                            <span className={`text-[11px] font-bold ${item.color}`}>{toPersianDigits(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Budget & Profile */}
                    <div>
                      <h4 className="text-[10px] font-black mb-2">مشخصات</h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted">بودجه</span>
                          <span className="text-[11px] font-bold text-primary">{u.budget && u.budget !== "0" ? toPersianDigits(formatPrice(u.budget)) : "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted">پروفایل</span>
                          <span className={`text-[10px] font-bold ${u.hasTasteProfile ? "text-accent" : "text-muted"}`}>{u.hasTasteProfile ? "دارد" : "ندارد"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted">نرخ پسند</span>
                          <span className="text-[11px] font-bold">{u.totalInteractions > 0 ? toPersianDigits(likeRatio) + "%" : "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div>
                      <h4 className="text-[10px] font-black mb-2">زمان</h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted">عضویت</span>
                          <span className="text-[10px]">{new Date(u.createdAt).toLocaleDateString("fa-IR")}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted">آخرین فعالیت</span>
                          <span className="text-[10px]">{new Date(u.updatedAt).toLocaleDateString("fa-IR")}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted">شناسه کامل</span>
                          <span className="text-[9px] font-mono text-muted">{u.sessionId}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted">کاربری پیدا نشد</p>
          </div>
        )}
      </div>
    </div>
  );
}
