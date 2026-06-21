"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="max-w-sm text-center space-y-6">
        <svg
          viewBox="0 0 120 120"
          className="w-20 h-20 mx-auto text-forest opacity-30"
          aria-hidden="true"
        >
          <path d="M60 22 A 38 38 0 1 1 84 92" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M60 36 A 24 24 0 1 1 78 78" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M60 50 A 10 10 0 1 1 68 66" stroke="currentColor" strokeWidth="1.15" fill="none" strokeLinecap="round" />
          <circle cx="60" cy="60" r="1.6" fill="currentColor" />
        </svg>
        <div className="space-y-2">
          <h1 className="font-serif text-deep text-2xl">目前離線中</h1>
          <p className="font-sans text-muted text-sm leading-relaxed">
            無法連線至網路。請檢查你的網路設定後再試。
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-forest text-paper font-sans text-xs tracking-widest hover:bg-deep transition-colors cursor-pointer"
        >
          重新連線
        </button>
        <p className="font-sans text-xs text-muted/40">
          樹心理工作室 · treecounseling.com
        </p>
      </div>
    </div>
  );
}
