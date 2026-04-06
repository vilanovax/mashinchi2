"use client";

import { usePathname, useRouter } from "next/navigation";

const tabs = [
  {
    key: "home",
    label: "خانه",
    path: "/",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        {!active && <path d="M9 22V12h6v10" />}
      </svg>
    ),
  },
  {
    key: "catalog",
    label: "کاتالوگ",
    path: "/catalog",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: "market",
    label: "بازار",
    path: "/market",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 4-6" />
      </svg>
    ),
  },
  {
    key: "profile",
    label: "پروفایل",
    path: "/profile",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

// Pages where bottom nav should NOT show
const HIDDEN_PATHS = ["/explore", "/results", "/compare", "/admin", "/car/"];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <nav className="sticky bottom-0 bg-surface/95 backdrop-blur-md border-t border-border z-30">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <button
              key={tab.key}
              onClick={() => router.push(tab.path)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                isActive ? "text-primary" : "text-muted"
              }`}
            >
              {tab.icon(isActive)}
              <span className={`text-[10px] ${isActive ? "font-bold" : ""}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
