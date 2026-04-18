"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";
import BottomSheet from "@/components/BottomSheet";
import { useCompare } from "@/lib/useCompare";
import { getHistory, removeSnapshot, type HistoryEntry } from "@/lib/recommendHistory";

interface FavoriteCar {
  id: string;
  nameFa: string;
  nameEn: string;
  brandFa: string;
  category: string;
  origin: string;
  priceMin: string;
  priceMax: string;
  scores: Record<string, number> | null;
  specs: { engine: string | null; horsepower: number | null } | null;
  intel: { overallSummary: string; ownerSatisfaction: number; purchaseRisk: number } | null;
  savedAt: string;
}

interface CarDetail {
  id: string;
  nameFa: string;
  nameEn: string;
  brandFa: string;
  category: string;
  origin: string;
  priceMin: string;
  priceMax: string;
  description: string | null;
  tags: string[];
  scores: Record<string, number> | null;
  specs: { engine: string | null; horsepower: number | null; transmission: string | null; fuelType: string | null; fuelConsumption: number | null } | null;
  reviews: { source: string; summary: string; pros: string[]; cons: string[]; warnings: string[]; rating: number | null }[];
  intel: {
    frequentPros: string[]; frequentCons: string[]; commonIssues: string[]; purchaseWarnings: string[];
    ownerVerdict: string; overallSummary: string; whyBuy: string; whyNotBuy: string;
    purchaseRisk: number; ownerSatisfaction: number;
    suitFamily: number; suitCity: number; suitTravel: number; suitYoung: number; suitInvestment: number;
  } | null;
  similarCars: { id: string; nameFa: string; brandFa: string; priceMin: string; priceMax: string }[];
  alternatives: { id: string; nameFa: string; brandFa: string; priceMin: string; priceMax: string }[];
}

interface ProfileData {
  hasProfile: boolean;
  budget: string | null;
  totalInteractions: number;
  totalLikes: number;
  totalFavorites: number;
  userTypes: string[];
  hasTasteProfile: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [favorites, setFavorites] = useState<FavoriteCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<CarDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [favExpanded, setFavExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [favCompareMode, setFavCompareMode] = useState(false);

  // My car experience
  const [showMyCar, setShowMyCar] = useState(false);
  const [myCarStep, setMyCarStep] = useState(0);
  const [myCarId, setMyCarId] = useState("");
  const [myCarOwnership, setMyCarOwnership] = useState("");
  const [myCarSatisfaction, setMyCarSatisfaction] = useState(5);
  const [myCarProblem, setMyCarProblem] = useState("");
  const [myCarCost, setMyCarCost] = useState("");
  const [myCarRebuy, setMyCarRebuy] = useState("");
  const [myCarSellReason, setMyCarSellReason] = useState("");
  const [myCarNote, setMyCarNote] = useState("");
  const [myCarSaving, setMyCarSaving] = useState(false);
  const [myCarSaved, setMyCarSaved] = useState(false);
  const [allCars, setAllCars] = useState<{ id: string; nameFa: string; brandFa: string }[]>([]);

  // Auth
  const { authenticated, phone, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Recommend history
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleRemoveHistory = (id: string) => {
    removeSnapshot(id);
    setHistory(getHistory());
  };

  const formatBillion = (n: string): string => {
    const num = parseInt(n);
    if (!num) return "—";
    if (num >= 1_000_000_000) return toPersianDigits((num / 1_000_000_000).toFixed(1).replace(/\.0$/, "")) + " م";
    if (num >= 1_000_000) return toPersianDigits(Math.round(num / 1_000_000).toString()) + " م";
    return toPersianDigits(num.toString());
  };

  const relativeTime = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "همین الان";
    if (min < 60) return `${toPersianDigits(min)} دقیقه پیش`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${toPersianDigits(hr)} ساعت پیش`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${toPersianDigits(day)} روز پیش`;
    return new Date(iso).toLocaleDateString("fa-IR");
  };
  const { toggleCompare, isInCompare, canCompare, goToCompare, count: compareCount, clearCompare } = useCompare();

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/favorites").then((r) => r.json()),
    ])
      .then(([profileData, favData]) => {
        setProfile(profileData);
        if (favData.favorites) setFavorites(favData.favorites);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Load cars list for "my car" selector
    fetch("/api/cars/list").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setAllCars(d);
    }).catch(() => {});
  }, []);

  const openCarDetail = async (carId: string) => {
    setSheetOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/cars/${carId}`);
      if (res.ok) setSelectedCar(await res.json());
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const removeFavorite = async (carId: string) => {
    const carName = favorites.find((f) => f.id === carId)?.nameFa || "";
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId }),
    });
    setFavorites((prev) => prev.filter((f) => f.id !== carId));
    setConfirmDelete(null);
    // Show toast
    setToast(`${carName} از نشان‌شده‌ها حذف شد`);
    setTimeout(() => setToast(null), 2500);
  };

  const handleReset = async () => {
    if (!confirm("سلیقه و تاریخچه پاک بشه؟")) return;
    await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget: "0", reset: true }),
    });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // User type icon mapping
  // User type icons - each visually distinct
  const typeIcons: Record<string, string> = {
    "خانوادگی": "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    "اقتصادی": "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    "اسپرت": "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    "پرستیژمحور": "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    "کم‌ریسک": "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    "شهری": "M2 22h20M6 22V6l6-4 6 4v16M10 10h4M10 14h4M10 18h4",
    "سفرمحور": "M3 17h1m16 0h1M5.6 17l2-7h8.8l2 7M8 17v-3h8v3M7 10V6.5L12 4l5 2.5V10",
    "آفرودی": "M5 17a2 2 0 104 0 2 2 0 00-4 0M15 17a2 2 0 104 0 2 2 0 00-4 0M9 17h6M3 17V11l2-5h5l2 3h4l2-1h1a2 2 0 012 2v7",
    "خاص‌پسند": "M12 2a1 1 0 011 1v3a1 1 0 01-2 0V3a1 1 0 011-1zM4.22 4.22a1 1 0 011.42 0l2.12 2.12a1 1 0 01-1.42 1.42L4.22 5.64a1 1 0 010-1.42zM20 12a1 1 0 010 2h-3a1 1 0 010-2h3zM12 19a7 7 0 100-14 7 7 0 000 14z",
    "سرمایه‌ای": "M9 14l6-6M4 2v4h4M20 2v4h-4M4 22v-4h4M20 22v-4h-4M12 8v8M8 12h8",
  };

  return (
    <div className="flex-1 flex flex-col page-transition">
      <div className="flex-1 overflow-y-auto">

        {/* Profile Header */}
        {profile?.hasProfile ? (
          <div className="px-5 pt-4 pb-2">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/8 rounded-2xl p-4 relative overflow-hidden">

              <div className="relative">
                {/* Avatar + Main Type */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    {profile.userTypes.length > 0 ? (
                      <>
                        <div className="text-base font-black">خریدار {profile.userTypes[0]}</div>
                        <div className="text-[11px] text-muted mt-0.5">
                          {authenticated && phone
                            ? toPersianDigits(phone)
                            : `بر اساس ${toPersianDigits(profile.totalInteractions)} بررسی`}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-base font-black">پروفایل شما</div>
                        <div className="text-[11px] text-muted mt-0.5">
                          {authenticated && phone ? toPersianDigits(phone) : "سلیقه‌سنجی فعال"}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* User Type Badges with icons */}
                {profile.userTypes.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {profile.userTypes.map((type) => (
                      <div key={type} className="flex-1 bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-xl px-2 py-2 text-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary mx-auto mb-1">
                          <path d={typeIcons[type] || "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"} />
                        </svg>
                        <span className="text-[10px] font-bold text-foreground">{type}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stats Row - with icons */}
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/50 dark:bg-white/8 backdrop-blur-sm rounded-xl p-2.5 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-black">{toPersianDigits(profile.totalInteractions)}</div>
                      <div className="text-[9px] text-muted">بررسی</div>
                    </div>
                  </div>
                  <div className="flex-1 bg-white/50 dark:bg-white/8 backdrop-blur-sm rounded-xl p-2.5 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-black text-accent">{toPersianDigits(profile.totalLikes)}</div>
                      <div className="text-[9px] text-muted">پسند</div>
                    </div>
                  </div>
                  <div className="flex-1 bg-white/50 dark:bg-white/8 backdrop-blur-sm rounded-xl p-2.5 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${favorites.length > 0 ? "bg-danger/10" : "bg-muted/10"}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={favorites.length > 0 ? "text-danger" : "text-muted"}>
                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className={`text-sm font-black ${favorites.length > 0 ? "text-danger" : "text-muted"}`}>{toPersianDigits(favorites.length)}</div>
                      <div className="text-[9px] text-muted">نشان</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget + CTA Bar */}
            {(profile.budget && profile.budget !== "0") || profile.hasTasteProfile ? (
              <div className="flex gap-2 mt-2">
                {profile.budget && profile.budget !== "0" && (
                  <div className="flex-1 bg-surface rounded-xl border border-border px-3 py-2.5 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary shrink-0">
                      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                    <div>
                      <div className="text-[10px] text-muted">بودجه</div>
                      <div className="text-xs font-bold text-primary">{toPersianDigits(formatPrice(profile.budget))}</div>
                    </div>
                  </div>
                )}
                {profile.hasTasteProfile && (
                  <button
                    onClick={() => router.push("/results")}
                    className="flex-1 bg-primary text-white rounded-xl px-3 py-2.5 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform max-w-[50%]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-xs font-bold">پیشنهادات</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          /* No Profile State */
          <div className="px-5 pt-5 pb-3">
            <div className="bg-surface rounded-2xl border border-border p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-primary/15 to-accent/10 rounded-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <p className="text-sm font-black mb-1">هنوز سلیقه‌سنجی نکردی</p>
              <p className="text-[11px] text-muted mb-4 leading-5">بودجه رو مشخص کن، ماشین‌ها رو بررسی کن<br/>و پروفایل خریدارت ساخته بشه</p>
              <button
                onClick={() => router.push("/")}
                className="px-8 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-[0.97] transition-transform"
              >
                شروع سلیقه‌سنجی
              </button>
            </div>
          </div>
        )}

        {/* Favorites Section - Accordion */}
        <div className="px-5 mb-4">
          {favorites.length === 0 ? (
            <>
              <h2 className="text-sm font-black flex items-center gap-1.5 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
                نشان‌شده‌ها
              </h2>
              <div className="bg-surface rounded-xl border border-dashed border-border p-5 text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-muted/8 rounded-full flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/50">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                </div>
                <p className="text-xs text-muted mb-2">خودرویی نشان نشده</p>
                <button
                  onClick={() => router.push("/catalog")}
                  className="text-[11px] text-primary font-bold bg-primary/8 px-4 py-1.5 rounded-lg"
                >
                  رفتن به کاتالوگ
                </button>
              </div>
            </>
          ) : (
            <div className="bg-surface rounded-2xl border border-border overflow-hidden">
              {/* Accordion Header */}
              <div
                onClick={() => setFavExpanded(!favExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  <span className="text-sm font-black">نشان‌شده‌ها</span>
                  <span className="text-[10px] bg-danger/10 text-danger font-bold px-2 py-0.5 rounded-full">
                    {toPersianDigits(favorites.length)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {favorites.length >= 2 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setFavCompareMode(!favCompareMode); setFavExpanded(true); if (favCompareMode) clearCompare(); }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                        favCompareMode ? "bg-primary text-white" : "text-muted hover:text-primary"
                      }`}
                    >
                      {favCompareMode ? "لغو مقایسه" : "مقایسه"}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push("/catalog"); }}
                    className="text-[10px] text-primary font-bold"
                  >
                    + افزودن
                  </button>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-muted transition-transform duration-200 ${favExpanded ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>

              {/* Preview (always show first 3) */}
              {!favExpanded && (
                <div className="px-4 pb-3">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {favorites.slice(0, 4).map((car) => (
                      <button
                        key={car.id}
                        onClick={() => openCarDetail(car.id)}
                        className="shrink-0 bg-background rounded-xl px-3 py-2 min-w-[110px] text-right"
                      >
                        <div className="text-[11px] font-bold truncate">{car.nameFa}</div>
                        <div className="text-[9px] text-muted">{car.brandFa}</div>
                        <div className="text-[10px] text-primary font-bold mt-0.5">{toPersianDigits(formatPrice(car.priceMin))}</div>
                      </button>
                    ))}
                    {favorites.length > 4 && (
                      <button
                        onClick={() => setFavExpanded(true)}
                        className="shrink-0 bg-primary/8 rounded-xl px-3 py-2 min-w-[80px] flex items-center justify-center"
                      >
                        <span className="text-[11px] text-primary font-bold">
                          +{toPersianDigits(favorites.length - 4)} دیگر
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Expanded List */}
              {favExpanded && (
                <div className="border-t border-border">
                  {favorites.map((car, index) => (
                    <div
                      key={car.id}
                      onClick={favCompareMode ? () => toggleCompare(car.id) : undefined}
                      className={`flex items-center gap-3 px-4 py-2.5 ${
                        index < favorites.length - 1 ? "border-b border-border/50" : ""
                      } ${favCompareMode ? "cursor-pointer" : ""} ${
                        favCompareMode && isInCompare(car.id) ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Compare checkbox OR Satisfaction */}
                      {favCompareMode ? (
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isInCompare(car.id) ? "bg-primary border-primary" : "border-border"
                        }`}>
                          {isInCompare(car.id) && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          car.intel && car.intel.ownerSatisfaction >= 7 ? "bg-accent/10" :
                          car.intel && car.intel.ownerSatisfaction >= 5 ? "bg-primary/10" : "bg-background"
                        }`}>
                          {car.intel ? (
                            <span className={`text-xs font-black ${
                              car.intel.ownerSatisfaction >= 7 ? "text-accent" :
                              car.intel.ownerSatisfaction >= 5 ? "text-primary" : "text-muted"
                            }`}>{toPersianDigits(car.intel.ownerSatisfaction)}</span>
                          ) : (
                            <span className="text-xs text-muted">-</span>
                          )}
                        </div>
                      )}

                      {/* Info - clickable */}
                      <button
                        onClick={(e) => { if (favCompareMode) { e.stopPropagation(); return; } openCarDetail(car.id); }}
                        className="flex-1 min-w-0 text-right"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-[13px] font-bold truncate">{car.nameFa}</h3>
                          <span className="text-[11px] font-bold text-primary shrink-0 mr-2">{toPersianDigits(formatPrice(car.priceMin))}</span>
                        </div>
                        <p className="text-[10px] text-muted">{car.brandFa} | {getOriginLabel(car.origin)}</p>
                      </button>

                      {/* Delete (hidden in compare mode) */}
                      {!favCompareMode && (
                        <button
                          onClick={() => setConfirmDelete(car.id)}
                          className="shrink-0 w-7 h-7 rounded-full hover:bg-danger/10 flex items-center justify-center transition-colors"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted hover:text-danger transition-colors">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Compare Action Button */}
                  {favCompareMode && (
                    <div className="p-3 border-t border-border">
                      <button
                        onClick={goToCompare}
                        disabled={!canCompare}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          canCompare
                            ? "bg-primary text-white shadow-lg shadow-primary/25 active:scale-[0.97]"
                            : "bg-primary/20 text-primary/50"
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" />
                        </svg>
                        {canCompare ? "مقایسه کن" : `${toPersianDigits(compareCount)} از ۲ انتخاب کنید`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirm Delete Modal */}
        {confirmDelete && (
          <>
            <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmDelete(null)} />
            <div className="fixed bottom-0 inset-x-0 bg-surface rounded-t-2xl p-5 z-50 shadow-2xl" style={{ animation: "slideUp 0.2s ease-out" }}>
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-bold text-center mb-1">حذف از نشان‌شده‌ها</p>
              <p className="text-xs text-muted text-center mb-4">
                {favorites.find(f => f.id === confirmDelete)?.nameFa} از لیست نشان‌شده‌ها حذف بشه؟
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 bg-background text-foreground text-sm font-bold rounded-xl"
                >
                  انصراف
                </button>
                <button
                  onClick={() => removeFavorite(confirmDelete)}
                  className="flex-1 py-2.5 bg-danger text-white text-sm font-bold rounded-xl active:scale-[0.97] transition-transform"
                >
                  حذف کن
                </button>
              </div>
            </div>
          </>
        )}

        {/* Toast Notification */}
        {toast && (
          <div
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50"
            style={{ animation: "fadeIn 0.2s ease-out" }}
          >
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {toast}
            </div>
          </div>
        )}

        {/* ─── Recommendation History ─── */}
        {history.length > 0 && (
          <div className="px-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                پیشنهادهای قبلی ({toPersianDigits(history.length)})
              </h2>
            </div>
            <div className="space-y-1.5">
              {history.map((h) => (
                <div key={h.id} className="bg-surface rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold">{relativeTime(h.date)}</span>
                      {h.budget && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                          بودجه {formatBillion(h.budget)}
                        </span>
                      )}
                      <span className="text-[9px] text-muted">{toPersianDigits(h.cars.length)} پیشنهاد</span>
                    </div>
                    <button
                      onClick={() => handleRemoveHistory(h.id)}
                      className="text-muted/40 hover:text-red-500 p-0.5"
                      title="حذف"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {h.cars.slice(0, 5).map((car, i) => (
                        <button
                          key={car.id}
                          onClick={() => router.push(`/car/${car.id}`)}
                          className="flex items-center gap-1 bg-background hover:bg-primary/5 rounded-lg px-2 py-1 text-[10px] transition-colors"
                        >
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 ${
                            i === 0 ? "bg-primary text-white" : "bg-border text-muted"
                          }`}>
                            {toPersianDigits(i + 1)}
                          </span>
                          <span className="font-bold">{car.nameFa}</span>
                          <span className="text-primary font-bold">· {formatBillion(car.priceMin)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── My Car Experience ─── */}
        <div className="px-5 mb-4">
          {!showMyCar && !myCarSaved ? (
            <button
              onClick={() => { setShowMyCar(true); setMyCarStep(0); }}
              className="w-full bg-surface rounded-2xl border border-border p-4 flex items-center gap-3 hover:border-primary/30 transition-colors text-right"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2M9 17h6" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-xs font-black">خودروی فعلی من</div>
                <p className="text-[10px] text-muted mt-0.5">تجربه‌ت رو ثبت کن و به بقیه کمک کن</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0 rotate-180">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ) : myCarSaved ? (
            <div className="w-full bg-emerald-500/5 rounded-2xl border border-emerald-500/20 p-4 text-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600 mx-auto mb-1"><path d="M20 6L9 17l-5-5" /></svg>
              <p className="text-xs font-bold text-emerald-600">تجربه‌ات ثبت شد، ممنون!</p>
              <p className="text-[9px] text-muted mt-0.5">این اطلاعات به کاربران دیگه کمک می‌کنه</p>
            </div>
          ) : (
            <div className="w-full bg-surface rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                    <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2M9 17h6" />
                  </svg>
                  خودروی فعلی من
                </h3>
                <button onClick={() => setShowMyCar(false)} className="text-[10px] text-muted hover:text-foreground font-bold px-2 py-0.5 rounded-lg hover:bg-background transition-colors">بستن ×</button>
              </div>

              {/* Progress — step label + dots */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] text-muted">مرحله {toPersianDigits(myCarStep + 1)} از ۷</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((s) => (
                    <div key={s} className={`h-1 rounded-full transition-all ${s === myCarStep ? "w-4 bg-primary" : s < myCarStep ? "w-1.5 bg-primary/40" : "w-1.5 bg-border"}`} />
                  ))}
                </div>
              </div>

              {/* Step 0: Select car */}
              {myCarStep === 0 && (
                <div>
                  <p className="text-[11px] font-bold mb-2">خودروت چیه؟</p>
                  <select
                    value={myCarId}
                    onChange={(e) => setMyCarId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs outline-none focus:border-primary"
                  >
                    <option value="">انتخاب خودرو...</option>
                    {allCars.map((c) => <option key={c.id} value={c.id}>{c.nameFa} — {c.brandFa}</option>)}
                  </select>
                  <button onClick={() => myCarId && setMyCarStep(1)} disabled={!myCarId}
                    className="w-full mt-3 py-2.5 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-40">بعدی</button>
                </div>
              )}

              {/* Step 1: Ownership duration */}
              {myCarStep === 1 && (
                <div>
                  <p className="text-[11px] font-bold mb-2">چند وقته مالکشی؟</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["کمتر از ۶ ماه", "۶ ماه تا ۱ سال", "۱ تا ۳ سال", "بیش از ۳ سال"].map((opt) => (
                      <button key={opt} onClick={() => { setMyCarOwnership(opt); setMyCarStep(2); }}
                        className={`py-2.5 rounded-xl text-[11px] font-bold border transition-all ${myCarOwnership === opt ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Satisfaction */}
              {myCarStep === 2 && (
                <div>
                  <p className="text-[11px] font-bold mb-2">رضایت کلی از ۱ تا ۱۰؟</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted">ناراضی</span>
                    <input type="range" min={1} max={10} value={myCarSatisfaction}
                      onChange={(e) => setMyCarSatisfaction(Number(e.target.value))} className="flex-1" />
                    <span className="text-[10px] text-muted">عالی</span>
                  </div>
                  <div className={`text-center text-2xl font-black my-2 ${myCarSatisfaction >= 7 ? "text-emerald-600" : myCarSatisfaction >= 4 ? "text-primary" : "text-red-500"}`}>
                    {toPersianDigits(myCarSatisfaction)}
                  </div>
                  <button onClick={() => setMyCarStep(3)} className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl">بعدی</button>
                </div>
              )}

              {/* Step 3: Biggest problem */}
              {myCarStep === 3 && (
                <div>
                  <p className="text-[11px] font-bold mb-2">بزرگ‌ترین مشکل؟</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["موتور", "گیربکس", "برق", "بدنه", "تعلیق", "مشکلی نداشتم"].map((opt) => (
                      <button key={opt} onClick={() => { setMyCarProblem(opt); setMyCarStep(4); }}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${myCarProblem === opt ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Monthly cost */}
              {myCarStep === 4 && (
                <div>
                  <p className="text-[11px] font-bold mb-2">هزینه ماهانه نگهداری؟</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["زیر ۵۰۰ هزار", "۵۰۰ هزار تا ۱ میلیون", "۱ تا ۲ میلیون", "بالای ۲ میلیون"].map((opt) => (
                      <button key={opt} onClick={() => { setMyCarCost(opt); setMyCarStep(5); }}
                        className={`py-2.5 rounded-xl text-[10px] font-bold border transition-all ${myCarCost === opt ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Would rebuy + sell reason */}
              {myCarStep === 5 && (
                <div>
                  <p className="text-[11px] font-bold mb-2">دوباره همین خودرو رو می‌خری؟</p>
                  <div className="flex gap-1.5 mb-3">
                    {["بله", "شاید", "نه"].map((opt) => (
                      <button key={opt} onClick={() => setMyCarRebuy(opt)}
                        className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold border transition-all ${myCarRebuy === opt ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] font-bold mb-2">اگه می‌خوای بفروشی، دلیلش؟</p>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {["ارتقا می‌خوام", "مشکل فنی داره", "نیاز مالی", "نمی‌خوام بفروشم"].map((opt) => (
                      <button key={opt} onClick={() => setMyCarSellReason(opt)}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${myCarSellReason === opt ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setMyCarStep(6)} disabled={!myCarRebuy}
                    className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-40">بعدی</button>
                </div>
              )}

              {/* Step 6: Optional note + submit */}
              {myCarStep === 6 && (
                <div>
                  <p className="text-[11px] font-bold mb-2">یه چیز دیگه هم می‌خوای بگی؟ (اختیاری)</p>
                  <textarea
                    value={myCarNote}
                    onChange={(e) => setMyCarNote(e.target.value)}
                    placeholder="مثلا: لوازم یدکی گرونه، مصرف واقعی بیشتر از اعلامیه..."
                    rows={3}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs leading-6 outline-none resize-none focus:border-primary mb-3"
                  />
                  <button
                    onClick={async () => {
                      setMyCarSaving(true);
                      try {
                        await fetch("/api/report", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            carId: myCarId,
                            carName: allCars.find((c) => c.id === myCarId)?.nameFa || "",
                            type: "experience",
                            text: [
                              `مدت مالکیت: ${myCarOwnership}`,
                              `رضایت: ${myCarSatisfaction}/10`,
                              `بزرگ‌ترین مشکل: ${myCarProblem}`,
                              `هزینه ماهانه: ${myCarCost}`,
                              `خرید مجدد: ${myCarRebuy}`,
                              `دلیل فروش: ${myCarSellReason}`,
                              myCarNote ? `یادداشت: ${myCarNote}` : "",
                            ].filter(Boolean).join("\n"),
                          }),
                        });
                        setMyCarSaved(true);
                        setShowMyCar(false);
                      } catch {}
                      setMyCarSaving(false);
                    }}
                    disabled={myCarSaving}
                    className="w-full py-3 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    {myCarSaving ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> ارسال...</>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                        ثبت تجربه
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Back button (except step 0) */}
              {myCarStep > 0 && (
                <button onClick={() => setMyCarStep(myCarStep - 1)} className="w-full mt-2 text-[10px] text-muted hover:text-foreground text-center font-bold">
                  → مرحله قبل
                </button>
              )}
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className="px-5 mb-4">
          <h2 className="text-sm font-black mb-2 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            حساب کاربری
          </h2>
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            {authenticated ? (
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold">{phone ? toPersianDigits(phone) : ""}</div>
                      <div className="text-[10px] text-accent">وارد شده</div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                      window.location.reload();
                    }}
                    className="text-[11px] text-danger font-bold px-3 py-1.5 rounded-lg hover:bg-danger/5 transition-colors"
                  >
                    خروج
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="w-full p-4 flex items-center gap-3 hover:bg-background transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                  </svg>
                </div>
                <div className="text-right flex-1">
                  <div className="text-xs font-bold">ورود / ثبت‌نام</div>
                  <div className="text-[10px] text-muted mt-0.5">ذخیره علاقه‌مندی‌ها و سلیقه روی همه دستگاه‌ها</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0 rotate-180">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Settings Section */}
        <div className="px-5 mb-6">
          <h2 className="text-sm font-black mb-2 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            تنظیمات
          </h2>
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            {/* Theme Toggle */}
            <div className="p-3">
              <div className="flex gap-1 bg-background rounded-xl p-1">
                {[
                  { key: "light" as const, label: "روشن", icon: <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></> },
                  { key: "dark" as const, label: "تاریک", icon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /> },
                  { key: "system" as const, label: "سیستم", icon: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></> },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setTheme(opt.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${
                      theme === opt.key
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{opt.icon}</svg>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            <button
              onClick={handleReset}
              className="w-full px-4 py-3 text-right text-xs hover:bg-background transition-colors flex items-center gap-2 text-danger"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              پاک کردن سلیقه و تاریخچه
            </button>

            <div className="border-t border-border" />
            <div className="px-4 py-2 text-[10px] text-muted text-center">
              ماشینچی نسخه ۰.۱.۰
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => { setSheetOpen(false); setSelectedCar(null); }}
        title={selectedCar?.nameFa || ""}
      >
        {detailLoading ? (
          <div className="py-8 text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">در حال بارگذاری...</p>
          </div>
        ) : selectedCar ? (
          <div className="space-y-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">{selectedCar.brandFa} | {getOriginLabel(selectedCar.origin)} | {getCategoryLabel(selectedCar.category)}</p>
                <div className="mt-1">
                  <span className="text-sm font-bold text-primary">{toPersianDigits(formatPrice(selectedCar.priceMin))}</span>
                  <span className="text-xs text-muted"> تا </span>
                  <span className="text-sm font-bold text-primary">{toPersianDigits(formatPrice(selectedCar.priceMax))}</span>
                </div>
              </div>
            </div>
            {selectedCar.intel && (
              <div className="flex gap-2">
                <div className="flex-1 bg-accent/8 rounded-xl p-3 text-center">
                  <div className="text-lg font-black text-accent">{toPersianDigits(selectedCar.intel.ownerSatisfaction)}<span className="text-xs font-normal text-muted">/۱۰</span></div>
                  <div className="text-[10px] text-muted mt-0.5">رضایت مالکان</div>
                </div>
                <div className="flex-1 bg-primary/8 rounded-xl p-3 text-center">
                  <div className="text-lg font-black text-primary">{toPersianDigits(10 - selectedCar.intel.purchaseRisk)}<span className="text-xs font-normal text-muted">/۱۰</span></div>
                  <div className="text-[10px] text-muted mt-0.5">امنیت خرید</div>
                </div>
              </div>
            )}
            {selectedCar.intel && <p className="text-sm leading-7 text-muted">{selectedCar.intel.overallSummary}</p>}
            {selectedCar.intel && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-accent/6 border border-accent/15 rounded-xl p-3">
                  <h5 className="text-xs font-black text-accent mb-1.5">چرا بخری</h5>
                  <p className="text-xs leading-6">{selectedCar.intel.whyBuy}</p>
                </div>
                <div className="bg-danger/6 border border-danger/15 rounded-xl p-3">
                  <h5 className="text-xs font-black text-danger mb-1.5">چرا نخری</h5>
                  <p className="text-xs leading-6">{selectedCar.intel.whyNotBuy}</p>
                </div>
              </div>
            )}
            {selectedCar.scores && (
              <div className="bg-background rounded-xl p-4">
                <h4 className="text-xs font-black mb-3">امتیازات</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    { key: "comfort", label: "راحتی" }, { key: "performance", label: "عملکرد" },
                    { key: "economy", label: "صرفه اقتصادی" }, { key: "safety", label: "ایمنی" },
                    { key: "reliability", label: "اطمینان" }, { key: "resaleValue", label: "نقدشوندگی" },
                  ].map(({ key, label }) => {
                    const score = selectedCar.scores![key] || 5;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[11px] text-muted w-20 shrink-0">{label}</span>
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${score >= 7 ? "bg-accent" : score >= 4 ? "bg-primary" : "bg-danger"}`} style={{ width: `${(score / 10) * 100}%` }} />
                        </div>
                        <span className="text-[11px] font-black w-4 text-center">{toPersianDigits(score)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </BottomSheet>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
