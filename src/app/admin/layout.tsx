"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";

interface AdminContextType {
  token: string;
  fetchAdmin: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminContext = createContext<AdminContextType>({ token: "", fetchAdmin: () => Promise.reject() });
export const useAdmin = () => useContext(AdminContext);

const NAV_ITEMS = [
  { path: "/admin", label: "داشبورد", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { path: "/admin/cars", label: "خودروها", icon: "M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2M9 17h6" },
  { path: "/admin/reviews", label: "نظرات", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
  { path: "/admin/crawlers", label: "کرالر", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" },
  { path: "/admin/prices", label: "قیمت‌ها", icon: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" },
  { path: "/admin/users", label: "کاربران", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
  { path: "/admin/ai", label: "تولید AI", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { path: "/admin/scoring", label: "پارامترها", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
  { path: "/admin/analytics", label: "تحلیل", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { path: "/admin/import", label: "واردات", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
  { path: "/admin/audit", label: "لاگ", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("mashinchi-admin-token");
    if (stored) setToken(stored);
    setLoading(false);
  }, []);

  const handleLogin = async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.ok) {
        setToken(password);
        localStorage.setItem("mashinchi-admin-token", password);
      } else {
        setError("رمز عبور اشتباه است");
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
    <AdminContext.Provider value={{ token, fetchAdmin }}>
      <div className="min-h-screen bg-background flex" dir="rtl">
        {/* Sidebar */}
        <aside className="w-56 bg-surface border-l border-border shrink-0 flex flex-col">
          <div className="p-4 border-b border-border">
            <h1 className="text-sm font-black text-primary">ماشینچی</h1>
            <p className="text-[10px] text-muted">پنل مدیریت</p>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-background"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-border">
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-danger hover:bg-danger/5 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              خروج
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </AdminContext.Provider>
  );
}
