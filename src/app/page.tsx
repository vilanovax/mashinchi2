"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, toPersianDigits } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

const BUDGET_MIN = 500_000_000;
const BUDGET_MAX = 7_000_000_000;
const BUDGET_STEP = 100_000_000;

// Milestones on the slider
const BUDGET_MARKS = [
  500_000_000,
  1_500_000_000,
  2_500_000_000,
  4_000_000_000,
  5_500_000_000,
  7_000_000_000,
];

export default function HomePage() {
  const [budget, setBudget] = useState(2_500_000_000);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

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
    } catch {
      // ignore
    }
  };

  const percentage =
    ((budget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;

  return (
    <div className="flex-1 flex flex-col page-transition relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 pt-4">
        <div /> {/* spacer */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Settings Dropdown */}
      {showSettings && (
        <div className="absolute top-14 left-5 bg-surface rounded-xl border border-border shadow-xl z-20 overflow-hidden min-w-[200px]">
          {/* Theme Toggle */}
          <div className="px-4 py-3">
            <span className="text-xs text-muted block mb-2">حالت نمایش</span>
            <div className="flex gap-1 bg-background rounded-lg p-0.5">
              <button
                onClick={() => setTheme("light")}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                  theme === "light" ? "bg-surface text-foreground shadow-sm" : "text-muted"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
                روشن
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                  theme === "dark" ? "bg-surface text-foreground shadow-sm" : "text-muted"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
                تاریک
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                  theme === "system" ? "bg-surface text-foreground shadow-sm" : "text-muted"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                سیستم
              </button>
            </div>
          </div>
          <div className="border-t border-border" />
          <button
            onClick={handleReset}
            className="w-full px-4 py-3 text-right text-sm hover:bg-background transition-colors flex items-center gap-2 text-danger"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            پاک کردن سلیقه قبلی
          </button>
          <div className="border-t border-border" />
          <div className="px-4 py-2.5 text-[10px] text-muted">
            نسخه ۰.۱.۰ | ماشینچی
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" />
              <path d="M9 17h6" />
              <path d="M14 7l-3 -3" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-foreground">ماشینچی</h1>
          <p className="text-muted mt-1 text-sm">
            بهترین ماشین رو با سلیقه تو پیدا کن
          </p>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-md bg-surface rounded-3xl shadow-xl p-6 border border-border">
          <h2 className="text-lg font-bold text-center mb-1">
            بودجه‌ات چقدره؟
          </h2>
          <p className="text-muted text-xs text-center mb-5">
            ماشین‌ها بر اساس بودجه‌ات فیلتر میشن
          </p>

          {/* Budget Display */}
          <div className="text-center mb-4">
            <span className="text-3xl font-black text-primary">
              {toPersianDigits(formatPrice(budget))}
            </span>
            <span className="text-sm text-muted mr-1">تومان</span>
          </div>

          {/* Slider */}
          <div className="relative mb-2">
            <div
              className="absolute top-0 h-2 bg-primary rounded-full pointer-events-none"
              style={{ width: `${percentage}%` }}
            />
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
          <div className="flex justify-between mb-6 px-0.5">
            {BUDGET_MARKS.map((mark) => (
              <button
                key={mark}
                onClick={() => setBudget(mark)}
                className={`text-[10px] transition-colors ${
                  Math.abs(budget - mark) < BUDGET_STEP
                    ? "text-primary font-bold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {toPersianDigits(formatPrice(mark))}
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold text-base rounded-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/25"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                صبر کن...
              </span>
            ) : (
              "بزن بریم!"
            )}
          </button>
        </div>

        {/* How it works */}
        <div className="w-full max-w-md mt-5 flex items-center gap-3 px-2">
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-black text-primary">۱</span>
            </div>
            <span className="text-[10px] text-muted text-center">بودجه</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-black text-primary">۲</span>
            </div>
            <span className="text-[10px] text-muted text-center">انتخاب</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-black text-primary">۳</span>
            </div>
            <span className="text-[10px] text-muted text-center">پیشنهاد</span>
          </div>
        </div>
      </div>

      {/* Close settings on backdrop */}
      {showSettings && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
