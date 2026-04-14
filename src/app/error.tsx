"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev, optionally send to error tracking in prod
    console.error("[app error]", error);

    // Report to server for admin notifications
    if (typeof window !== "undefined") {
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message?.slice(0, 500) || "",
          digest: error.digest || "",
          url: window.location.href,
          userAgent: navigator.userAgent?.slice(0, 200) || "",
        }),
      }).catch(() => {});
    }
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center px-6 min-h-[70vh]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-red-500">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>

        <h1 className="text-lg font-black mb-2">خطایی رخ داد</h1>
        <p className="text-xs text-muted leading-6 mb-5">
          متاسفانه مشکلی پیش اومد. تیم ما از این خطا باخبر شد و به زودی رفعش می‌کنه.
        </p>

        {error.digest && (
          <p className="text-[9px] text-muted/50 font-mono mb-4">کد خطا: {error.digest}</p>
        )}

        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20"
          >
            تلاش مجدد
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-5 py-2.5 bg-surface border border-border font-bold text-xs rounded-xl hover:border-primary/30"
          >
            صفحه اصلی
          </button>
        </div>
      </div>
    </div>
  );
}
