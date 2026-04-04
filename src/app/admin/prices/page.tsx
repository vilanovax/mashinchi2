"use client";

import { useState, useEffect } from "react";
import { formatPrice, toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface PriceEntry { id: string; carId: string; price: string; date: string; source: string }
interface CarOption { id: string; nameFa: string; brandFa: string; priceMin: string; priceMax: string }

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

  useEffect(() => {
    fetchAdmin("/api/admin/cars").then((r) => r.json()).then((d: CarOption[]) => {
      setCars(d.map((c) => ({ id: c.id, nameFa: c.nameFa, brandFa: c.brandFa, priceMin: c.priceMin, priceMax: c.priceMax })));
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPrices = async (carId: string) => {
    setSelectedCar(carId);
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

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-black mb-5">تاریخچه قیمت</h1>

      {/* Car selector */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-5">
        <label className="text-xs text-muted block mb-2">انتخاب خودرو</label>
        <select value={selectedCar} onChange={(e) => loadPrices(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none max-w-md">
          <option value="">انتخاب کنید...</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.nameFa} - {c.brandFa}</option>)}
        </select>
      </div>

      {selectedCar && (
        <>
          {/* Current price info */}
          {selectedCarData && (
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-5 flex items-center justify-between">
              <div>
                <span className="text-sm font-black">{selectedCarData.nameFa}</span>
                <span className="text-xs text-muted mr-2">{selectedCarData.brandFa}</span>
              </div>
              <div className="text-sm font-bold text-primary">
                {toPersianDigits(formatPrice(selectedCarData.priceMin))} ~ {toPersianDigits(formatPrice(selectedCarData.priceMax))}
              </div>
            </div>
          )}

          {/* Add price form */}
          <div className="bg-surface rounded-xl border border-border p-4 mb-5">
            <h3 className="text-xs font-black mb-3">ثبت قیمت جدید</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[10px] text-muted block mb-1">قیمت (تومان)</label>
                <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" placeholder="2500000000" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">تاریخ</label>
                <input value={newDate} onChange={(e) => setNewDate(e.target.value)} type="date" className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">منبع</label>
                <select value={newSource} onChange={(e) => setNewSource(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="manual">دستی</option><option value="bama">باما</option><option value="divar">دیوار</option>
                </select>
              </div>
              <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shrink-0">ثبت</button>
            </div>
          </div>

          {/* Price chart (simple bar) */}
          {priceLoading ? (
            <div className="text-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : prices.length > 0 ? (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="text-xs font-black mb-3">روند قیمت ({toPersianDigits(prices.length)} ثبت)</h3>
              <div className="space-y-1.5">
                {(() => {
                  const maxPrice = Math.max(...prices.map((p) => parseInt(p.price)));
                  return prices.slice(0, 20).map((p) => {
                    const pct = (parseInt(p.price) / maxPrice) * 100;
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted w-20 shrink-0">{new Date(p.date).toLocaleDateString("fa-IR")}</span>
                        <div className="flex-1 h-3 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold w-24 text-left shrink-0">{toPersianDigits(formatPrice(p.price))}</span>
                        <span className="text-[9px] text-muted w-10">{p.source === "manual" ? "دستی" : p.source}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted text-center py-8">قیمتی ثبت نشده</p>
          )}
        </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}
