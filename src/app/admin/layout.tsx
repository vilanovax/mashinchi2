"use client";

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toPersianDigits } from "@/lib/utils";

interface AdminContextType {
  token: string;
  role: string;
  name: string;
  fetchAdmin: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminContext = createContext<AdminContextType>({ token: "", role: "viewer", name: "", fetchAdmin: () => Promise.reject() });
export const useAdmin = () => useContext(AdminContext);

const ROLE_LABELS: Record<string, string> = { super_admin: "مدیر ارشد", editor: "ویرایشگر", viewer: "مشاهده‌کننده" };

interface NavItem {
  path: string;
  label: string;
  icon: string;
  superOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "",
    items: [
      { path: "/admin", label: "داشبورد", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
      { path: "/admin/data-health", label: "سلامت دیتا", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    ],
  },
  {
    title: "مدیریت داده",
    items: [
      { path: "/admin/cars", label: "خودروها", icon: "M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2M9 17h6" },
      { path: "/admin/prices", label: "قیمت‌ها", icon: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" },
      { path: "/admin/reviews", label: "نظرات", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
      { path: "/admin/scoring", label: "پارامترها", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
    ],
  },
  {
    title: "جمع‌آوری و پردازش",
    items: [
      { path: "/admin/sources", label: "منابع", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" },
      { path: "/admin/enrich", label: "غنی‌سازی", icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
      { path: "/admin/ai", label: "تولید AI", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
    ],
  },
  {
    title: "بازار و تحلیل",
    items: [
      { path: "/admin/market", label: "بازار", icon: "M3 3v18h18M7 16l4-8 4 4 4-6" },
      { path: "/admin/analytics", label: "آمار و تحلیل", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
      { path: "/admin/users", label: "کاربران", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
    ],
  },
  {
    title: "سیستم",
    items: [
      { path: "/admin/audit", label: "لاگ فعالیت", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
      { path: "/admin/team", label: "تیم", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", superOnly: true },
      { path: "/admin/settings", label: "تنظیمات", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    ],
  },
];

// ─── Search Modal (Cmd+K) ───
interface SearchResult {
  cars: { id: string; nameFa: string; nameEn: string; brandFa: string; origin: string; imageUrl: string | null; sourcesCount: number; reviewsCount: number }[];
  sources: { id: string; title: string; type: string; sourceSite: string; status: string; carId: string; carName: string }[];
  pages: { path: string; label: string }[];
}

const ORIGIN_LABELS_SEARCH: Record<string, string> = {
  iranian: "ایرانی", chinese: "چینی", korean: "کره‌ای", japanese: "ژاپنی", european: "اروپایی",
};

const TYPE_LABELS_SEARCH: Record<string, string> = {
  comment: "تجربه", article: "مقاله", review: "ریویو", video: "ویدیو",
  comparison: "مقایسه", forum: "فروم", expert: "کارشناس", manual: "دستی",
};

function SearchModal({ fetchAdmin, onClose }: { fetchAdmin: (url: string) => Promise<Response>; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetchAdmin(`/api/admin/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data);
        setSelectedIdx(0);
      } catch { /* ignore */ }
      setLoading(false);
    }, 200);
  }, [fetchAdmin]);

  useEffect(() => { search(query); }, [query, search]);

  // Build flat list of all results for keyboard nav
  const flatItems: { type: "car" | "source" | "page"; id: string; label: string; sub: string; path: string }[] = [];

  if (results) {
    for (const p of results.pages) {
      flatItems.push({ type: "page", id: p.path, label: p.label, sub: "صفحه", path: p.path });
    }
    for (const c of results.cars) {
      flatItems.push({ type: "car", id: c.id, label: c.nameFa, sub: `${c.brandFa} · ${ORIGIN_LABELS_SEARCH[c.origin] || c.origin}`, path: `/admin/cars/${c.id}` });
    }
    for (const s of results.sources) {
      flatItems.push({ type: "source", id: s.id, label: s.title, sub: `${s.carName} · ${TYPE_LABELS_SEARCH[s.type] || s.type}`, path: `/admin/cars/${s.carId}/data` });
    }
  }

  const navigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, flatItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && flatItems[selectedIdx]) { navigate(flatItems[selectedIdx].path); }
    else if (e.key === "Escape") { onClose(); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 bg-surface rounded-2xl z-50 shadow-2xl w-[560px] max-h-[70vh] flex flex-col overflow-hidden border border-border" dir="rtl">
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? "text-primary animate-pulse" : "text-muted"}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="جستجوی خودرو، منبع، صفحه..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/50"
          />
          <kbd className="text-[9px] text-muted bg-background px-1.5 py-0.5 rounded border border-border font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">
          {!query && (
            <div className="px-4 py-6 text-center">
              <p className="text-[11px] text-muted">نام خودرو، برند، یا صفحه مورد نظر رو بنویس</p>
              <div className="flex items-center justify-center gap-2 mt-2 text-[9px] text-muted/60">
                <span><kbd className="bg-background px-1 py-0.5 rounded border border-border font-mono">↑↓</kbd> حرکت</span>
                <span><kbd className="bg-background px-1 py-0.5 rounded border border-border font-mono">Enter</kbd> انتخاب</span>
              </div>
            </div>
          )}

          {query && flatItems.length === 0 && !loading && (
            <div className="px-4 py-6 text-center">
              <p className="text-[11px] text-muted">نتیجه‌ای پیدا نشد</p>
            </div>
          )}

          {flatItems.length > 0 && (
            <div className="py-1">
              {/* Pages */}
              {results!.pages.length > 0 && (
                <>
                  <div className="px-4 py-1 text-[9px] text-muted/60 font-bold">صفحات</div>
                  {results!.pages.map((p) => {
                    const idx = flatItems.findIndex((f) => f.id === p.path);
                    return (
                      <button
                        key={p.path}
                        onClick={() => navigate(p.path)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-right transition-colors ${
                          selectedIdx === idx ? "bg-primary/10" : "hover:bg-background/50"
                        }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0">
                          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                        <span className="text-[11px] font-bold">{p.label}</span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Cars */}
              {results!.cars.length > 0 && (
                <>
                  <div className="px-4 py-1 text-[9px] text-muted/60 font-bold mt-1">خودروها</div>
                  {results!.cars.map((c) => {
                    const idx = flatItems.findIndex((f) => f.id === c.id && f.type === "car");
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/admin/cars/${c.id}`)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-right transition-colors ${
                          selectedIdx === idx ? "bg-primary/10" : "hover:bg-background/50"
                        }`}
                      >
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt="" className="w-8 h-6 object-cover rounded border border-border shrink-0" />
                        ) : (
                          <div className="w-8 h-6 bg-background rounded border border-border shrink-0 flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/40">
                              <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold">{c.nameFa}</span>
                            <span className="text-[9px] text-muted">{c.brandFa}</span>
                          </div>
                          <div className="text-[9px] text-muted/70">
                            {ORIGIN_LABELS_SEARCH[c.origin] || c.origin}
                            {c.sourcesCount > 0 && <> · {toPersianDigits(c.sourcesCount)} منبع</>}
                            {c.reviewsCount > 0 && <> · {toPersianDigits(c.reviewsCount)} نظر</>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/cars/${c.id}/data`); }}
                            className="text-[8px] text-primary bg-primary/8 px-1.5 py-0.5 rounded font-bold hover:bg-primary/15"
                          >
                            دیتا
                          </button>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Sources */}
              {results!.sources.length > 0 && (
                <>
                  <div className="px-4 py-1 text-[9px] text-muted/60 font-bold mt-1">منابع</div>
                  {results!.sources.map((s) => {
                    const idx = flatItems.findIndex((f) => f.id === s.id && f.type === "source");
                    return (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/admin/cars/${s.carId}/data`)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-right transition-colors ${
                          selectedIdx === idx ? "bg-primary/10" : "hover:bg-background/50"
                        }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold truncate block">{s.title}</span>
                          <span className="text-[9px] text-muted">{s.carName} · {TYPE_LABELS_SEARCH[s.type] || s.type} · {s.sourceSite}</span>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SidebarFooter({ adminName, adminRole, roleLabels, onLogout }: {
  adminName: string; adminRole: string; roleLabels: Record<string, string>; onLogout: () => void;
}) {
  return (
    <div className="border-t border-border">
      {/* User info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold truncate">{adminName || "Admin"}</div>
            <div className="text-[9px] text-muted">{roleLabels[adminRole] || adminRole}</div>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-danger hover:bg-danger/5 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          خروج
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState("viewer");
  const [adminName, setAdminName] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<{ id: string; type: string; title: string; message: string; entityId: string | null; isRead: boolean; createdAt: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("mashinchi-admin-token");
    if (stored) setToken(stored);
    setLoading(false);
  }, []);

  const handleLogin = async () => {
    setError("");
    // Try username:password format first, then plain password
    const loginToken = username ? `${username}:${password}` : password;
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${loginToken}` },
      });
      if (res.ok) {
        setToken(loginToken);
        setAdminRole("super_admin");
        setAdminName(username || "Admin");
        localStorage.setItem("mashinchi-admin-token", loginToken);
      } else {
        setError("اطلاعات ورود اشتباه است");
      }
    } catch {
      setError("خطا در اتصال");
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("mashinchi-admin-token");
  };

  const fetchAdmin = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: { ...options.headers as Record<string, string>, Authorization: `Bearer ${token}` },
    });
  };

  // Load notification count
  useEffect(() => {
    if (!token) return;
    const loadNotifs = () => {
      fetch("/api/admin/notifications?unread=true", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setUnreadCount(d.length); })
        .catch(() => {});
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login page
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-sm bg-surface rounded-2xl border border-border p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 bg-primary/10 rounded-xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h1 className="text-lg font-black">پنل مدیریت ماشینچی</h1>
            <p className="text-xs text-muted mt-1">رمز عبور را وارد کنید</p>
          </div>
          <input
            type="text"
            placeholder="نام کاربری (اختیاری)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary mb-2"
          />
          <input
            type="password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary mb-3"
          />
          {error && <p className="text-xs text-danger mb-3">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl"
          >
            ورود
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ token, role: adminRole, name: adminName, fetchAdmin }}>
      <div className="min-h-screen bg-background flex" dir="rtl">
        {/* Sidebar */}
        <aside className="w-56 bg-surface border-l border-border shrink-0 flex flex-col">
          <div className="p-4 border-b border-border">
            <h1 className="text-sm font-black text-primary">ماشینچی</h1>
            <p className="text-[10px] text-muted">پنل مدیریت</p>
          </div>
          <nav className="flex-1 p-2 overflow-y-auto">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className={gi > 0 ? "mt-3" : ""}>
                {group.title && (
                  <div className="px-3 py-1.5 text-[9px] font-bold text-muted/60 uppercase tracking-wider">
                    {group.title}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items
                    .filter((item) => !item.superOnly || adminRole === "super_admin")
                    .map((item) => {
                      const isActive = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
                      return (
                        <button
                          key={item.path}
                          onClick={() => router.push(item.path)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                            isActive ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-background"
                          }`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d={item.icon} />
                          </svg>
                          {item.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </nav>

          {/* Settings + User info + logout */}
          <SidebarFooter
            adminName={adminName}
            adminRole={adminRole}
            roleLabels={ROLE_LABELS}
            onLogout={handleLogout}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Top bar with notification bell */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50 px-6 py-2 flex items-center justify-between">
            {/* Search trigger */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg text-[11px] text-muted hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              جستجو...
              <kbd className="text-[8px] bg-background px-1 py-0.5 rounded border border-border font-mono mr-2">⌘K</kbd>
            </button>
            <div className="flex items-center gap-3">
              {/* Export button */}
              <div className="relative group">
                <button className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </button>
                <div className="absolute left-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-xl hidden group-hover:block min-w-[120px] z-20">
                  {["cars", "users", "reviews"].map((t) => (
                    <a
                      key={t}
                      href={`/api/admin/export?type=${t}`}
                      onClick={(e) => { e.preventDefault(); fetchAdmin(`/api/admin/export?type=${t}`).then(r => r.blob()).then(b => { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `mashinchi-${t}.csv`; a.click(); }); }}
                      className="block px-3 py-2 text-[11px] text-muted hover:text-foreground hover:bg-background transition-colors"
                    >
                      {t === "cars" ? "خودروها" : t === "users" ? "کاربران" : "نظرات"} CSV
                    </a>
                  ))}
                </div>
              </div>

              {/* Notification bell + dropdown */}
              <div className="relative">
                <button
                  onClick={async () => {
                    if (!showNotifs) {
                      const res = await fetchAdmin("/api/admin/notifications");
                      const data = await res.json();
                      setNotifs(Array.isArray(data) ? data.slice(0, 15) : []);
                    }
                    setShowNotifs(!showNotifs);
                  }}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors relative"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown panel */}
                {showNotifs && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowNotifs(false)} />
                    <div className="absolute left-0 top-full mt-1 w-80 bg-surface border border-border rounded-xl shadow-2xl z-30 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                        <span className="text-[11px] font-black">اعلان‌ها</span>
                        {notifs.some((n) => !n.isRead) && (
                          <button
                            onClick={async () => {
                              await fetchAdmin("/api/admin/notifications", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ids: "all" }),
                              });
                              setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
                              setUnreadCount(0);
                            }}
                            className="text-[9px] text-primary font-bold"
                          >
                            همه خوانده شد
                          </button>
                        )}
                      </div>
                      <div className="max-h-[350px] overflow-y-auto divide-y divide-border/30">
                        {notifs.length === 0 ? (
                          <div className="py-6 text-center text-[10px] text-muted">اعلانی نیست</div>
                        ) : (
                          notifs.map((n) => {
                            const isReport = n.type === "user_report";
                            const time = new Date(n.createdAt);
                            return (
                              <div
                                key={n.id}
                                className={`px-3 py-2 hover:bg-background/50 cursor-pointer ${!n.isRead ? "bg-primary/3" : ""}`}
                                onClick={() => {
                                  if (isReport && n.entityId) {
                                    router.push(`/admin/cars/${n.entityId}`);
                                    setShowNotifs(false);
                                  }
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                    isReport ? "bg-orange-500" :
                                    n.type === "price_change" ? "bg-primary" : "bg-muted/40"
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-bold truncate">{n.title}</span>
                                      {isReport && <span className="text-[8px] bg-orange-500/15 text-orange-600 px-1 py-0.5 rounded font-bold shrink-0">گزارش</span>}
                                    </div>
                                    <p className="text-[9px] text-muted line-clamp-2 mt-0.5 leading-4">{n.message}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[8px] text-muted/50">{time.toLocaleDateString("fa-IR")} {time.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</span>
                                      {/* Convert to source button — only for user reports with entityId */}
                                      {isReport && n.entityId && (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              const res = await fetchAdmin("/api/admin/sources", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                  carId: n.entityId,
                                                  type: "comment",
                                                  sourceSite: "manual",
                                                  title: n.title,
                                                  rawText: n.message,
                                                }),
                                              });
                                              if (res.ok) {
                                                // Mark as read
                                                await fetchAdmin("/api/admin/notifications", {
                                                  method: "PUT",
                                                  headers: { "Content-Type": "application/json" },
                                                  body: JSON.stringify({ ids: [n.id] }),
                                                });
                                                setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
                                                if (!n.isRead) setUnreadCount((c) => Math.max(0, c - 1));
                                                alert("به عنوان منبع ذخیره شد — از صفحه منابع قابل پردازشه");
                                              }
                                            } catch {}
                                          }}
                                          className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors flex items-center gap-0.5"
                                        >
                                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                                          تبدیل به منبع
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await fetchAdmin(`/api/admin/notifications?id=${n.id}`, { method: "DELETE" });
                                      setNotifs((prev) => prev.filter((x) => x.id !== n.id));
                                      if (!n.isRead) setUnreadCount((c) => Math.max(0, c - 1));
                                    }}
                                    className="text-muted/30 hover:text-red-500 shrink-0 p-0.5"
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {children}

          {/* Search Modal */}
          {showSearch && (
            <SearchModal fetchAdmin={fetchAdmin} onClose={() => setShowSearch(false)} />
          )}
        </main>
      </div>
    </AdminContext.Provider>
  );
}
