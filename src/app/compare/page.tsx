"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";

function formatBillion(n: number | string): string {
  const num = typeof n === "string" ? parseInt(n) : n;
  if (!num || num <= 0) return "—";
  if (num >= 1_000_000_000) {
    const b = num / 1_000_000_000;
    return toPersianDigits(b.toFixed(1).replace(/\.0$/, "")) + " میلیارد";
  }
  if (num >= 1_000_000) return toPersianDigits(Math.round(num / 1_000_000).toString()) + " م";
  return toPersianDigits(num.toString());
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
  specs: {
    engine: string | null;
    horsepower: number | null;
    transmission: string | null;
    fuelType: string | null;
    fuelConsumption: number | null;
    seatingCapacity: number | null;
  } | null;
  intel: {
    frequentPros: string[];
    frequentCons: string[];
    ownerVerdict: string;
    overallSummary: string;
    whyBuy: string;
    whyNotBuy: string;
    purchaseRisk: number;
    ownerSatisfaction: number;
    purchaseWarnings: string[];
  } | null;
}

const SCORE_LABELS: { key: string; label: string }[] = [
  { key: "comfort", label: "راحتی" },
  { key: "performance", label: "عملکرد" },
  { key: "economy", label: "صرفه اقتصادی" },
  { key: "safety", label: "ایمنی" },
  { key: "reliability", label: "اطمینان" },
  { key: "resaleValue", label: "نقدشوندگی" },
  { key: "familyFriendly", label: "خانوادگی" },
  { key: "sportiness", label: "اسپرت" },
  { key: "maintenanceRisk", label: "ریسک نگهداری" },
  { key: "afterSales", label: "خدمات پس فروش" },
];

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idA = searchParams.get("a");
  const idB = searchParams.get("b");

  const [carA, setCarA] = useState<CarDetail | null>(null);
  const [carB, setCarB] = useState<CarDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!idA || !idB) return;
    Promise.all([
      fetch(`/api/cars/${idA}`).then((r) => r.json()),
      fetch(`/api/cars/${idB}`).then((r) => r.json()),
    ])
      .then(([a, b]) => {
        setCarA(a);
        setCarB(b);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [idA, idB]);

  if (!idA || !idB) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-muted mb-3">دو خودرو برای مقایسه انتخاب نشده</p>
          <button onClick={() => router.push("/catalog")} className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl">
            رفتن به کاتالوگ
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted text-sm">در حال مقایسه...</p>
        </div>
      </div>
    );
  }

  if (!carA || !carB) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted">خطا در بارگذاری</p>
      </div>
    );
  }

  // Calculate wins
  let winsA = 0;
  let winsB = 0;
  SCORE_LABELS.forEach(({ key }) => {
    const a = carA.scores?.[key] || 5;
    const b = carB.scores?.[key] || 5;
    // For maintenanceRisk, lower is better
    if (key === "maintenanceRisk") {
      if (a < b) winsA++;
      else if (b < a) winsB++;
    } else {
      if (a > b) winsA++;
      else if (b > a) winsB++;
    }
  });

  const priceA = parseInt(carA.priceMin);
  const priceB = parseInt(carB.priceMin);
  const satisfactionA = carA.intel?.ownerSatisfaction || 5;
  const satisfactionB = carB.intel?.ownerSatisfaction || 5;
  const riskA = carA.intel?.purchaseRisk || 5;
  const riskB = carB.intel?.purchaseRisk || 5;

  const winner = winsA > winsB ? "A" : winsB > winsA ? "B" : "tie";

  // Calculate overall score for each car
  const totalA = SCORE_LABELS.reduce((sum, { key }) => {
    const v = carA.scores?.[key] || 5;
    return sum + (key === "maintenanceRisk" ? 10 - v : v);
  }, 0);
  const totalB = SCORE_LABELS.reduce((sum, { key }) => {
    const v = carB.scores?.[key] || 5;
    return sum + (key === "maintenanceRisk" ? 10 - v : v);
  }, 0);
  const avgA = (totalA / SCORE_LABELS.length).toFixed(1);
  const avgB = (totalB / SCORE_LABELS.length).toFixed(1);

  // Spec comparison helper - returns "a" | "b" | null for winner
  const specWinner = (a: number | null | undefined, b: number | null | undefined, lowerBetter = false) => {
    if (!a || !b || a === b) return null;
    return lowerBetter ? (a < b ? "a" : "b") : (a > b ? "a" : "b");
  };

  return (
    <div className="flex-1 flex flex-col page-transition">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-foreground p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-black">مقایسه خودرو</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">

        {/* Car Identity Cards with overall score */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {([["A", carA, avgA, winsA] as const, ["B", carB, avgB, winsB] as const]).map(([side, car, avg, wins]) => {
            const isWinner = (side === "A" && winner === "A") || (side === "B" && winner === "B");
            return (
              <div key={car.id} className={`rounded-2xl p-3 text-center relative overflow-hidden ${
                isWinner ? "bg-accent/6 border-2 border-accent/30" : "bg-surface border border-border"
              }`}>
                {isWinner && (
                  <div className="absolute top-0 right-0 bg-accent text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">
                    برتر
                  </div>
                )}
                {/* Overall score circle */}
                <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                  isWinner ? "bg-accent/15" : "bg-background"
                }`}>
                  <span className={`text-lg font-black ${isWinner ? "text-accent" : "text-foreground"}`}>{toPersianDigits(avg)}</span>
                </div>
                <h3 className="text-sm font-black truncate">{car.nameFa}</h3>
                <p className="text-[10px] text-muted mt-0.5">{car.brandFa}</p>
                <div className="flex items-center justify-center gap-1 mt-1.5">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                    car.origin === "iranian" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                    car.origin === "chinese" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                    car.origin === "korean" ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" :
                    car.origin === "japanese" ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                    "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}>{getOriginLabel(car.origin)}</span>
                  <span className="text-[8px] bg-background text-muted px-1.5 py-0.5 rounded-full">{getCategoryLabel(car.category)}</span>
                </div>
                <div className="text-xs font-bold text-primary mt-2">{formatBillion(car.priceMin)}</div>
                {car.priceMin !== car.priceMax && parseInt(car.priceMax) > 0 && (
                  <div className="text-[9px] text-muted">تا {formatBillion(car.priceMax)}</div>
                )}
                <div className="text-[9px] text-muted mt-1">
                  برتر در <span className="font-bold text-foreground">{toPersianDigits(wins)}</span> معیار
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats Row: Satisfaction + Risk + Price */}
        <div className="flex gap-1.5 mb-3">
          {[
            { label: "رضایت", a: satisfactionA, b: satisfactionB, higher: true },
            { label: "امنیت", a: 10 - riskA, b: 10 - riskB, higher: true },
          ].map(({ label, a, b, higher }) => (
            <div key={label} className="flex-1 bg-surface rounded-xl border border-border p-2">
              <div className="text-[9px] text-muted text-center mb-1">{label}</div>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-sm font-black ${(higher ? a >= b : a <= b) ? "text-accent" : "text-muted"}`}>
                  {toPersianDigits(a)}
                </span>
                <span className="text-[9px] text-muted">-</span>
                <span className={`text-sm font-black ${(higher ? b >= a : b <= a) ? "text-accent" : "text-muted"}`}>
                  {toPersianDigits(b)}
                </span>
              </div>
            </div>
          ))}
          {priceA !== priceB && (
            <div className="flex-1 bg-primary/6 rounded-xl border border-primary/15 p-2">
              <div className="text-[9px] text-muted text-center mb-1">ارزان‌تر</div>
              <div className="text-[10px] font-bold text-primary text-center truncate">
                {priceA < priceB ? carA.nameFa : carB.nameFa}
              </div>
            </div>
          )}
        </div>

        {/* Score Comparison - compact with winner highlight */}
        <div className="bg-surface rounded-2xl border border-border p-3 mb-3">
          {/* Car name legend at top */}
          <div className="flex justify-between mb-2 px-1">
            <span className="text-[10px] font-black truncate max-w-[40%]">{carA.nameFa}</span>
            <span className="text-[10px] font-black text-muted">امتیازات</span>
            <span className="text-[10px] font-black truncate max-w-[40%]">{carB.nameFa}</span>
          </div>
          <div className="space-y-1.5">
            {SCORE_LABELS.map(({ key, label }) => {
              const a = carA.scores?.[key] || 5;
              const b = carB.scores?.[key] || 5;
              const isRisk = key === "maintenanceRisk";
              const aWins = isRisk ? a < b : a > b;
              const bWins = isRisk ? b < a : b > a;

              return (
                <div key={key} className="flex items-center gap-1">
                  <span className={`text-[11px] font-black w-5 text-center ${aWins ? "text-accent" : bWins ? "text-muted/50" : "text-foreground"}`}>
                    {toPersianDigits(a)}
                  </span>
                  <div className="flex-1 h-2.5 bg-border/50 rounded-full overflow-hidden flex justify-end">
                    <div
                      className={`h-full rounded-full ${aWins ? "bg-accent" : bWins ? "bg-muted/30" : "bg-primary/60"}`}
                      style={{ width: `${(a / 10) * 100}%` }}
                    />
                  </div>
                  <div className={`text-[9px] w-16 text-center font-bold shrink-0 px-1 py-0.5 rounded ${
                    aWins ? "text-accent bg-accent/8" : bWins ? "text-accent bg-accent/8" : "text-muted"
                  }`}>
                    {label}
                  </div>
                  <div className="flex-1 h-2.5 bg-border/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bWins ? "bg-accent" : aWins ? "bg-muted/30" : "bg-primary/60"}`}
                      style={{ width: `${(b / 10) * 100}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-black w-5 text-center ${bWins ? "text-accent" : aWins ? "text-muted/50" : "text-foreground"}`}>
                    {toPersianDigits(b)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Specs Comparison - with winner highlight */}
        {(carA.specs || carB.specs) && (() => {
          const rows = [
            { label: "موتور", a: carA.specs?.engine, b: carB.specs?.engine, win: null as string | null },
            { label: "قدرت", a: carA.specs?.horsepower ? `${carA.specs.horsepower}` : null, b: carB.specs?.horsepower ? `${carB.specs.horsepower}` : null, unit: " اسب", win: specWinner(carA.specs?.horsepower, carB.specs?.horsepower) },
            { label: "گیربکس", a: carA.specs?.transmission === "automatic" ? "اتوماتیک" : carA.specs?.transmission === "manual" ? "دنده‌ای" : carA.specs?.transmission, b: carB.specs?.transmission === "automatic" ? "اتوماتیک" : carB.specs?.transmission === "manual" ? "دنده‌ای" : carB.specs?.transmission, win: null },
            { label: "مصرف", a: carA.specs?.fuelConsumption ? `${carA.specs.fuelConsumption}` : null, b: carB.specs?.fuelConsumption ? `${carB.specs.fuelConsumption}` : null, unit: " لیتر", win: specWinner(carA.specs?.fuelConsumption, carB.specs?.fuelConsumption, true) },
            { label: "قیمت شروع", a: formatBillion(carA.priceMin), b: formatBillion(carB.priceMin), win: priceA < priceB ? "a" : priceB < priceA ? "b" : null, isPrice: true },
          ];
          return (
            <div className="bg-surface rounded-2xl border border-border overflow-hidden mb-3">
              <div className="grid grid-cols-3 py-2 border-b border-border bg-background/50">
                <div className="text-[10px] font-black text-center truncate px-1">{carA.nameFa}</div>
                <div className="text-[10px] font-black text-muted text-center">مشخصات</div>
                <div className="text-[10px] font-black text-center truncate px-1">{carB.nameFa}</div>
              </div>
              {rows.map((row, i) => (
                <div key={i} className={`grid grid-cols-3 text-center ${i % 2 === 0 ? "" : "bg-background/30"}`}>
                  <div className={`py-2 text-[11px] ${row.win === "a" ? "font-bold text-accent" : row.isPrice ? "font-bold text-primary" : ""}`}>
                    {row.a ? toPersianDigits(String(row.a)) + (row.unit || "") : "-"}
                  </div>
                  <div className="py-2 text-[10px] text-muted border-x border-border/30">{row.label}</div>
                  <div className={`py-2 text-[11px] ${row.win === "b" ? "font-bold text-accent" : row.isPrice ? "font-bold text-primary" : ""}`}>
                    {row.b ? toPersianDigits(String(row.b)) + (row.unit || "") : "-"}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Why Buy / Why Not - merged into one compact section */}
        {(carA.intel || carB.intel) && (
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[carA, carB].map((car) => (
                <div key={car.id} className="bg-surface rounded-xl border border-border p-3">
                  <h5 className="text-[10px] font-black truncate mb-2">{car.nameFa}</h5>
                  <div className="bg-accent/6 rounded-lg p-2 mb-1.5">
                    <div className="text-[9px] font-bold text-accent mb-0.5">بخری اگر...</div>
                    <p className="text-[9px] leading-4">{car.intel?.whyBuy || "-"}</p>
                  </div>
                  <div className="bg-danger/6 rounded-lg p-2">
                    <div className="text-[9px] font-bold text-danger mb-0.5">نخری اگر...</div>
                    <p className="text-[9px] leading-4">{car.intel?.whyNotBuy || "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pros & Cons - compact */}
        {(carA.intel || carB.intel) && (
          <div className="bg-surface rounded-2xl border border-border p-3 mb-3">
            <div className="grid grid-cols-2 gap-3">
              {[carA, carB].map((car) => (
                <div key={car.id}>
                  <h5 className="text-[10px] font-black mb-1.5 truncate">{car.nameFa}</h5>
                  {car.intel?.frequentPros.slice(0, 3).map((p, i) => (
                    <div key={`p${i}`} className="flex items-start gap-1 text-[9px] mb-0.5">
                      <span className="text-accent shrink-0 font-bold mt-px">+</span>
                      <span className="line-clamp-1">{p}</span>
                    </div>
                  ))}
                  {car.intel?.frequentCons.slice(0, 2).map((c, i) => (
                    <div key={`c${i}`} className="flex items-start gap-1 text-[9px] mb-0.5">
                      <span className="text-danger shrink-0 font-bold mt-px">-</span>
                      <span className="line-clamp-1">{c}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Conclusion */}
        <div className={`rounded-2xl p-4 text-center relative overflow-hidden ${
          winner !== "tie"
            ? "bg-gradient-to-br from-accent/12 to-accent/4 border-2 border-accent/25"
            : "bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
        }`}>
          <div className="text-lg mb-1">
            {winner !== "tie" ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent mx-auto">
                <path d="M8 21h8m-4-4v4M6 12l-2-2V4a1 1 0 011-1h14a1 1 0 011 1v6l-2 2m-4 0H8" />
                <path d="M12 12v4" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary mx-auto">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M8 12h8M12 8v8" />
              </svg>
            )}
          </div>
          <h4 className="text-sm font-black mb-1.5">جمع‌بندی</h4>
          {winner === "tie" ? (
            <p className="text-xs leading-6 text-muted">
              دو خودرو عملکرد مشابهی دارند. انتخاب به سلیقه شخصی شما بستگی دارد.
            </p>
          ) : (
            <p className="text-xs leading-6 text-muted">
              <span className="font-black text-accent text-base">{winner === "A" ? carA.nameFa : carB.nameFa}</span>
              <br/>برتری در <span className="font-bold text-foreground">{toPersianDigits(Math.max(winsA, winsB))}</span> از {toPersianDigits(SCORE_LABELS.length)} معیار
              {satisfactionA !== satisfactionB && (
                <span className="block mt-0.5 text-[11px]">
                  رضایت مالکان بالاتر: <span className="font-bold">{satisfactionA > satisfactionB ? carA.nameFa : carB.nameFa}</span>
                </span>
              )}
            </p>
          )}
          {priceA !== priceB && (
            <div className="mt-2 pt-2 border-t border-border/30 text-[11px] text-primary font-bold">
              {priceA < priceB ? carA.nameFa : carB.nameFa} حدود {formatBillion(Math.abs(priceA - priceB))} ارزان‌تر
            </div>
          )}
        </div>

        {/* Back */}
        <div className="mt-5 text-center">
          <button
            onClick={() => { try { sessionStorage.removeItem("mashinchi-compare"); } catch {} router.push("/catalog"); }}
            className="px-6 py-2.5 bg-surface border border-border text-foreground font-bold text-xs rounded-xl"
          >
            بازگشت به کاتالوگ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
