"use client";

import { useState, useEffect, useMemo } from "react";
import { formatPrice, toPersianDigits, formatPriceRange } from "@/lib/utils";
import { useAdmin } from "../layout";

interface PriceEntry { id: string; carId: string; price: string; date: string; source: string }
interface CarOption { id: string; nameFa: string; brandFa: string; priceMin: string; priceMax: string }

interface ImportItem {
  name?: string;
  brand?: string;
  model?: string;
  trim?: string;
  marketPrice?: number;
  price?: number;
  changePct?: number;
  change?: number;
  carId: string | null;
  carNameFa: string | null;
  matchScore: number;
}

interface ImportResult {
  total: number;
  matched: number;
  unmatched: number;
  items: ImportItem[];
}

export default function AdminPricesPage() {
  const { fetchAdmin } = useAdmin();
  const [cars, setCars] = useState<CarOption[]>([]);
  const [selectedCar, setSelectedCar] = useState<string>("");
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newSource, setNewSource] = useState("manual");
  const [toast, setToast] = useState<string | null>(null);
  const [carSearch, setCarSearch] = useState("");
  const [showCarList, setShowCarList] = useState(false);
  const [listFilter, setListFilter] = useState<"all" | "priced" | "unpriced">("all");

  // Quick edit state
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Import modal state
  const [showImport, setShowImport] = useState(false);
  const [importSource, setImportSource] = useState<"carir" | "bama">("carir");
  const [pasteText, setPasteText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [importDate, setImportDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchAdmin("/api/admin/cars").then((r) => r.json()).then((d: CarOption[]) => {
      setCars(d.map((c) => ({ id: c.id, nameFa: c.nameFa, brandFa: c.brandFa, priceMin: c.priceMin, priceMax: c.priceMax })));
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPrices = async (carId: string) => {
    setSelectedCar(carId);
    setShowCarList(false);
    if (!carId) { setPrices([]); return; }
    setPriceLoading(true);
    const data = await fetchAdmin(`/api/admin/prices?carId=${carId}`).then((r) => r.json());
    setPrices(data);
    setPriceLoading(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleAdd = async () => {
    if (!selectedCar || !newPrice) return;
    await fetchAdmin("/api/admin/prices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId: selectedCar, price: newPrice, date: newDate, source: newSource }),
    });
    loadPrices(selectedCar);
    setNewPrice("");
    showToast("قیمت ثبت شد");
  };

  const selectedCarData = cars.find((c) => c.id === selectedCar);

  const filteredCars = useMemo(() => {
    let list = cars;
    if (listFilter === "priced") list = list.filter((c) => parseInt(c.priceMin) > 0 || parseInt(c.priceMax) > 0);
    else if (listFilter === "unpriced") list = list.filter((c) => parseInt(c.priceMin) === 0 && parseInt(c.priceMax) === 0);
    if (carSearch.trim()) {
      const q = carSearch.toLowerCase();
      list = list.filter((c) => c.nameFa.includes(q) || c.brandFa.includes(q) || c.nameFa.toLowerCase().includes(q));
    }
    return list;
  }, [cars, carSearch, listFilter]);

  const pricedCount = useMemo(() => cars.filter((c) => parseInt(c.priceMin) > 0 || parseInt(c.priceMax) > 0).length, [cars]);
  const unpricedCount = useMemo(() => cars.filter((c) => parseInt(c.priceMin) === 0 && parseInt(c.priceMax) === 0).length, [cars]);

  // Price stats
  const priceStats = useMemo(() => {
    if (prices.length === 0) return null;
    const nums = prices.map((p) => parseInt(p.price));
    const latest = nums[0];
    const oldest = nums[nums.length - 1];
    const change = oldest > 0 ? Math.round(((latest - oldest) / oldest) * 100) : 0;
    const max = Math.max(...nums);
    const min = Math.min(...nums);
    return { latest, oldest, change, max, min, count: prices.length };
  }, [prices]);

  // Sort prices chronologically for chart (oldest first)
  const chartPrices = useMemo(() => [...prices].reverse(), [prices]);

  // ── Import modal handlers ──
  const handleParse = async () => {
    if (!pasteText.trim()) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      let res: Response;
      if (importSource === "carir") {
        res = await fetchAdmin("/api/admin/carir-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "parse", text: pasteText }),
        });
      } else {
        res = await fetchAdmin("/api/admin/bama-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "parse_paste", text: pasteText, priceType: "market" }),
        });
      }
      const data = await res.json();
      if (data.error) {
        showToast(data.error);
      } else {
        setImportResult(data);
        showToast(`${toPersianDigits(data.matched)} مچ از ${toPersianDigits(data.total)}`);
      }
    } catch {
      showToast("خطا در پردازش");
    } finally {
      setImportLoading(false);
    }
  };

  const handleApplyImport = async () => {
    if (!importResult) return;
    const matchedItems = importResult.items.filter((i) => i.carId);
    if (matchedItems.length === 0) return;
    setApplying(true);
    try {
      let res: Response;
      if (importSource === "carir") {
        res = await fetchAdmin("/api/admin/carir-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "apply", items: matchedItems, date: importDate }),
        });
      } else {
        res = await fetchAdmin("/api/admin/bama-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "apply", items: matchedItems, priceType: "market" }),
        });
      }
      const data = await res.json();
      showToast(`${toPersianDigits(data.applied)} قیمت ثبت شد`);
      setShowImport(false);
      setPasteText("");
      setImportResult(null);
    } catch {
      showToast("خطا در ثبت");
    } finally {
      setApplying(false);
    }
  };

  const clearImportMatch = (index: number) => {
    if (!importResult) return;
    const items = [...importResult.items];
    items[index] = { ...items[index], carId: null, carNameFa: null, matchScore: 0 };
    setImportResult({ ...importResult, items, matched: items.filter((i) => i.carId).length, unmatched: items.filter((i) => !i.carId).length });
  };

  const getItemName = (item: ImportItem) => item.name || [item.brand, item.model, item.trim].filter(Boolean).join(" ");
  const getItemPrice = (item: ImportItem) => item.marketPrice || item.price || 0;
  const getItemChange = (item: ImportItem) => item.changePct ?? item.change ?? 0;

  // Convert billions input (e.g. "1.8" or "۱.۸") to toman
  const handleAddBillions = async () => {
    if (!selectedCar || !newPrice) return;
    const latin = newPrice.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const num = parseFloat(latin);
    if (isNaN(num) || num <= 0) return;
    const toman = Math.round(num * 1_000_000_000);
    await fetchAdmin("/api/admin/prices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId: selectedCar, price: toman.toString(), date: newDate, source: newSource }),
    });
    loadPrices(selectedCar);
    setNewPrice("");
    showToast("قیمت ثبت شد");
  };

  const startEdit = (car: CarOption, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCarId(car.id);
    const min = parseInt(car.priceMin);
    setEditPrice(min > 0 ? (min / 1_000_000_000).toFixed(1) : "");
  };

  const cancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingCarId(null);
    setEditPrice("");
  };

  const saveEdit = async (carId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editPrice.trim()) return;
    const latin = editPrice.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const num = parseFloat(latin);
    if (isNaN(num) || num <= 0) return;
    const toman = Math.round(num * 1_000_000_000);
    setEditSaving(true);
    try {
      // Update car price
      await fetchAdmin(`/api/admin/cars/${carId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ car: { priceMin: toman.toString(), priceMax: toman.toString() } }),
      });
      // Add price history entry
      await fetchAdmin("/api/admin/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, price: toman.toString(), date: new Date().toISOString().split("T")[0], source: "manual" }),
      });
      // Update local state
      setCars((prev) => prev.map((c) => c.id === carId ? { ...c, priceMin: toman.toString(), priceMax: toman.toString() } : c));
      showToast("قیمت به‌روز شد");
    } catch {
      showToast("خطا در ذخیره");
    } finally {
      setEditSaving(false);
      setEditingCarId(null);
      setEditPrice("");
    }
  };

  const openImport = () => {
    setShowImport(true);
    setPasteText("");
    setImportResult(null);
    setImportDate(new Date().toISOString().split("T")[0]);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-black">قیمت‌ها</h1>
          <p className="text-[10px] text-muted">
            {toPersianDigits(pricedCount)} دارای قیمت از {toPersianDigits(cars.length)} · {toPersianDigits(unpricedCount)} بدون قیمت
          </p>
        </div>
        <button onClick={openImport}
          className="px-3.5 py-2 bg-primary text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-primary/20">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          ورود دسته‌جمعی
        </button>
      </div>

      {/* Dashboard view when no car selected */}
      {!selectedCar && (
        <div>
          {/* Search + Filters — single row */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1 max-w-[220px]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                value={carSearch}
                onChange={(e) => setCarSearch(e.target.value)}
                placeholder="جستجو..."
                className="w-full bg-surface border border-border rounded-lg pr-8 pl-3 py-1.5 text-[11px] outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-1">
              {[
                { key: "all" as const, label: "همه", count: cars.length },
                { key: "priced" as const, label: "دارای قیمت", count: pricedCount },
                { key: "unpriced" as const, label: "بدون قیمت", count: unpricedCount },
              ].map((f) => (
                <button key={f.key} onClick={() => setListFilter(f.key)}
                  className={`px-2.5 py-1.5 rounded-full text-[9px] font-bold transition-all border ${
                    listFilter === f.key ? "bg-primary text-white border-primary" : "bg-surface border-border text-muted"
                  }`}>
                  {f.label} {toPersianDigits(f.count)}
                </button>
              ))}
            </div>
          </div>

          {/* Car list — table style */}
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border/30 max-h-[75vh] overflow-y-auto">
              {filteredCars.map((c) => {
                const hasPrice = parseInt(c.priceMin) > 0 || parseInt(c.priceMax) > 0;
                const minNum = parseInt(c.priceMin);
                const maxNum = parseInt(c.priceMax);
                const isEditing = editingCarId === c.id;
                return (
                  <div key={c.id}
                    className="w-full text-right px-3 py-1.5 hover:bg-primary/5 flex items-center gap-2 transition-colors cursor-pointer"
                    onClick={() => { if (!isEditing) { setCarSearch(""); loadPrices(c.id); } }}>
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold">{c.nameFa}</span>
                      <span className="text-[9px] text-muted mr-1.5">{c.brandFa}</span>
                    </div>

                    {/* Price display / inline edit */}
                    {isEditing ? (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(c.id, e as unknown as React.MouseEvent); if (e.key === "Escape") cancelEdit(); }}
                          type="text" inputMode="decimal"
                          placeholder="۱.۸"
                          className="w-16 bg-background border border-primary/30 rounded px-2 py-1 text-[10px] font-bold outline-none text-center focus:border-primary"
                        />
                        <span className="text-[8px] text-muted">میلیارد</span>
                        <button onClick={(e) => saveEdit(c.id, e)} disabled={editSaving}
                          className="w-5 h-5 flex items-center justify-center rounded bg-emerald-500 text-white disabled:opacity-50">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
                        </button>
                        <button onClick={cancelEdit}
                          className="w-5 h-5 flex items-center justify-center rounded bg-background border border-border text-muted">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="shrink-0 w-36 text-left flex items-center justify-end gap-1">
                        {hasPrice ? (
                          <span className="text-[11px] font-black text-foreground">
                            {toPersianDigits(formatBillion(minNum))}
                            {maxNum > 0 && maxNum !== minNum && (
                              <span className="text-[9px] text-muted font-normal"> ~ {toPersianDigits(formatBillion(maxNum))}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted/40">—</span>
                        )}
                        <button onClick={(e) => startEdit(c, e)} title="ویرایش سریع"
                          className="w-5 h-5 flex items-center justify-center rounded text-muted/30 hover:text-primary hover:bg-primary/5 transition-colors">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredCars.length === 0 && (
                <div className="p-6 text-center text-xs text-muted">خودرویی یافت نشد</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Car detail — search overlay for switching */}
      {selectedCar && (
        <div className="relative mb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                value={carSearch || (selectedCarData ? `${selectedCarData.nameFa} - ${selectedCarData.brandFa}` : "")}
                onChange={(e) => { setCarSearch(e.target.value); setShowCarList(true); if (selectedCar) { setSelectedCar(""); setPrices([]); } }}
                onFocus={() => setShowCarList(true)}
                placeholder="جستجوی خودرو..."
                className="w-full bg-surface border border-border rounded-lg pr-8 pl-3 py-1.5 text-[11px] outline-none focus:border-primary"
              />
            </div>
            {selectedCar && (
              <button onClick={() => { setSelectedCar(""); setPrices([]); setCarSearch(""); setShowCarList(false); }}
                className="text-[10px] text-muted hover:text-foreground font-bold">بازگشت به لیست</button>
            )}
          </div>

          {/* Dropdown */}
          {showCarList && !selectedCar && (
            <div className="absolute z-20 top-full mt-1 w-full bg-surface border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
              {filteredCars.length === 0 ? (
                <div className="p-3 text-center text-[10px] text-muted">یافت نشد</div>
              ) : (
                filteredCars.slice(0, 15).map((c) => (
                  <button key={c.id} onClick={() => { setCarSearch(""); loadPrices(c.id); }}
                    className="w-full text-right px-3 py-1.5 hover:bg-primary/5 flex items-center justify-between text-[11px] border-b border-border/30 last:border-0">
                    <span className="font-bold">{c.nameFa} <span className="text-muted font-normal">{c.brandFa}</span></span>
                  </button>
                ))
              )}
            </div>
          )}
          {showCarList && !selectedCar && <div className="fixed inset-0 z-10" onClick={() => setShowCarList(false)} />}
        </div>
      )}

      {/* Car detail view */}
      {selectedCar && (
        <>
          {/* Car header */}
          {selectedCarData && (
            <div className="bg-surface rounded-xl border border-border p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setSelectedCar(""); setPrices([]); setCarSearch(""); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-background border border-border text-muted hover:text-foreground transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                  </button>
                  <div>
                    <span className="text-base font-black">{selectedCarData.nameFa}</span>
                    <span className="text-xs text-muted mr-2">{selectedCarData.brandFa}</span>
                  </div>
                </div>
              </div>

              {/* Price + Stats inline */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-primary/8 rounded-lg px-3 py-2">
                  <div className="text-[9px] text-primary/60 mb-0.5">قیمت فعلی</div>
                  <div className="text-lg font-black text-primary leading-tight">{toBillions(parseInt(selectedCarData.priceMin), parseInt(selectedCarData.priceMax))}</div>
                </div>
                {priceStats && (
                  <>
                    <div className="bg-background rounded-lg px-3 py-2 border border-border">
                      <div className="text-[9px] text-muted mb-0.5">آخرین ثبت</div>
                      <div className="text-sm font-black leading-tight">{toPersianDigits(formatBillion(priceStats.latest))}</div>
                    </div>
                    <div className="bg-background rounded-lg px-3 py-2 border border-border">
                      <div className="text-[9px] text-muted mb-0.5">تغییر</div>
                      <div className={`text-sm font-black leading-tight ${priceStats.change > 0 ? "text-red-500" : priceStats.change < 0 ? "text-emerald-500" : "text-muted"}`}>
                        {priceStats.change > 0 ? "+" : ""}{toPersianDigits(priceStats.change)}%
                      </div>
                    </div>
                    <div className="bg-background rounded-lg px-3 py-2 border border-border">
                      <div className="text-[9px] text-muted mb-0.5">{toPersianDigits(priceStats.count)} ثبت</div>
                      <div className="text-sm font-black leading-tight">
                        {toPersianDigits(formatBillion(priceStats.min))} ~ {toPersianDigits(formatBillion(priceStats.max))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {priceLoading ? (
            <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : (
            <>
              {/* SVG Line Chart */}
              {chartPrices.length > 1 && (
                <div className="bg-surface rounded-xl border border-border p-4 mb-4">
                  <h3 className="text-xs font-black mb-3">نمودار روند قیمت</h3>
                  <PriceLineChart prices={chartPrices} />
                </div>
              )}

              {/* Add price form */}
              <div className="bg-surface rounded-xl border border-border p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black">ثبت قیمت جدید</h3>
                  {selectedCarData && parseInt(selectedCarData.priceMin) > 0 && (
                    <span className="text-[9px] text-muted">قیمت فعلی: {toPersianDigits(formatBillion(parseInt(selectedCarData.priceMin)))}</span>
                  )}
                </div>
                <div className="flex gap-2 items-end flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] text-muted block mb-1">قیمت (میلیارد تومان)</label>
                    <div className="flex items-center gap-1.5">
                      <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="text" inputMode="decimal"
                        placeholder={selectedCarData ? formatBillionInput(parseInt(selectedCarData.priceMin)) : "۱.۸"}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
                      <span className="text-[10px] text-muted shrink-0">میلیارد</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted block mb-1">تاریخ</label>
                    <input value={newDate} onChange={(e) => setNewDate(e.target.value)} type="date"
                      className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted block mb-1">منبع</label>
                    <select value={newSource} onChange={(e) => setNewSource(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                      <option value="manual">دستی</option><option value="bama">باما</option><option value="divar">دیوار</option><option value="car.ir">car.ir</option>
                    </select>
                  </div>
                  <button onClick={handleAddBillions} disabled={!newPrice}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shrink-0 disabled:opacity-50">ثبت</button>
                </div>
              </div>

              {/* Price history table */}
              {prices.length > 0 ? (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-xs font-black">جدول تاریخچه ({toPersianDigits(prices.length)} ثبت)</h3>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface border-b border-border">
                        <tr>
                          <th className="text-right text-[10px] text-muted font-normal px-4 py-2">تاریخ</th>
                          <th className="text-right text-[10px] text-muted font-normal px-4 py-2">قیمت</th>
                          <th className="text-right text-[10px] text-muted font-normal px-4 py-2">تغییر</th>
                          <th className="text-right text-[10px] text-muted font-normal px-4 py-2">منبع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {prices.map((p, i) => {
                          const curr = parseInt(p.price);
                          const prev = i < prices.length - 1 ? parseInt(prices[i + 1].price) : curr;
                          const changePct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
                          return (
                            <tr key={p.id} className="hover:bg-primary/3 transition-colors">
                              <td className="px-4 py-2.5 text-xs text-muted">{toPersianDigits(new Date(p.date).toLocaleDateString("fa-IR"))}</td>
                              <td className="px-4 py-2.5 text-xs font-bold">{toPersianDigits(formatBillion(parseInt(p.price)))}</td>
                              <td className="px-4 py-2.5">
                                {changePct !== 0 ? (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    changePct > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                                  }`}>
                                    {changePct > 0 ? "+" : ""}{toPersianDigits(changePct.toFixed(1))}%
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted/30">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  p.source === "bama" ? "bg-blue-500/10 text-blue-500" :
                                  p.source === "divar" ? "bg-violet-500/10 text-violet-500" :
                                  p.source === "car.ir" ? "bg-emerald-500/10 text-emerald-500" :
                                  "bg-foreground/5 text-muted"
                                }`}>
                                  {p.source === "manual" ? "دستی" : p.source === "bama" ? "باما" : p.source === "divar" ? "دیوار" : p.source}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-muted/20 mb-3">
                    <path d="M3 3v18h18" /><path d="m7 14 4-4 4 4 5-5" />
                  </svg>
                  <p className="text-sm text-muted">قیمتی ثبت نشده</p>
                  <p className="text-[10px] text-muted/50 mt-1">از فرم بالا قیمت جدید ثبت کنید یا از دکمه + وارد کنید</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Import Modal ── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowImport(false); setImportResult(null); setPasteText(""); }} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4">
            {/* Modal header */}
            <div className="sticky top-0 bg-background border-b border-border rounded-t-2xl px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-sm font-black">ورود قیمت دسته‌جمعی</h2>
              <button onClick={() => { setShowImport(false); setImportResult(null); setPasteText(""); }} className="text-muted hover:text-foreground">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5">
              {/* Source selector */}
              <div className="flex gap-2 mb-4">
                {[
                  { key: "carir" as const, label: "car.ir", url: "car.ir/prices" },
                  { key: "bama" as const, label: "باما", url: "bama.ir/price" },
                ].map((s) => (
                  <button key={s.key} onClick={() => { setImportSource(s.key); setImportResult(null); }}
                    className={`flex-1 px-4 py-3 rounded-xl border text-center transition-all ${
                      importSource === s.key
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-surface text-muted hover:border-primary/30"
                    }`}>
                    <div className="text-sm font-black">{s.label}</div>
                    <div className="text-[9px] mt-0.5 opacity-60">{s.url}</div>
                  </button>
                ))}
              </div>

              {/* Instructions */}
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mb-3">
                <ol className="text-[10px] text-muted space-y-0.5 list-decimal list-inside">
                  <li>صفحه{" "}
                    <a href={importSource === "carir" ? "https://car.ir/prices" : "https://bama.ir/price"} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      {importSource === "carir" ? "car.ir/prices" : "bama.ir/price"}
                    </a>{" "}
                    را باز کنید
                  </li>
                  <li>جدول قیمت را انتخاب و کپی کنید</li>
                  <li>در کادر زیر پیست کنید</li>
                </ol>
              </div>

              {/* Paste area */}
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={6}
                placeholder={importSource === "carir"
                  ? "جک J4\n۱,۷۳۰,۰۰۰,۰۰۰\n۱,۲۳۵,۰۰۰,۰۰۰\n(%۶.۴۹)\n۱۲۰,۱۰۰,۰۰۰"
                  : "نیسان ,\nآلتیما ,\n2.0 لیتر\n2025\nقیمت بازار\n0%\n6,800,000,000\nتومان"}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-xs outline-none resize-none mb-3 font-mono leading-5" dir="rtl"
              />

              <div className="flex items-center gap-3 mb-4">
                <button onClick={handleParse} disabled={importLoading || !pasteText.trim()}
                  className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-50">
                  {importLoading ? "پردازش..." : "پردازش"}
                </button>
                {pasteText.length > 0 && (
                  <span className="text-[10px] text-muted">{toPersianDigits(pasteText.split("\n").filter(Boolean).length)} خط</span>
                )}
              </div>

              {/* Results */}
              {importResult && (
                <div>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-surface rounded-lg border border-border p-2.5 text-center">
                      <div className="text-base font-black text-primary">{toPersianDigits(importResult.total)}</div>
                      <div className="text-[8px] text-muted">کل</div>
                    </div>
                    <div className="bg-surface rounded-lg border border-border p-2.5 text-center">
                      <div className="text-base font-black text-emerald-500">{toPersianDigits(importResult.matched)}</div>
                      <div className="text-[8px] text-muted">مچ شده</div>
                    </div>
                    <div className="bg-surface rounded-lg border border-border p-2.5 text-center">
                      <div className="text-base font-black text-amber-500">{toPersianDigits(importResult.unmatched)}</div>
                      <div className="text-[8px] text-muted">بدون مچ</div>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-1 max-h-[300px] overflow-y-auto mb-3">
                    {importResult.items.map((item, i) => (
                      <div key={i} className={`rounded-lg border p-2.5 flex items-center gap-2 text-xs ${
                        item.carId
                          ? item.matchScore >= 80 ? "bg-emerald-500/3 border-emerald-500/15" : "bg-amber-500/3 border-amber-500/15"
                          : "bg-surface border-border"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          item.carId ? (item.matchScore >= 80 ? "bg-emerald-500" : "bg-amber-500") : "bg-red-400/40"
                        }`} />
                        <span className="font-bold flex-1 truncate">{getItemName(item)}</span>
                        <span className="text-muted w-24 text-left shrink-0">
                          {item.carId ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {item.carNameFa} <span className="text-[8px] opacity-60">{toPersianDigits(item.matchScore)}%</span>
                            </span>
                          ) : "—"}
                        </span>
                        <span className="font-black w-20 text-left shrink-0">{getItemPrice(item) > 0 ? toPersianDigits(formatPrice(getItemPrice(item))) : "—"}</span>
                        {item.carId && (
                          <button onClick={() => clearImportMatch(i)} className="text-muted hover:text-red-400 shrink-0">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Apply */}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted">تاریخ ثبت:</label>
                      <input type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)}
                        className="bg-surface border border-border rounded-lg px-2 py-1 text-[10px] outline-none" />
                    </div>
                    <button onClick={handleApplyImport} disabled={applying || importResult.matched === 0}
                      className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                      {applying ? "..." : `ثبت ${toPersianDigits(importResult.matched)} قیمت`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

// Format number to billions string: 1730000000 → "۱.۷۳ میلیارد"
function formatBillion(num: number): string {
  if (!num || num === 0) return "—";
  if (num >= 1_000_000_000) {
    const b = num / 1_000_000_000;
    return `${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)} میلیارد`;
  }
  if (num >= 1_000_000) {
    return `${Math.round(num / 1_000_000)} میلیون`;
  }
  return num.toLocaleString("fa-IR");
}

// Format for input placeholder: 1730000000 → "1.73"
function formatBillionInput(num: number): string {
  if (!num || num === 0) return "۱.۸";
  return (num / 1_000_000_000).toFixed(1);
}

// Format price range in billions
function toBillions(min: number, max: number): string {
  if (!min && !max) return "بدون قیمت";
  if (!min) return toPersianDigits(formatBillion(max));
  if (!max || max === min) return toPersianDigits(formatBillion(min));
  return `${toPersianDigits(formatBillion(min))} ~ ${toPersianDigits(formatBillion(max))}`;
}

function PriceLineChart({ prices }: { prices: PriceEntry[] }) {
  const W = 600, H = 180, PX = 50, PY = 20;
  const nums = prices.map((p) => parseInt(p.price));
  const minVal = Math.min(...nums);
  const maxVal = Math.max(...nums);
  const range = maxVal - minVal || 1;

  const points = nums.map((v, i) => {
    const x = PX + (i / (nums.length - 1)) * (W - PX * 2);
    const y = PY + (1 - (v - minVal) / range) * (H - PY * 2);
    return { x, y, v };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M${points[0].x},${H - PY} L${polyline.split(" ").map((pt) => pt).join(" L")} L${points[points.length - 1].x},${H - PY} Z`;

  const yLabels = [minVal, minVal + range * 0.5, maxVal].map((v) => ({
    value: formatBillion(Math.round(v)),
    y: PY + (1 - (v - minVal) / range) * (H - PY * 2),
  }));

  const step = Math.max(1, Math.floor(prices.length / 5));
  const xLabels = prices.filter((_, i) => i % step === 0 || i === prices.length - 1).map((p, idx, arr) => {
    const origIdx = prices.indexOf(p);
    return {
      label: new Date(p.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" }),
      x: PX + (origIdx / (nums.length - 1)) * (W - PX * 2),
      isLast: idx === arr.length - 1,
    };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ direction: "ltr" }}>
      <defs>
        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yLabels.map((yl, i) => (
        <line key={i} x1={PX} y1={yl.y} x2={W - PX} y2={yl.y} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" />
      ))}

      <path d={areaPath} fill="url(#priceGrad)" />
      <polyline points={polyline} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      <circle cx={points[0].x} cy={points[0].y} r="3" fill="var(--color-primary)" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill="var(--color-primary)" />

      {yLabels.map((yl, i) => (
        <text key={i} x={PX - 4} y={yl.y + 3} textAnchor="end" fontSize="8" fill="var(--color-muted)">
          {toPersianDigits(yl.value)}
        </text>
      ))}

      {xLabels.map((xl, i) => (
        <text key={i} x={xl.x} y={H + 10} textAnchor="middle" fontSize="8" fill="var(--color-muted)">
          {toPersianDigits(xl.label)}
        </text>
      ))}
    </svg>
  );
}
