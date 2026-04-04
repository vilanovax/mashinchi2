"use client";

import { useState, useEffect, useMemo } from "react";
import { toPersianDigits, getOriginLabel } from "@/lib/utils";
import { useAdmin } from "../layout";

interface CarStatus {
  id: string; nameFa: string; brandFa: string; origin: string;
  hasDescription: boolean; hasRichIntel: boolean;
  prosCount: number; reviewCount: number; satisfaction: number;
}

export default function AdminEnrichPage() {
  const { fetchAdmin } = useAdmin();
  const [cars, setCars] = useState<CarStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, current: "" });
  const [toast, setToast] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    fetchAdmin("/api/admin/enrich").then((r) => r.json()).then((d) => { setCars(d); setLoading(false); }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const stats = useMemo(() => ({
    total: cars.length,
    withDesc: cars.filter((c) => c.hasDescription).length,
    withIntel: cars.filter((c) => c.hasRichIntel).length,
    needsEnrich: cars.filter((c) => !c.hasRichIntel || c.prosCount < 3 || c.reviewCount < 3).length,
  }), [cars]);

  const enrichSingle = async (carId: string) => {
    const car = cars.find((c) => c.id === carId);
    setEnrichingId(carId);
    try {
      const res = await fetchAdmin("/api/admin/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId }),
      });
      const data = await res.json();
      if (data.success) {
        setLog((prev) => [`${car?.nameFa}: enriched (intel: ${data.updated.intel}, reviews: ${data.updated.reviews.join(",")})`, ...prev]);
        // Refresh
        const updated = await fetchAdmin("/api/admin/enrich").then((r) => r.json());
        setCars(updated);
        showToast(`${car?.nameFa} غنی‌سازی شد`);
      } else {
        setLog((prev) => [`${car?.nameFa}: ERROR - ${data.error}`, ...prev]);
        showToast(data.error);
      }
    } catch (e) {
      setLog((prev) => [`${car?.nameFa}: ERROR - ${(e as Error).message}`, ...prev]);
    }
    setEnrichingId(null);
  };

  const enrichBatch = async () => {
    const needsWork = cars.filter((c) => !c.hasRichIntel || c.prosCount < 3);
    if (needsWork.length === 0) { showToast("همه خودروها غنی‌سازی شده‌اند"); return; }

    setBatchRunning(true);
    setBatchProgress({ done: 0, total: needsWork.length, current: "" });

    for (let i = 0; i < needsWork.length; i++) {
      const car = needsWork[i];
      setBatchProgress({ done: i, total: needsWork.length, current: car.nameFa });

      try {
        const res = await fetchAdmin("/api/admin/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carId: car.id }),
        });
        const data = await res.json();
        if (data.success) {
          setLog((prev) => [`${car.nameFa}: OK`, ...prev]);
        } else {
          setLog((prev) => [`${car.nameFa}: ${data.error?.slice(0, 80)}`, ...prev]);
        }
      } catch (e) {
        setLog((prev) => [`${car.nameFa}: ${(e as Error).message}`, ...prev]);
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 2000));
    }

    setBatchProgress({ done: needsWork.length, total: needsWork.length, current: "تمام!" });
    setBatchRunning(false);

    // Refresh data
    const updated = await fetchAdmin("/api/admin/enrich").then((r) => r.json());
    setCars(updated);
    showToast("غنی‌سازی batch تمام شد");
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black">غنی‌سازی داده‌ها</h1>
          <p className="text-[11px] text-muted mt-0.5">تولید داده‌های غنی و کاربرپسند با AI</p>
        </div>
        <button
          onClick={enrichBatch}
          disabled={batchRunning || stats.needsEnrich === 0}
          className="px-4 py-2 bg-primary text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-40"
        >
          {batchRunning ? (
            <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> {toPersianDigits(batchProgress.done)}/{toPersianDigits(batchProgress.total)}...</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> غنی‌سازی همه ({toPersianDigits(stats.needsEnrich)})</>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "کل خودرو", value: stats.total, color: "text-foreground", bg: "bg-background" },
          { label: "دارای توصیف", value: stats.withDesc, color: "text-primary", bg: "bg-primary/8" },
          { label: "دارای intel غنی", value: stats.withIntel, color: "text-accent", bg: "bg-accent/8" },
          { label: "نیاز به غنی‌سازی", value: stats.needsEnrich, color: "text-danger", bg: "bg-danger/8" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3.5 text-center`}>
            <div className={`text-xl font-black ${s.color}`}>{toPersianDigits(s.value)}</div>
            <div className="text-[9px] text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Batch progress */}
      {batchRunning && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold">در حال غنی‌سازی: {batchProgress.current}</span>
            <span className="text-[10px] text-muted">{toPersianDigits(batchProgress.done)} / {toPersianDigits(batchProgress.total)}</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Car list */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="text-right px-4 py-2.5 text-[10px] font-bold text-muted">خودرو</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-bold text-muted">توصیف</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-bold text-muted">Intel</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-bold text-muted">قوت</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-bold text-muted">نظرات</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-bold text-muted">رضایت</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-bold text-muted w-20"></th>
            </tr>
          </thead>
          <tbody>
            {cars.map((car) => {
              const needsWork = !car.hasRichIntel || car.prosCount < 3;
              return (
                <tr key={car.id} className={`border-b border-border/50 hover:bg-background/30 transition-colors ${needsWork ? "" : "opacity-60"}`}>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold">{car.nameFa}</span>
                    <span className="text-[9px] text-muted mr-1.5">{car.brandFa} | {getOriginLabel(car.origin)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {car.hasDescription ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent mx-auto"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger/40 mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {car.hasRichIntel ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent mx-auto"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger/40 mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[11px] font-bold">{toPersianDigits(car.prosCount)}</td>
                  <td className="px-3 py-2.5 text-center text-[11px] font-bold">{toPersianDigits(car.reviewCount)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[11px] font-bold ${car.satisfaction >= 7 ? "text-accent" : car.satisfaction >= 5 ? "text-primary" : "text-muted"}`}>
                      {car.satisfaction > 0 ? toPersianDigits(car.satisfaction) : "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => enrichSingle(car.id)}
                      disabled={enrichingId === car.id || batchRunning}
                      className="px-2 py-1 text-[9px] font-bold bg-primary/10 text-primary rounded-lg disabled:opacity-40"
                    >
                      {enrichingId === car.id ? "..." : "غنی‌سازی"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black">لاگ عملیات</h3>
            <button onClick={() => setLog([])} className="text-[9px] text-muted">پاک</button>
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {log.map((entry, i) => (
              <div key={i} className={`text-[10px] font-mono ${entry.includes("ERROR") ? "text-danger" : "text-muted"}`}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}
