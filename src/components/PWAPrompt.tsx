"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Skip if already installed or dismissed in last 7 days
    const dismissed = localStorage.getItem("pwa-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      // Show after 15s on page
      setTimeout(() => setShowInstall(true), 15000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Online/offline indicator
  useEffect(() => {
    const updateStatus = () => setIsOffline(!navigator.onLine);
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "dismissed") {
      localStorage.setItem("pwa-dismissed", Date.now().toString());
    }
    setShowInstall(false);
    setInstallEvent(null);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-dismissed", Date.now().toString());
    setShowInstall(false);
  };

  return (
    <>
      {/* Offline banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-[11px] font-bold text-center py-1.5 z-[100] shadow-md">
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 1l22 22M8.5 16.5a5 5 0 017 0M2 8.82a15 15 0 014.17-2.65M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
            </svg>
            حالت آفلاین — اطلاعات ممکن است بروز نباشد
          </span>
        </div>
      )}

      {/* Install prompt */}
      {showInstall && installEvent && (
        <div className="fixed bottom-20 left-3 right-3 bg-surface rounded-2xl border border-border shadow-2xl z-[90] p-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-black">ماشینچی رو نصب کن</h3>
              <p className="text-[10px] text-muted mt-0.5 leading-5">
                دسترسی سریع‌تر، آفلاین کار می‌کنه و مثل یک اپ واقعی می‌شه
              </p>
              <div className="flex gap-2 mt-2.5">
                <button onClick={handleInstall} className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg">
                  نصب
                </button>
                <button onClick={handleDismiss} className="px-3 py-1.5 text-[10px] font-bold text-muted hover:text-foreground">
                  بعدا
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted/40 hover:text-muted shrink-0 p-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
