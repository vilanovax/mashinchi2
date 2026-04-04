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

const SOURCE_LABELS: Record<string, string> = { bama: "باما", expert: "کارشناس", user: "کاربر", blog: "بلاگ" };

export default function AdminReviewsPage() {
  const { fetchAdmin } = useAdmin();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCar, setFilterCar] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [showAdd, setShowAdd] = useState(false);
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
      // Refresh
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

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black">مدیریت نظرات</h1>
        <div className="flex gap-2">
          <span className="text-sm text-muted">{toPersianDigits(filtered.length)} نظر</span>
          <button onClick={() => setShowAdd(true)} className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg">
            + نظر جدید
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={filterCar} onChange={(e) => setFilterCar(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none max-w-[200px]">
          <option value="all">همه خودروها</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.nameFa} - {c.brandFa}</option>)}
        </select>
        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none">
          <option value="all">همه منابع</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-2">
        {filtered.map((r) => (
          <div key={r.id} className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-sm font-bold">{r.carName}</span>
                <span className="text-xs text-muted mr-2">{r.carBrand}</span>
                <span className="text-[10px] bg-background px-2 py-0.5 rounded-full mr-2">{SOURCE_LABELS[r.source] || r.source}</span>
                {r.rating && <span className="text-[10px] font-bold text-primary">{toPersianDigits(r.rating.toFixed(1))}/۵</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditReview({ ...r })} className="p-1 text-muted hover:text-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                <button onClick={() => handleDelete(r.id)} className="p-1 text-muted hover:text-danger"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg></button>
              </div>
            </div>
            <p className="text-xs text-muted leading-5 mb-2">{r.summary}</p>
            <div className="flex gap-4 text-[10px]">
              {r.pros.length > 0 && <div className="text-accent">+ {r.pros.slice(0, 2).join(" | ")}</div>}
              {r.cons.length > 0 && <div className="text-danger">- {r.cons.slice(0, 2).join(" | ")}</div>}
            </div>
          </div>
        ))}
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
                <select value={newSource} onChange={(e) => setNewSource(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input type="number" step="0.1" min="1" max="5" value={newRating} onChange={(e) => setNewRating(e.target.value)} placeholder="امتیاز" className="w-20 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <textarea value={newSummary} onChange={(e) => setNewSummary(e.target.value)} placeholder="خلاصه نظر..." rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none resize-none" />
              {[{ label: "مزایا", items: newPros, set: setNewPros }, { label: "معایب", items: newCons, set: setNewCons }, { label: "هشدارها", items: newWarnings, set: setNewWarnings }].map(({ label, items, set }) => (
                <div key={label}>
                  <label className="text-[11px] font-bold mb-1 block">{label}</label>
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-1 mb-1">
                      <input value={item} onChange={(e) => { const n = [...items]; n[i] = e.target.value; set(n); }} className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none" />
                      <button onClick={() => set(items.filter((_, j) => j !== i))} className="text-danger/50 text-xs">x</button>
                    </div>
                  ))}
                  <button onClick={() => set([...items, ""])} className="text-[10px] text-primary">+ افزودن</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-background text-sm font-bold rounded-xl">انصراف</button>
              <button onClick={handleAdd} className="flex-1 py-2 bg-primary text-white text-sm font-bold rounded-xl">ذخیره</button>
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
              {[{ label: "مزایا", key: "pros" as const }, { label: "معایب", key: "cons" as const }, { label: "هشدارها", key: "warnings" as const }].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-[11px] font-bold mb-1 block">{label}</label>
                  {editReview[key].map((item, i) => (
                    <div key={i} className="flex gap-1 mb-1">
                      <input value={item} onChange={(e) => { const n = [...editReview[key]]; n[i] = e.target.value; setEditReview({ ...editReview, [key]: n }); }} className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none" />
                      <button onClick={() => setEditReview({ ...editReview, [key]: editReview[key].filter((_, j) => j !== i) })} className="text-danger/50 text-xs">x</button>
                    </div>
                  ))}
                  <button onClick={() => setEditReview({ ...editReview, [key]: [...editReview[key], ""] })} className="text-[10px] text-primary">+ افزودن</button>
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
