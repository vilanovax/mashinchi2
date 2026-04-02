"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, toPersianDigits } from "@/lib/utils";

const BUDGET_MIN = 1_500_000_000;
const BUDGET_MAX = 5_000_000_000;
const BUDGET_STEP = 100_000_000;

export default function HomePage() {
  const [budget, setBudget] = useState(2_500_000_000);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  const percentage =
    ((budget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 page-transition">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
          <svg
            width="40"
            height="40"
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
        <h1 className="text-3xl font-black text-foreground">ماشینچی</h1>
        <p className="text-muted mt-2 text-base">
          دستیار هوشمند خرید خودرو
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-surface rounded-3xl shadow-xl p-8 border border-border">
        <h2 className="text-xl font-bold text-center mb-2">
          چقدر بودجه داری؟
        </h2>
        <p className="text-muted text-sm text-center mb-8">
          بقیه‌اش با ما، بهترین ماشین رو برات پیدا می‌کنیم
        </p>

        {/* Budget Display */}
        <div className="text-center mb-6">
          <span className="text-4xl font-black text-primary">
            {toPersianDigits(formatPrice(budget))}
          </span>
          <span className="text-lg text-muted mr-2">تومان</span>
        </div>

        {/* Slider */}
        <div className="relative mb-4">
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

        {/* Min/Max Labels */}
        <div className="flex justify-between text-xs text-muted mb-8">
          <span>{toPersianDigits(formatPrice(BUDGET_MIN))}</span>
          <span>{toPersianDigits(formatPrice(BUDGET_MAX))}</span>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold text-lg rounded-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/25"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              صبر کن...
            </span>
          ) : (
            "بزن بریم!"
          )}
        </button>
      </div>

      {/* Footer hint */}
      <p className="text-muted text-xs mt-6 text-center">
        با انتخاب بودجه، ماشین‌های مناسب بهت نشون داده میشه
      </p>
    </div>
  );
}
