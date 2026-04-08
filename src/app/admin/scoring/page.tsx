"use client";

import { useState, useMemo } from "react";
import { toPersianDigits } from "@/lib/utils";

// These are the current hardcoded weights from the codebase
// In a production app, these would be stored in a config table
const INITIAL_TYPE_WEIGHTS: Record<string, Record<string, number>> = {
  typeEconomic: { economy: 0.4, resaleValue: 0.3, maintenanceRisk: -0.2, cityDriving: 0.1 },
  typeFamily: { familyFriendly: 0.4, safety: 0.3, comfort: 0.2, longTrip: 0.1 },
  typeSport: { sportiness: 0.4, performance: 0.3, prestige: 0.15, comfort: 0.05, economy: -0.1 },
  typePrestige: { prestige: 0.4, comfort: 0.25, safety: 0.15, reliability: 0.1, economy: -0.1 },
  typeSafe: { safety: 0.3, reliability: 0.3, maintenanceRisk: -0.2, resaleValue: 0.1, afterSales: 0.1 },
  typeSpecial: { sportiness: 0.2, prestige: 0.3, performance: 0.2, economy: -0.15, familyFriendly: -0.15 },
  typeOffroad: { offroad: 0.4, longTrip: 0.2, performance: 0.2, sportiness: 0.1, cityDriving: -0.1 },
  typeCity: { cityDriving: 0.4, economy: 0.25, comfort: 0.15, familyFriendly: 0.1, offroad: -0.1 },
  typeTravel: { longTrip: 0.35, comfort: 0.25, reliability: 0.15, safety: 0.15, cityDriving: -0.1 },
  typeInvestment: { resaleValue: 0.4, reliability: 0.2, maintenanceRisk: -0.2, prestige: 0.1, economy: 0.1 },
};

const TYPE_LABELS: Record<string, string> = {
  typeEconomic: "اقتصادی",
  typeFamily: "خانوادگی",
  typeSport: "اسپرت",
  typePrestige: "پرستیژمحور",
  typeSafe: "کم‌ریسک",
  typeSpecial: "خاص‌پسند",
  typeOffroad: "آفرودی",
  typeCity: "شهری",
  typeTravel: "سفرمحور",
  typeInvestment: "سرمایه‌ای",
};

const TYPE_ICONS: Record<string, string> = {
  typeEconomic: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
  typeFamily: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  typeSport: "M13 10V3L4 14h7v7l9-11h-7z",
  typePrestige: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  typeSafe: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  typeSpecial: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  typeOffroad: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  typeCity: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  typeTravel: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  typeInvestment: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
};

const TYPE_STYLES: Record<string, { bg: string; bgExpanded: string; border: string; iconBg: string; iconText: string }> = {
  typeEconomic: { bg: "bg-background", bgExpanded: "bg-emerald-500/5", border: "border-emerald-500/20", iconBg: "bg-emerald-500/10", iconText: "text-emerald-500" },
  typeFamily: { bg: "bg-background", bgExpanded: "bg-blue-500/5", border: "border-blue-500/20", iconBg: "bg-blue-500/10", iconText: "text-blue-500" },
  typeSport: { bg: "bg-background", bgExpanded: "bg-red-500/5", border: "border-red-500/20", iconBg: "bg-red-500/10", iconText: "text-red-500" },
  typePrestige: { bg: "bg-background", bgExpanded: "bg-purple-500/5", border: "border-purple-500/20", iconBg: "bg-purple-500/10", iconText: "text-purple-500" },
  typeSafe: { bg: "bg-background", bgExpanded: "bg-teal-500/5", border: "border-teal-500/20", iconBg: "bg-teal-500/10", iconText: "text-teal-500" },
  typeSpecial: { bg: "bg-background", bgExpanded: "bg-amber-500/5", border: "border-amber-500/20", iconBg: "bg-amber-500/10", iconText: "text-amber-500" },
  typeOffroad: { bg: "bg-background", bgExpanded: "bg-orange-500/5", border: "border-orange-500/20", iconBg: "bg-orange-500/10", iconText: "text-orange-500" },
  typeCity: { bg: "bg-background", bgExpanded: "bg-sky-500/5", border: "border-sky-500/20", iconBg: "bg-sky-500/10", iconText: "text-sky-500" },
  typeTravel: { bg: "bg-background", bgExpanded: "bg-indigo-500/5", border: "border-indigo-500/20", iconBg: "bg-indigo-500/10", iconText: "text-indigo-500" },
  typeInvestment: { bg: "bg-background", bgExpanded: "bg-lime-500/5", border: "border-lime-500/20", iconBg: "bg-lime-500/10", iconText: "text-lime-500" },
};

const DIM_LABELS: Record<string, string> = {
  comfort: "راحتی",
  performance: "عملکرد",
  economy: "صرفه اقتصادی",
  safety: "ایمنی",
  prestige: "پرستیژ",
  reliability: "اطمینان",
  resaleValue: "نقدشوندگی",
  familyFriendly: "خانوادگی",
  sportiness: "اسپرت",
  offroad: "آفرود",
  cityDriving: "شهری",
  longTrip: "سفر",
  maintenanceRisk: "ریسک نگهداری",
  afterSales: "خدمات پس فروش",
};

const INITIAL_ALGO_PARAMS = {
  budgetTolerance: 20,
  minInteractions: 6,
  likeWeight: 1.0,
  skipWeight: -0.3,
  reviewRatingBonus: 2.0,
  warningPenalty: 0.3,
  likedCarBoost: 3,
  skippedCarPenalty: 5,
  topRecommendations: 5,
};

const ALGO_PARAM_DEFS = [
  { key: "likeWeight", label: "وزن لایک", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", min: 0.1, max: 2.0, step: 0.1, unit: "x", color: "text-red-500" },
  { key: "skipWeight", label: "وزن اسکیپ", icon: "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21", min: -1.0, max: 0, step: 0.1, unit: "x", color: "text-muted" },
  { key: "minInteractions", label: "حداقل تعامل", icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122", min: 3, max: 20, step: 1, unit: "", color: "text-blue-500" },
  { key: "budgetTolerance", label: "تلرانس بودجه", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", min: 5, max: 50, step: 5, unit: "%", color: "text-emerald-500" },
  { key: "reviewRatingBonus", label: "بونوس نظرات", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z", min: 0, max: 5, step: 0.5, unit: "x", color: "text-amber-500" },
  { key: "warningPenalty", label: "جریمه هشدار", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", min: 0, max: 2, step: 0.1, unit: "x", color: "text-orange-500" },
  { key: "likedCarBoost", label: "بوست لایک‌شده", icon: "M5 15l7-7 7 7", min: 0, max: 10, step: 1, unit: "", color: "text-green-500" },
  { key: "topRecommendations", label: "تعداد پیشنهاد", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", min: 3, max: 10, step: 1, unit: "", color: "text-violet-500" },
];

export default function AdminScoringPage() {
  const [typeWeights, setTypeWeights] = useState(INITIAL_TYPE_WEIGHTS);
  const [algoParams, setAlgoParams] = useState(INITIAL_ALGO_PARAMS);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const updateWeight = (type: string, dim: string, value: number) => {
    setTypeWeights((prev) => ({
      ...prev,
      [type]: { ...prev[type], [dim]: value },
    }));
  };

  const removeWeight = (type: string, dim: string) => {
    setTypeWeights((prev) => {
      const updated = { ...prev[type] };
      delete updated[dim];
      return { ...prev, [type]: updated };
    });
  };

  // Count total dimensions and modifications
  const stats = useMemo(() => {
    let totalDims = 0;
    let posWeights = 0;
    let negWeights = 0;
    Object.values(typeWeights).forEach((w) => {
      Object.values(w).forEach((v) => {
        totalDims++;
        if (v > 0) posWeights++;
        if (v < 0) negWeights++;
      });
    });
    return { totalDims, posWeights, negWeights, types: Object.keys(typeWeights).length };
  }, [typeWeights]);

  const handleExport = () => {
    const data = {
      typeWeights,
      algoParams,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mashinchi-scoring-params.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("خروجی دانلود شد");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.typeWeights) setTypeWeights(data.typeWeights);
        if (data.algoParams) setAlgoParams(data.algoParams);
        showToast("پارامترها بارگذاری شد");
      } catch {
        showToast("خطا در فایل");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setTypeWeights(INITIAL_TYPE_WEIGHTS);
    setAlgoParams(INITIAL_ALGO_PARAMS);
    showToast("بازنشانی شد");
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black">پارامترهای ارزش‌گذاری</h1>
          <p className="text-[11px] text-muted mt-0.5">
            تنظیم الگوریتم امتیازدهی و وزن‌های تیپ خریدار
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-2 text-[10px] font-bold text-muted border border-border rounded-xl hover:bg-surface transition-colors"
          >
            بازنشانی
          </button>
          <label className="px-3 py-2 bg-surface border border-border text-[10px] font-bold rounded-xl cursor-pointer hover:bg-background transition-colors flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            بارگذاری
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={handleExport} className="px-3 py-2 bg-primary text-white text-[10px] font-bold rounded-xl flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            خروجی JSON
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: "تیپ خریدار", value: stats.types, color: "text-primary" },
          { label: "کل معیارها", value: stats.totalDims, color: "text-foreground" },
          { label: "وزن مثبت", value: stats.posWeights, color: "text-emerald-500" },
          { label: "وزن منفی", value: stats.negWeights, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-surface rounded-xl border border-border p-2.5 text-center">
            <div className={`text-base font-black ${s.color}`}>{toPersianDigits(s.value)}</div>
            <div className="text-[9px] text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Algorithm Parameters */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <h2 className="text-sm font-black">پارامترهای الگوریتم</h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {ALGO_PARAM_DEFS.map((param) => {
            const val = algoParams[param.key as keyof typeof algoParams];
            const pct = ((val - param.min) / (param.max - param.min)) * 100;
            return (
              <div key={param.key} className="bg-background rounded-xl p-3 group hover:border-primary/20 border border-transparent transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={param.color}>
                      <path d={param.icon} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <label className="text-[11px] font-bold">{param.label}</label>
                  </div>
                  <span className="text-sm font-black text-primary tabular-nums">
                    {toPersianDigits(val)}{param.unit && <span className="text-[9px] text-muted mr-0.5">{param.unit}</span>}
                  </span>
                </div>
                <div className="relative">
                  <div className="h-1.5 bg-border rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={val}
                    onChange={(e) => setAlgoParams({ ...algoParams, [param.key]: Number(e.target.value) })}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    style={{ height: "20px", top: "-4px" }}
                  />
                </div>
                <div className="flex justify-between text-[8px] text-muted/50 mt-0.5">
                  <span>{toPersianDigits(param.min)}</span>
                  <span>{toPersianDigits(param.max)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Type Weights */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-sm font-black">وزن‌های تیپ خریدار</h2>
          </div>
          <span className="text-[9px] text-muted">اعداد مثبت = ارتباط مستقیم &bull; منفی = معکوس</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(typeWeights).map(([type, weights]) => {
            const isExpanded = expandedType === type;
            const sortedWeights = Object.entries(weights).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
            const topWeight = sortedWeights[0];
            const style = TYPE_STYLES[type] || TYPE_STYLES.typeEconomic;

            return (
              <div
                key={type}
                className={`rounded-xl border transition-all ${
                  isExpanded
                    ? `${style.bgExpanded} ${style.border}`
                    : `${style.bg} border-transparent hover:border-border`
                }`}
              >
                <div
                  onClick={() => setExpandedType(isExpanded ? null : type)}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center shrink-0`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={style.iconText}>
                      <path d={TYPE_ICONS[type]} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black">{TYPE_LABELS[type]}</span>
                      <span className="text-[9px] text-muted">{toPersianDigits(Object.keys(weights).length)} معیار</span>
                    </div>
                    {/* Preview: top weight */}
                    {topWeight && !isExpanded && (
                      <div className="text-[9px] text-muted mt-0.5 truncate">
                        بالاترین: {DIM_LABELS[topWeight[0]] || topWeight[0]} ({toPersianDigits(topWeight[1])})
                      </div>
                    )}
                  </div>

                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-muted shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3">
                    <div className="space-y-1.5">
                      {sortedWeights.map(([dim, weight]) => (
                        <div key={dim} className="flex items-center gap-2 group/row">
                          <span className="text-[10px] w-20 shrink-0 text-muted">{DIM_LABELS[dim] || dim}</span>

                          {/* Visual bar — bidirectional from center */}
                          <div className="flex-1 h-5 relative flex items-center">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full h-1.5 bg-border/50 rounded-full relative">
                                {/* Center line */}
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted/30" />
                                {/* Bar */}
                                {weight >= 0 ? (
                                  <div
                                    className="absolute top-0 bottom-0 bg-emerald-500/70 rounded-full"
                                    style={{ left: "50%", width: `${weight * 50}%` }}
                                  />
                                ) : (
                                  <div
                                    className="absolute top-0 bottom-0 bg-red-500/70 rounded-full"
                                    style={{ right: "50%", width: `${Math.abs(weight) * 50}%` }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          <input
                            type="number"
                            step={0.05}
                            min={-1}
                            max={1}
                            value={weight}
                            onChange={(e) => updateWeight(type, dim, Number(e.target.value))}
                            className={`w-14 bg-surface border border-border rounded-lg px-1.5 py-1 text-[10px] text-center outline-none font-bold ${
                              weight > 0 ? "text-emerald-600 dark:text-emerald-400" : weight < 0 ? "text-red-500" : "text-muted"
                            }`}
                          />

                          <button
                            onClick={() => removeWeight(type, dim)}
                            className="opacity-0 group-hover/row:opacity-100 text-muted hover:text-red-400 transition-opacity"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add new dimension */}
                    {Object.keys(DIM_LABELS).filter((d) => !weights[d]).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <select
                          onChange={(e) => {
                            if (e.target.value && !weights[e.target.value]) {
                              updateWeight(type, e.target.value, 0.1);
                            }
                            e.target.value = "";
                          }}
                          className="text-[10px] bg-surface border border-border rounded-lg px-2 py-1 outline-none cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled>+ افزودن معیار</option>
                          {Object.keys(DIM_LABELS)
                            .filter((d) => !weights[d])
                            .map((d) => (
                              <option key={d} value={d}>{DIM_LABELS[d]}</option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-start gap-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary shrink-0 mt-0.5">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[10px] text-muted leading-4">
          تغییرات فعلا فقط به صورت JSON ذخیره میشه. برای اعمال در سیستم، فایل رو به تیم توسعه بدید.
          در فازهای بعدی مستقیم از دیتابیس خونده میشن.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
