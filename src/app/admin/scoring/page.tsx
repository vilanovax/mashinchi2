"use client";

import { useState } from "react";
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
  budgetTolerance: 20, // ±20%
  minInteractions: 6,
  likeWeight: 1.0,
  skipWeight: -0.3,
  reviewRatingBonus: 2.0,
  warningPenalty: 0.3,
  likedCarBoost: 3,
  skippedCarPenalty: 5,
  topRecommendations: 5,
};

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

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-black">پارامترهای ارزش‌گذاری</h1>
        <div className="flex gap-2">
          <label className="px-4 py-2 bg-surface border border-border text-xs font-bold rounded-xl cursor-pointer hover:bg-background transition-colors">
            بارگذاری
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={handleExport} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl">
            خروجی JSON
          </button>
        </div>
      </div>

      {/* Algorithm Parameters */}
      <div className="bg-surface rounded-2xl border border-border p-5 mb-6">
        <h2 className="text-sm font-black mb-4">پارامترهای الگوریتم</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: "budgetTolerance", label: "تلرانس بودجه (%)", min: 5, max: 50, step: 5 },
            { key: "minInteractions", label: "حداقل تعامل", min: 3, max: 20, step: 1 },
            { key: "likeWeight", label: "وزن لایک", min: 0.1, max: 2.0, step: 0.1 },
            { key: "skipWeight", label: "وزن اسکیپ (منفی)", min: -1.0, max: 0, step: 0.1 },
            { key: "reviewRatingBonus", label: "بونوس امتیاز نظرات", min: 0, max: 5, step: 0.5 },
            { key: "warningPenalty", label: "جریمه هشدار", min: 0, max: 2, step: 0.1 },
            { key: "likedCarBoost", label: "بوست ماشین لایک‌شده", min: 0, max: 10, step: 1 },
            { key: "topRecommendations", label: "تعداد پیشنهاد", min: 3, max: 10, step: 1 },
          ].map((param) => {
            const val = algoParams[param.key as keyof typeof algoParams];
            return (
              <div key={param.key} className="bg-background rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold">{param.label}</label>
                  <span className="text-xs font-black text-primary">{toPersianDigits(val)}</span>
                </div>
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={val}
                  onChange={(e) => setAlgoParams({ ...algoParams, [param.key]: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* User Type Weights */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <h2 className="text-sm font-black mb-4">وزن‌های تیپ خریدار</h2>
        <p className="text-[11px] text-muted mb-4">هر تیپ خریدار از ترکیب وزنی معیارها ساخته میشه. اعداد مثبت یعنی ارتباط مستقیم، منفی یعنی معکوس.</p>

        <div className="space-y-2">
          {Object.entries(typeWeights).map(([type, weights]) => {
            const isExpanded = expandedType === type;
            return (
              <div key={type} className="border border-border rounded-xl overflow-hidden">
                <div
                  onClick={() => setExpandedType(isExpanded ? null : type)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-background/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{TYPE_LABELS[type]}</span>
                    <span className="text-[10px] text-muted">
                      ({Object.keys(weights).length} معیار)
                    </span>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-4 bg-background/30">
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(weights).map(([dim, weight]) => (
                        <div key={dim} className="flex items-center gap-2">
                          <span className="text-[11px] w-24 shrink-0">{DIM_LABELS[dim] || dim}</span>
                          <input
                            type="number"
                            step={0.05}
                            min={-1}
                            max={1}
                            value={weight}
                            onChange={(e) => updateWeight(type, dim, Number(e.target.value))}
                            className={`w-20 bg-surface border border-border rounded-lg px-2 py-1 text-xs text-center outline-none ${
                              weight > 0 ? "text-accent" : weight < 0 ? "text-danger" : ""
                            }`}
                          />
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            {weight >= 0 ? (
                              <div className="h-full bg-accent rounded-full" style={{ width: `${weight * 100}%` }} />
                            ) : (
                              <div className="h-full bg-danger rounded-full mr-auto" style={{ width: `${Math.abs(weight) * 100}%` }} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add new dimension */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <select
                        onChange={(e) => {
                          if (e.target.value && !weights[e.target.value]) {
                            updateWeight(type, e.target.value, 0.1);
                          }
                          e.target.value = "";
                        }}
                        className="text-[10px] bg-surface border border-border rounded-lg px-2 py-1 outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>+ افزودن معیار...</option>
                        {Object.keys(DIM_LABELS)
                          .filter((d) => !weights[d])
                          .map((d) => (
                            <option key={d} value={d}>{DIM_LABELS[d]}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 bg-primary/5 border border-primary/15 rounded-xl p-4">
        <p className="text-[11px] text-muted leading-5">
          تغییرات پارامترها فعلا فقط به صورت خروجی JSON ذخیره میشه.
          برای اعمال در سیستم، فایل JSON رو به تیم توسعه بدید تا در کد اعمال بشه.
          در فازهای بعدی، این پارامترها مستقیم از دیتابیس خونده میشن.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50" style={{ animation: "fadeIn 0.2s ease-out" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
