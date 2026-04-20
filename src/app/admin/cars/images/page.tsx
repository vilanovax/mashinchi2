"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../../layout";

interface Car {
  id: string;
  nameFa: string;
  brandFa: string;
  nameEn: string;
  brand: string;
  year: number;
  imageUrl: string | null;
}

interface Candidate {
  url: string;
  source: string;
  title?: string;
}

interface SourceResult {
  source: string;
  status: "ok" | "empty" | "error";
  count: number;
  error?: string;
}

interface CarCandidates {
  carId: string;
  candidates: Candidate[];
  sourceResults: SourceResult[];
}

const SOURCES = [
  { key: "google", label: "گوگل" },
  { key: "wikipedia", label: "ویکی‌پدیا" },
  { key: "bama", label: "بما" },
  { key: "carir", label: "کارآیر" },
  { key: "pedal", label: "پدال" },
];

export default function AdminCarImagesPage() {
  const { fetchAdmin } = useAdmin();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedSources, setSelectedSources] = useState<string[]>(SOURCES.map((s) => s.key));
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
  const [sourceStats, setSourceStats] = useState<Record<string, SourceResult[]>>({});
  const [perSourceLimit, setPerSourceLimit] = useState(5);
  const [fetching, setFetching] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [filterNoImage, setFilterNoImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const loadCars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/cars?full=true");
      if (res.ok) {
        const data = await res.json();
        setCars(Array.isArray(data) ? data : data.cars || []);
      }
    } catch {}
    setLoading(false);
  }, [fetchAdmin]);

  useEffect(() => { loadCars(); }, [loadCars]);

  const filtered = cars.filter((c) => {
    if (filterNoImage && c.imageUrl) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.nameFa.includes(q) || c.nameEn.toLowerCase().includes(q) || c.brandFa.includes(q) || c.brand.toLowerCase().includes(q);
    }
    return true;
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(filtered.map((c) => c.id)));
  };

  const fetchCandidates = async (carIds?: string[]) => {
    const ids = carIds || Array.from(selected);
    if (ids.length === 0) { showToast("هیچ خودرویی انتخاب نشده"); return; }
    if (ids.length > 20) { showToast("حداکثر ۲۰ خودرو در هر درخواست"); return; }
    if (selectedSources.length === 0) { showToast("حداقل یک منبع انتخاب کن"); return; }

    setFetching(true);
    try {
      const res = await fetchAdmin("/api/admin/images/fetch-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carIds: ids, sources: selectedSources, perSourceLimit }),
      });
      if (res.ok) {
        const data = await res.json();
        const cMap: Record<string, Candidate[]> = { ...candidates };
        const sMap: Record<string, SourceResult[]> = { ...sourceStats };
        for (const r of data.results as CarCandidates[]) {
          cMap[r.carId] = r.candidates;
          sMap[r.carId] = r.sourceResults || [];
        }
        setCandidates(cMap);
        setSourceStats(sMap);
        const totalFound = data.results.reduce((s: number, r: CarCandidates) => s + r.candidates.length, 0);
        showToast(`${totalFound} کاندیدا پیدا شد`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "خطا در دریافت");
      }
    } catch {
      showToast("خطا در ارتباط");
    }
    setFetching(false);
  };

  const approveImage = async (carId: string, imageUrl: string) => {
    setApproving(carId);
    try {
      const res = await fetchAdmin("/api/admin/images/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, imageUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setCars((prev) => prev.map((c) => (c.id === carId ? { ...c, imageUrl: data.imageUrl } : c)));
        setCandidates((prev) => {
          const n = { ...prev };
          delete n[carId];
          return n;
        });
        showToast("تصویر ذخیره شد");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "خطا در ذخیره");
      }
    } catch {
      showToast("خطا در ارتباط");
    }
    setApproving(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const missingCount = cars.filter((c) => !c.imageUrl).length;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-black mb-1">مدیریت تصاویر خودروها</h1>
        <p className="text-xs text-muted">
          {missingCount > 0 ? `${missingCount} خودرو بدون تصویر` : "همه خودروها تصویر دارند"}
        </p>
      </div>

      {/* Controls */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-5 space-y-3 sticky top-0 z-20">
        {/* Sources + per-source limit */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] font-bold text-muted">منابع دریافت</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSources(SOURCES.map((s) => s.key))}
                className="text-[9px] text-primary font-bold hover:underline"
              >
                همه
              </button>
              <button
                onClick={() => setSelectedSources([])}
                className="text-[9px] text-danger font-bold hover:underline"
              >
                هیچ
              </button>
              <div className="w-px h-3 bg-border" />
              <label className="text-[10px] text-muted flex items-center gap-1">
                حداکثر هر منبع:
                <select
                  value={perSourceLimit}
                  onChange={(e) => setPerSourceLimit(Number(e.target.value))}
                  className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px] font-bold outline-none"
                >
                  {[3, 5, 8, 10].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SOURCES.map((s) => {
              const on = selectedSources.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() =>
                    setSelectedSources((prev) =>
                      on ? prev.filter((x) => x !== s.key) : [...prev, s.key]
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors border ${
                    on ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border text-muted"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter + Search */}
        <div className="flex items-center gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام یا برند..."
            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary"
          />
          <label className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer shrink-0">
            <input type="checkbox" checked={filterNoImage} onChange={(e) => setFilterNoImage(e.target.checked)} className="accent-primary" />
            فقط بدون تصویر
          </label>
        </div>

        {/* Batch actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <span className="text-[11px] text-muted">
            {selected.size} انتخاب شده
          </span>
          <button
            onClick={selectAllVisible}
            className="text-[11px] text-primary font-bold hover:underline"
          >
            انتخاب همه نمایش‌داده شده
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-[11px] text-danger font-bold hover:underline"
            >
              پاک کردن
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => fetchCandidates()}
            disabled={fetching || selected.size === 0}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-40 flex items-center gap-1.5 active:scale-[0.98]"
          >
            {fetching ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                در حال دریافت...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                دریافت کاندیدا ({selected.size})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cars List */}
      <div className="space-y-2">
        {filtered.map((car) => {
          const carCands = candidates[car.id] || [];
          const carStats = sourceStats[car.id] || [];
          const isSelected = selected.has(car.id);
          return (
            <div key={car.id} className={`bg-surface rounded-xl border transition-colors ${
              isSelected ? "border-primary" : "border-border"
            }`}>
              <div className="flex items-center gap-3 p-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(car.id)}
                  className="accent-primary w-4 h-4"
                />
                {/* Current image */}
                {car.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={car.imageUrl} alt={car.nameFa} className="w-14 h-10 object-cover rounded-md border border-border" />
                ) : (
                  <div className="w-14 h-10 bg-background rounded-md border border-dashed border-border flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/40">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{car.nameFa}</div>
                  <div className="text-[10px] text-muted">{car.brandFa} • {car.nameEn}</div>
                </div>
                <button
                  onClick={() => fetchCandidates([car.id])}
                  disabled={fetching}
                  className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/15 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  دریافت کاندیدا
                </button>
              </div>

              {/* Source status chips — visible whenever a fetch has run */}
              {carStats.length > 0 && (
                <div className="border-t border-border px-3 py-2 flex flex-wrap gap-1.5 bg-background/50">
                  {carStats.map((ss) => {
                    const label = SOURCES.find((x) => x.key === ss.source)?.label || ss.source;
                    const color =
                      ss.status === "ok" ? "bg-accent/10 text-accent border-accent/20"
                      : ss.status === "empty" ? "bg-muted/10 text-muted border-border"
                      : "bg-danger/10 text-danger border-danger/20";
                    const icon =
                      ss.status === "ok" ? "✓"
                      : ss.status === "empty" ? "•"
                      : "✗";
                    return (
                      <span
                        key={ss.source}
                        title={ss.error || (ss.status === "empty" ? "نتیجه‌ای پیدا نشد" : `${ss.count} نتیجه`)}
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}
                      >
                        <span>{icon}</span>
                        {label}
                        {ss.count > 0 && <span className="opacity-70">{ss.count}</span>}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Candidates grid */}
              {carCands.length > 0 && (
                <div className="border-t border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-muted">{carCands.length} کاندیدا</span>
                    <button
                      onClick={() => fetchCandidates([car.id])}
                      disabled={fetching}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      دریافت مجدد
                    </button>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {carCands.map((cand, i) => (
                      <button
                        key={i}
                        onClick={() => approveImage(car.id, cand.url)}
                        disabled={approving === car.id}
                        className="group relative aspect-4/3 bg-background rounded-lg overflow-hidden border border-border hover:border-primary transition-colors disabled:opacity-50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cand.url}
                          alt={cand.title || ""}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <div className="absolute top-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                          {cand.source}
                        </div>
                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                          {approving === car.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-muted">خودرویی پیدا نشد</div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
