"use client";

import { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface Crawler {
  id: string; name: string; url: string; type: string;
  schedule: string | null; isActive: boolean;
  lastRunAt: string | null; createdAt: string;
}

export default function AdminCrawlersPage() {
  const { fetchAdmin } = useAdmin();
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("price");
  const [newSchedule, setNewSchedule] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmin("/api/admin/crawlers").then((r) => r.json()).then((d) => { setCrawlers(d); setLoading(false); }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleAdd = async () => {
    if (!newName || !newUrl) return;
    const res = await fetchAdmin("/api/admin/crawlers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, url: newUrl, type: newType, schedule: newSchedule || null }),
    });
    if (res.ok) {
      const crawler = await res.json();
      setCrawlers([crawler, ...crawlers]);
      setShowAdd(false); setNewName(""); setNewUrl(""); setNewSchedule("");
      showToast("کرالر اضافه شد");
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetchAdmin(`/api/admin/crawlers/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCrawlers((prev) => prev.map((c) => c.id === id ? updated : c));
    }
  };

  const simulateRun = async (id: string) => {
    const res = await fetchAdmin(`/api/admin/crawlers/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulateRun: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCrawlers((prev) => prev.map((c) => c.id === id ? updated : c));
      showToast("اجرای شبیه‌سازی شده انجام شد");
    }
  };

  const deleteCrawler = async (id: string) => {
    await fetchAdmin(`/api/admin/crawlers/${id}`, { method: "DELETE" });
    setCrawlers((prev) => prev.filter((c) => c.id !== id));
    showToast("کرالر حذف شد");
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black">مدیریت کرالر</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg">+ کرالر جدید</button>
      </div>

      <div className="space-y-3">
        {crawlers.map((c) => (
          <div key={c.id} className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${c.isActive ? "bg-accent" : "bg-muted"}`} />
                <span className="text-sm font-bold">{c.name}</span>
                <span className="text-[10px] bg-background px-2 py-0.5 rounded-full">{c.type}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => simulateRun(c.id)} className="px-2 py-1 text-[10px] font-bold bg-primary/10 text-primary rounded-lg">اجرا</button>
                <button onClick={() => toggleActive(c.id, c.isActive)} className={`px-2 py-1 text-[10px] font-bold rounded-lg ${c.isActive ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"}`}>
                  {c.isActive ? "غیرفعال" : "فعال"}
                </button>
                <button onClick={() => deleteCrawler(c.id)} className="p-1 text-muted hover:text-danger">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                </button>
              </div>
            </div>
            <div className="text-xs text-muted break-all mb-1">{c.url}</div>
            <div className="flex gap-4 text-[10px] text-muted">
              {c.schedule && <span>زمان‌بندی: {c.schedule}</span>}
              <span>آخرین اجرا: {c.lastRunAt ? new Date(c.lastRunAt).toLocaleDateString("fa-IR") : "هرگز"}</span>
            </div>
          </div>
        ))}
        {crawlers.length === 0 && <p className="text-sm text-muted text-center py-8">هیچ کرالری تعریف نشده</p>}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowAdd(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl p-6 z-50 shadow-2xl w-96">
            <h3 className="text-sm font-black mb-4">کرالر جدید</h3>
            <div className="space-y-3">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="نام (مثلا bama_prices)" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
              <div className="flex gap-2">
                <select value={newType} onChange={(e) => setNewType(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="price">قیمت</option><option value="review">نظر</option><option value="listing">لیستینگ</option>
                </select>
                <input value={newSchedule} onChange={(e) => setNewSchedule(e.target.value)} placeholder="cron (اختیاری)" className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-background text-sm font-bold rounded-xl">انصراف</button>
              <button onClick={handleAdd} className="flex-1 py-2 bg-primary text-white text-sm font-bold rounded-xl">ذخیره</button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}
