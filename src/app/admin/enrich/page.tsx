"use client";

import { useState, useEffect, useMemo } from "react";
import { toPersianDigits, getOriginLabel } from "@/lib/utils";
import { useAdmin } from "../layout";

interface CarStatus {
  id: string; nameFa: string; brandFa: string; origin: string;
  hasDescription: boolean; hasRichIntel: boolean;
  prosCount: number; reviewCount: number; satisfaction: number;
}

const ORIGIN_COLORS: Record<string, string> = {
  iranian: "bg-blue-500/10 text-blue-600", chinese: "bg-rose-500/10 text-rose-600",
  korean: "bg-violet-500/10 text-violet-600", japanese: "bg-red-500/10 text-red-600",
  european: "bg-amber-500/10 text-amber-600",
};

type Filter = "all" | "needs" | "complete";

export default function AdminEnrichPage() {
  const { fetchAdmin } = useAdmin();
  const [cars, setCars] = useState<CarStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, current: "" });
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    fetchAdmin("/api/admin/enrich").then((r) => r.json()).then((d) => { setCars(d); setLoading(false); }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const needsWork = (c: CarStatus) => !c.hasRichIntel || c.prosCount < 3 || c.reviewCount < 3;
  const getScore = (c: CarStatus) => {
    let s = 0;
    if (c.hasDescription) s++;
    if (c.hasRichIntel) s++;
    if (c.prosCount >= 3) s++;
    if (c.reviewCount >= 3) s++;
    if (c.satisfaction > 0) s++;
    return s;
  };

  const stats = useMemo(() => ({
    total: cars.length,
    complete: cars.filter((c) => !needsWork(c)).length,
    needs: cars.filter(needsWork).length,
  }), [cars]);

  const filtered = useMemo(() => {
    let result = cars;
    if (filter === "needs") result = result.filter(needsWork);
    else if (filter === "complete") result = result.filter((c) => !needsWork(c));
    return result;
  }, [cars, filter]);

  // Group by origin
  const grouped = useMemo(() => {
    const groups: Record<string, CarStatus[]> = {};
    for (const car of filtered) {
      if (!groups[car.origin]) groups[car.origin] = [];
      groups[car.origin].push(car);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const enrichSingle = async (carId: string) => {
    const car = cars.find((c) => c.id === carId);
    setEnrichingId(carId);
    try {
      const res = await fetchAdmin("/api/admin/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId }),
      });
      const data = await res.json();
      if (data.success) {
        setLog((prev) => [`${car?.nameFa}: OK`, ...prev].slice(0, 30));
        const updated = await fetchAdmin("/api/admin/enrich").then((r) => r.json());
        setCars(updated);
        showToast(`${car?.nameFa} غنی‌سازی شد`);
      } else {
        setLog((prev) => [`${car?.nameFa}: ${data.error?.slice(0, 60)}`, ...prev].slice(0, 30));
        showToast(data.error);
      }
    } catch (e) {
      setLog((prev) => [`${car?.nameFa}: ${(e as Error).message}`, ...prev].slice(0, 30));
    }
    setEnrichingId(null);
  };

  const enrichBatch = async () => {
    const work = cars.filter(needsWork);
    if (work.length === 0) { showToast("همه خودروها کامل هستن"); return; }
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: work.length, current: "" });

    for (let i = 0; i < work.length; i++) {
      setBatchProgress({ done: i, total: work.length, current: work[i].nameFa });
      try {
        const res = await fetchAdmin("/api/admin/enrich", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carId: work[i].id }),
        });
        const data = await res.json();
        setLog((prev) => [`${work[i].nameFa}: ${data.success ? "OK" : data.error?.slice(0, 50)}`, ...prev].slice(0, 50));
      } catch { setLog((prev) => [`${work[i].nameFa}: error`, ...prev].slice(0, 50)); }
      await new Promise((r) => setTimeout(r, 2000));
    }

    setBatchProgress({ done: work.length, total: work.length, current: "" });
    setBatchRunning(false);
    const updated = await fetchAdmin("/api/admin/enrich").then((r) => r.json());
    setCars(updated);
    showToast("تمام شد");
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const completePct = stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black">غنی‌سازی داده‌ها</h1>
          <p className="text-[11px] text-muted mt-0.5">تولید داده‌های غنی و کاربرپسند با AI</p>
        </div>
        <button
          onClick={enrichBatch}
          disabled={batchRunning || stats.needs === 0}
          className="px-4 py-2 bg-primary text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-40"
        >
          {batchRunning ? (
            <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> {toPersianDigits(batchProgress.done)}/{toPersianDigits(batchProgress.total)}</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> غنی‌سازی ناقص‌ها ({toPersianDigits(stats.needs)})</>
          )}
        </button>
      </div>

      {/* Progress overview */}
      <div className="bg-surface rounded-2xl border border-border p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-black">پیشرفت کلی</span>
          <span className="text-sm font-black text-primary">{toPersianDigits(completePct)}%</span>
        </div>
        <div className="h-3 bg-border rounded-full overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-l from-accent to-primary rounded-full transition-all" style={{ width: `${completePct}%` }} />
        </div>
        <div className="flex gap-4 text-center">
          <div className="flex-1">
            <div className="text-lg font-black">{toPersianDigits(stats.total)}</div>
            <div className="text-[9px] text-muted">کل</div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-black text-accent">{toPersianDigits(stats.complete)}</div>
            <div className="text-[9px] text-muted">کامل</div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-black text-danger">{toPersianDigits(stats.needs)}</div>
            <div className="text-[9px] text-muted">ناقص</div>
          </div>
        </div>
      </div>

      {/* Batch progress */}
      {batchRunning && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold">{batchProgress.current}</span>
            </div>
            <span className="text-[10px] text-muted">{toPersianDigits(batchProgress.done)}/{toPersianDigits(batchProgress.total)}</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${batchProgress.total > 0 ? (batchProgress.done / batchProgress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5 mb-4">
        {([
          { key: "all" as Filter, label: "همه", count: stats.total },
          { key: "needs" as Filter, label: "ناقص", count: stats.needs },
          { key: "complete" as Filter, label: "کامل", count: stats.complete },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all ${
              filter === f.key ? "bg-primary text-white border-primary" : "bg-surface border-border text-muted"
            }`}
          >
            {f.label} {toPersianDigits(f.count)}
          </button>
        ))}
      </div>

      {/* Grouped car list */}
      <div className="space-y-4">
        {grouped.map(([origin, originCars]) => (
          <div key={origin}>
            {/* Origin header */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${ORIGIN_COLORS[origin] || "bg-background text-muted"}`}>
                {getOriginLabel(origin)}
              </span>
              <span className="text-[10px] text-muted">{toPersianDigits(originCars.length)} خودرو</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Cars */}
            <div className="space-y-1.5">
              {originCars.map((car) => {
                const score = getScore(car);
                const needs = needsWork(car);
                const isEnriching = enrichingId === car.id;

                return (
                  <div key={car.id} className={`bg-surface rounded-xl border px-4 py-2.5 flex items-center gap-3 transition-all ${
                    needs ? "border-border" : "border-accent/20 opacity-60"
                  }`}>
                    {/* Completeness ring */}
                    <div className="relative w-9 h-9 shrink-0">
                      <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
                          className={score >= 4 ? "text-accent" : score >= 2 ? "text-primary" : "text-danger"}
                          strokeDasharray={`${(score / 5) * 94.2} 94.2`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black">{toPersianDigits(score)}/۵</span>
                    </div>

                    {/* Car info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold">{car.nameFa}</span>
                        <span className="text-[9px] text-muted">{car.brandFa}</span>
                      </div>
                      {/* Status pills */}
                      <div className="flex gap-1 mt-1">
                        {[
                          { ok: car.hasDescription, label: "توصیف" },
                          { ok: car.hasRichIntel, label: "intel" },
                          { ok: car.prosCount >= 3, label: `قوت ${toPersianDigits(car.prosCount)}` },
                          { ok: car.reviewCount >= 3, label: `نظر ${toPersianDigits(car.reviewCount)}` },
                        ].map((s) => (
                          <span key={s.label} className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            s.ok ? "bg-accent/10 text-accent" : "bg-danger/8 text-danger/60"
                          }`}>
                            {s.ok ? "+" : "-"}{s.label}
                          </span>
                        ))}
                        {car.satisfaction > 0 && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            car.satisfaction >= 7 ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                          }`}>
                            رضایت {toPersianDigits(car.satisfaction)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => enrichSingle(car.id)}
                      disabled={isEnriching || batchRunning}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg shrink-0 transition-all disabled:opacity-40 flex items-center gap-1 ${
                        needs
                          ? "bg-primary text-white"
                          : "bg-background text-muted hover:text-primary"
                      }`}
                    >
                      {isEnriching ? (
                        <><div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> ...</>
                      ) : needs ? (
                        <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> غنی‌سازی</>
                      ) : (
                        "بازسازی"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="mt-5 bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black">لاگ</h3>
            <button onClick={() => setLog([])} className="text-[9px] text-muted hover:text-danger">پاک</button>
          </div>
          <div className="max-h-[150px] overflow-y-auto space-y-0.5">
            {log.map((entry, i) => (
              <div key={i} className={`text-[9px] font-mono ${entry.includes("OK") ? "text-accent" : "text-danger"}`}>{entry}</div>
            ))}
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}
