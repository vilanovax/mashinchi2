"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toPersianDigits } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

const BUDGET_MIN = 500_000_000;
const BUDGET_MAX = 7_000_000_000;
const BUDGET_STEP = 100_000_000;

const BUDGET_MARKS = [
  { value: 500_000_000, label: "۵۰۰م" },
  { value: 1_500_000_000, label: "۱.۵" },
  { value: 2_500_000_000, label: "۲.۵" },
  { value: 4_000_000_000, label: "۴" },
  { value: 5_500_000_000, label: "۵.۵" },
  { value: 7_000_000_000, label: "۷" },
];

function formatBudget(n: number): string {
  if (n >= 1_000_000_000) {
    const b = n / 1_000_000_000;
    return toPersianDigits(b % 1 === 0 ? b.toFixed(0) : b.toFixed(1));
  }
  return toPersianDigits(Math.round(n / 1_000_000).toString());
}

function budgetUnit(n: number): string {
  return n >= 1_000_000_000 ? "میلیارد" : "میلیون";
}

export default function HomePage() {
  const [budget, setBudget] = useState(2_500_000_000);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [carCount, setCarCount] = useState<number | null>(null);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Fetch car count for budget
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/cars/count?budget=${budget}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { if (typeof d.count === "number") setCarCount(d.count); })
      .catch(() => {});
    return () => controller.abort();
  }, [budget]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: budget.toString() }),
      });
      router.push(`/explore?budget=${budget}`);
    } catch {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: "0", reset: true }),
      });
      setShowSettings(false);
    } catch {}
  };

  const percentage = ((budget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;

  return (
    <div className="flex-1 flex flex-col page-transition relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 pt-3">
        <div />
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Settings Dropdown */}
      {showSettings && (
        <div className="absolute top-12 left-5 bg-surface rounded-xl border border-border shadow-xl z-20 overflow-hidden min-w-[200px]">
          <div className="px-4 py-3">
            <span className="text-xs text-muted block mb-2">حالت نمایش</span>
            <div className="flex gap-1 bg-background rounded-lg p-0.5">
              {[
                { key: "light" as const, label: "روشن", icon: "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" },
                { key: "dark" as const, label: "تاریک", icon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" },
                { key: "system" as const, label: "سیستم", icon: "M2 3h20v14H2zM8 21h8M12 17v4" },
              ].map((t) => (
                <button key={t.key} onClick={() => setTheme(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${theme === t.key ? "bg-surface text-foreground shadow-sm" : "text-muted"}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={t.icon} /></svg>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-border" />
          <button onClick={handleReset} className="w-full px-4 py-2.5 text-right text-xs hover:bg-background transition-colors flex items-center gap-2 text-danger">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
            پاک کردن سلیقه
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 -mt-4">
        {/* Steps — before the card */}
        <div className="w-full max-w-md flex items-center gap-2 px-4 mb-4">
          {[
            { num: "۱", label: "بودجه", active: true },
            { num: "۲", label: "انتخاب", active: false },
            { num: "۳", label: "پیشنهاد", active: false },
          ].map((step, i) => (
            <div key={step.num} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-0.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                  step.active ? "bg-primary text-white" : "bg-background border border-border text-muted"
                }`}>
                  {step.num}
                </div>
                <span className={`text-[9px] ${step.active ? "text-primary font-bold" : "text-muted"}`}>{step.label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-px ${step.active ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="w-full max-w-md bg-surface rounded-3xl shadow-xl border border-border overflow-hidden">
          {/* Header */}
          <div className="text-center pt-5 pb-3 px-6">
            <div className="w-12 h-12 mx-auto mb-2 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" />
                <path d="M9 17h6" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-foreground">ماشینچی</h1>
            <p className="text-muted text-xs mt-0.5">دستیار هوشمند خرید خودرو</p>
          </div>

          {/* Budget section */}
          <div className="px-6 pb-5">
            <div className="text-center mb-1">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-primary leading-none">
                  {formatBudget(budget)}
                </span>
                <span className="text-sm text-muted font-bold">{budgetUnit(budget)} تومان</span>
              </div>
              {/* Car count hint */}
              {carCount !== null && (
                <p className="text-[11px] text-muted mt-1.5">
                  <span className="text-primary font-black">{toPersianDigits(carCount)}</span> خودرو در این بودجه
                </p>
              )}
            </div>

            {/* Slider */}
            <div className="relative mt-3 mb-1">
              <div className="absolute top-0 h-2 bg-primary rounded-full pointer-events-none" style={{ width: `${percentage}%` }} />
              <input
                type="range"
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={BUDGET_STEP}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="relative z-10 w-full cursor-pointer"
              />
            </div>

            {/* Budget Marks */}
            <div className="flex justify-between mb-5 px-0.5">
              {BUDGET_MARKS.map((mark) => (
                <button
                  key={mark.value}
                  onClick={() => setBudget(mark.value)}
                  className={`text-[9px] transition-colors ${
                    Math.abs(budget - mark.value) < BUDGET_STEP
                      ? "text-primary font-black"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {mark.label}
                </button>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold text-base rounded-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  صبر کن...
                </>
              ) : (
                <>
                  بزن بریم!
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="rotate-180">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>

            {/* Features strip */}
            <div className="flex items-center justify-center gap-3 mt-4 text-[9px] text-muted">
              <span className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><path d="M20 6L9 17l-5-5" /></svg>
                {toPersianDigits(137)} خودرو
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><path d="M20 6L9 17l-5-5" /></svg>
                مقایسه هوشمند
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><path d="M20 6L9 17l-5-5" /></svg>
                رایگان
              </span>
            </div>
          </div>
        </div>

        {/* Skip link */}
        <button
          onClick={() => router.push("/catalog")}
          className="mt-3 text-[11px] text-muted hover:text-primary transition-colors"
        >
          یا مستقیم کاتالوگ خودروها رو ببین ←
        </button>
      </div>

      {/* Close settings on backdrop */}
      {showSettings && <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />}
    </div>
  );
}
