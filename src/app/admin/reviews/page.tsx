"use client";

import { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface Review {
  id: string; carId: string; carName: string; carBrand: string;
  source: string; summary: string; pros: string[]; cons: string[];
  warnings: string[]; rating: number | null; createdAt: string;
}

interface CarOption { id: string; nameFa: string; brandFa: string }

const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string; url: (car: string) => string }> = {
  bama: { label: "باما", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", url: (car) => `https://bama.ir/car/${car.toLowerCase().replace(/\s+/g, "-")}` },
  divar: { label: "دیوار", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", url: (car) => `https://divar.ir/s/tehran/car/${car.toLowerCase().replace(/\s+/g, "-")}` },
  expert: { label: "کارشناس", color: "text-accent", bg: "bg-accent/10", url: () => "#" },
  user: { label: "کاربر", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", url: () => "#" },
  blog: { label: "بلاگ", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", url: () => "#" },
};

const SOURCES = ["all", "bama", "expert", "user", "blog"] as const;

export default function AdminReviewsPage() {
  const { fetchAdmin } = useAdmin();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCar, setFilterCar] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshingCar, setRefreshingCar] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // New review form
  const [newCarId, setNewCarId] = useState("");
  const [newSource, setNewSource] = useState("expert");
  const [newSummary, setNewSummary] = useState("");
  const [newPros, setNewPros] = useState<string[]>([""]);
  const [newCons, setNewCons] = useState<string[]>([""]);
  const [newWarnings, setNewWarnings] = useState<string[]>([""]);
  const [newRating, setNewRating] = useState("3.5");

  useEffect(() => {
    Promise.all([
      fetchAdmin("/api/admin/reviews").then((r) => r.json()),
      fetchAdmin("/api/admin/cars").then((r) => r.json()),
    ]).then(([revData, carData]) => {
      setReviews(revData);
      setCars(carData.map((c: CarOption & Record<string, unknown>) => ({ id: c.id, nameFa: c.nameFa, brandFa: c.brandFa })));
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const filtered = reviews.filter((r) => {
    return (filterCar === "all" || r.carId === filterCar) && (filterSource === "all" || r.source === filterSource);
  });

  // Group by car for stats
  const carReviewCounts = reviews.reduce<Record<string, { count: number; lastDate: string }>>((acc, r) => {
    if (!acc[r.carId]) acc[r.carId] = { count: 0, lastDate: r.createdAt };
    acc[r.carId].count++;
    if (r.createdAt > acc[r.carId].lastDate) acc[r.carId].lastDate = r.createdAt;
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!newCarId || !newSummary) return;
    const res = await fetchAdmin("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carId: newCarId, source: newSource, summary: newSummary,
        pros: newPros.filter(Boolean), cons: newCons.filter(Boolean),
        warnings: newWarnings.filter(Boolean), rating: parseFloat(newRating) || null,
      }),
    });
    if (res.ok) {
      const data = await fetchAdmin("/api/admin/reviews").then((r) => r.json());
      setReviews(data);
      setShowAdd(false);
      setNewSummary(""); setNewPros([""]); setNewCons([""]); setNewWarnings([""]);
      showToast("نظر اضافه شد");
    }
  };

  const handleDelete = async (id: string) => {
    await fetchAdmin(`/api/admin/reviews/${id}`, { method: "DELETE" });
    setReviews((prev) => prev.filter((r) => r.id !== id));
    showToast("نظر حذف شد");
  };

  const handleUpdate = async () => {
    if (!editReview) return;
    await fetchAdmin(`/api/admin/reviews/${editReview.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: editReview.source, summary: editReview.summary,
        pros: editReview.pros, cons: editReview.cons,
        warnings: editReview.warnings, rating: editReview.rating,
      }),
    });
    setReviews((prev) => prev.map((r) => r.id === editReview.id ? editReview : r));
    setEditReview(null);
    showToast("نظر بروزرسانی شد");
  };

  // AI refresh reviews for a car
  const handleRefreshReviews = async (carId: string) => {
    setRefreshingCar(carId);
    try {
      const res = await fetchAdmin("/api/admin/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, type: "review" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          // Save the generated review
          await fetchAdmin("/api/admin/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ carId, source: "expert", ...data.result }),
          });
          // Reload reviews
          const revData = await fetchAdmin("/api/admin/reviews").then((r) => r.json());
          setReviews(revData);
          showToast("نظر جدید با AI تولید و ذخیره شد");
        }
      } else {
        showToast("خطا در تولید AI");
      }
    } catch {
      showToast("خطا در اتصال");
    }
    setRefreshingCar(null);
  };

  // Source stats
  const sourceStats = SOURCES.filter((s) => s !== "all").map((s) => ({
    key: s,
    count: reviews.filter((r) => r.source === s).length,
  }));

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const selectedCarName = filterCar !== "all" ? cars.find((c) => c.id === filterCar)?.nameFa : null;

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black">مدیریت نظرات</h1>
          <p className="text-[11px] text-muted mt-0.5">{toPersianDigits(filtered.length)} نظر {selectedCarName ? `برای ${selectedCarName}` : ""}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
          نظر جدید
        </button>
      </div>

      {/* Source Stats */}
      <div className="flex gap-2 mb-4">
        {sourceStats.map((s) => {
          const cfg = SOURCE_CONFIG[s.key];
          if (!cfg) return null;
          return (
            <div key={s.key} className={`${cfg.bg} rounded-lg px-3 py-2 flex items-center gap-2`}>
              <span className={`text-lg font-black ${cfg.color}`}>{toPersianDigits(s.count)}</span>
              <span className="text-[10px] text-muted">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Filter Chips */}
      <div className="space-y-2 mb-4">
        {/* Source chips */}
        <div className="flex gap-1.5 items-center">
          <span className="text-[10px] text-muted ml-1">منبع:</span>
          {SOURCES.map((s) => {
            const cfg = s !== "all" ? SOURCE_CONFIG[s] : null;
            return (
              <button
                key={s}
                onClick={() => setFilterSource(filterSource === s ? "all" : s)}
                className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-all border ${
                  filterSource === s
                    ? s === "all" ? "bg-primary text-white border-primary" : `${cfg?.bg} ${cfg?.color} border-current`
                    : "bg-surface border-border text-muted hover:text-foreground"
                }`}
              >
                {s === "all" ? "همه" : cfg?.label}
              </button>
            );
          })}
        </div>

        {/* Car filter */}
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-muted ml-1">خودرو:</span>
          <select
            value={filterCar}
            onChange={(e) => setFilterCar(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-[11px] outline-none max-w-[250px]"
          >
            <option value="all">همه خودروها</option>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameFa} - {c.brandFa} ({toPersianDigits(carReviewCounts[c.id]?.count || 0)} نظر)
              </option>
            ))}
          </select>
          {filterCar !== "all" && (
            <>
              <button
                onClick={() => handleRefreshReviews(filterCar)}
                disabled={refreshingCar === filterCar}
                className="px-3 py-1.5 bg-accent/10 text-accent text-[10px] font-bold rounded-lg flex items-center gap-1 disabled:opacity-50"
              >
                {refreshingCar === filterCar ? (
                  <><div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" /> تولید...</>
                ) : (
                  <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3" /></svg> تولید نظر AI</>
                )}
              </button>
              {carReviewCounts[filterCar] && (
                <span className="text-[9px] text-muted">
                  آخرین: {new Date(carReviewCounts[filterCar].lastDate).toLocaleDateString("fa-IR")}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-2">
        {filtered.map((r) => {
          const cfg = SOURCE_CONFIG[r.source] || { label: r.source, color: "text-muted", bg: "bg-background" };
          return (
            <div key={r.id} className="bg-surface rounded-xl border border-border overflow-hidden hover:border-primary/20 transition-colors">
              <div className="p-4">
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{r.carName}</span>
                    <span className="text-[10px] text-muted">{r.carBrand}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.rating && (
                      <div className="flex items-center gap-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} width="10" height="10" viewBox="0 0 24 24"
                              fill={star <= Math.round(r.rating!) ? "currentColor" : "none"}
                              stroke="currentColor" strokeWidth="2"
                              className={star <= Math.round(r.rating!) ? "text-amber-500" : "text-border"}
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold">{toPersianDigits(r.rating.toFixed(1))}</span>
                      </div>
                    )}
                    <span className="text-[9px] text-muted">{new Date(r.createdAt).toLocaleDateString("fa-IR")}</span>
                    <button onClick={() => setEditReview({ ...r })} className="p-1 text-muted hover:text-primary transition-colors" title="ویرایش">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="p-1 text-muted hover:text-danger transition-colors" title="حذف">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs text-muted leading-6 mb-2">{r.summary}</p>

                {/* Pros & Cons inline */}
                <div className="flex gap-4">
                  {r.pros.length > 0 && (
                    <div className="flex-1">
                      {r.pros.slice(0, 3).map((p, i) => (
                        <div key={i} className="flex items-start gap-1 text-[10px] mb-0.5">
                          <span className="text-accent font-bold shrink-0">+</span>
                          <span className="line-clamp-1">{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {r.cons.length > 0 && (
                    <div className="flex-1">
                      {r.cons.slice(0, 3).map((c, i) => (
                        <div key={i} className="flex items-start gap-1 text-[10px] mb-0.5">
                          <span className="text-danger font-bold shrink-0">-</span>
                          <span className="line-clamp-1">{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Warnings */}
                {r.warnings.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-border/50">
                    {r.warnings.slice(0, 2).map((w, i) => (
                      <div key={i} className="flex items-start gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                        <span className="font-bold shrink-0">!</span>
                        <span className="line-clamp-1">{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted mb-2">نظری پیدا نشد</p>
            {filterCar !== "all" && (
              <button
                onClick={() => handleRefreshReviews(filterCar)}
                disabled={!!refreshingCar}
                className="text-[11px] text-primary font-bold"
              >
                تولید نظر با AI
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Review Modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowAdd(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl p-6 z-50 shadow-2xl w-[500px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-sm font-black mb-4">نظر جدید</h3>
            <div className="space-y-3">
              <select value={newCarId} onChange={(e) => setNewCarId(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                <option value="">انتخاب خودرو...</option>
                {cars.map((c) => <option key={c.id} value={c.id}>{c.nameFa} - {c.brandFa}</option>)}
              </select>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-muted block mb-1">منبع</label>
                  <div className="flex gap-1">
                    {(["expert", "bama", "user", "blog"] as const).map((s) => {
                      const cfg = SOURCE_CONFIG[s];
                      return (
                        <button
                          key={s}
                          onClick={() => setNewSource(s)}
                          className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold transition-colors ${
                            newSource === s ? `${cfg.bg} ${cfg.color}` : "bg-background text-muted"
                          }`}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-1">امتیاز</label>
                  <input type="number" step="0.1" min="1" max="5" value={newRating} onChange={(e) => setNewRating(e.target.value)} className="w-16 bg-background border border-border rounded-lg px-2 py-1.5 text-sm outline-none text-center" />
                </div>
              </div>
              <textarea value={newSummary} onChange={(e) => setNewSummary(e.target.value)} placeholder="خلاصه نظر..." rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none resize-none" />
              {[{ label: "مزایا (+)", items: newPros, set: setNewPros, color: "text-accent" }, { label: "معایب (-)", items: newCons, set: setNewCons, color: "text-danger" }, { label: "هشدارها (!)", items: newWarnings, set: setNewWarnings, color: "text-amber-600" }].map(({ label, items, set, color }) => (
                <div key={label}>
                  <label className={`text-[11px] font-bold mb-1 block ${color}`}>{label}</label>
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-1 mb-1">
                      <input value={item} onChange={(e) => { const n = [...items]; n[i] = e.target.value; set(n); }} className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none" />
                      {items.length > 1 && <button onClick={() => set(items.filter((_, j) => j !== i))} className="text-danger/50 text-xs px-1">x</button>}
                    </div>
                  ))}
                  <button onClick={() => set([...items, ""])} className="text-[10px] text-primary font-bold">+ افزودن</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-background text-sm font-bold rounded-xl">انصراف</button>
              <button onClick={handleAdd} disabled={!newCarId || !newSummary} className="flex-1 py-2 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40">ذخیره</button>
            </div>
          </div>
        </>
      )}

      {/* Edit Review Modal */}
      {editReview && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setEditReview(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl p-6 z-50 shadow-2xl w-[500px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-sm font-black mb-4">ویرایش نظر - {editReview.carName}</h3>
            <div className="space-y-3">
              <textarea value={editReview.summary} onChange={(e) => setEditReview({ ...editReview, summary: e.target.value })} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none resize-none" />
              {[{ label: "مزایا (+)", key: "pros" as const, color: "text-accent" }, { label: "معایب (-)", key: "cons" as const, color: "text-danger" }, { label: "هشدارها (!)", key: "warnings" as const, color: "text-amber-600" }].map(({ label, key, color }) => (
                <div key={key}>
                  <label className={`text-[11px] font-bold mb-1 block ${color}`}>{label}</label>
                  {editReview[key].map((item, i) => (
                    <div key={i} className="flex gap-1 mb-1">
                      <input value={item} onChange={(e) => { const n = [...editReview[key]]; n[i] = e.target.value; setEditReview({ ...editReview, [key]: n }); }} className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none" />
                      <button onClick={() => setEditReview({ ...editReview, [key]: editReview[key].filter((_, j) => j !== i) })} className="text-danger/50 text-xs px-1">x</button>
                    </div>
                  ))}
                  <button onClick={() => setEditReview({ ...editReview, [key]: [...editReview[key], ""] })} className="text-[10px] text-primary font-bold">+ افزودن</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditReview(null)} className="flex-1 py-2 bg-background text-sm font-bold rounded-xl">انصراف</button>
              <button onClick={handleUpdate} className="flex-1 py-2 bg-primary text-white text-sm font-bold rounded-xl">بروزرسانی</button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}
