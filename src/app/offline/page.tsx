"use client";

export default function OfflinePage() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 min-h-screen">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto mb-5 bg-muted/10 rounded-full flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/50">
            <path d="M1 1l22 22" />
            <path d="M8.5 16.5a5 5 0 017 0" />
            <path d="M2 8.82a15 15 0 014.17-2.65" />
            <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
            <path d="M16.85 11.25a10 10 0 01.37.37" />
            <path d="M5 13a10 10 0 015.24-2.76" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h1 className="text-xl font-black mb-2">اینترنت قطع است</h1>
        <p className="text-sm text-muted leading-7 mb-6">
          ارتباط با سرور برقرار نشد. لطفا اتصال اینترنت خودت رو بررسی کن و دوباره تلاش کن.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20"
        >
          تلاش مجدد
        </button>
        <p className="text-[10px] text-muted/60 mt-4">
          صفحات بازدیدشده همچنان قابل مشاهده هستند
        </p>
      </div>
    </div>
  );
}
