export function AdminPageSkeleton({ lines = 6 }: { lines?: number }) {
  return (
    <div className="space-y-6 pt-4 animate-pulse">
      <div className="space-y-2.5">
        <div className="h-3 w-16 rounded bg-sand/20" />
        <div className="h-7 w-44 rounded-sm bg-sand/30" />
        <div className="h-3 w-60 rounded bg-sand/20" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg bg-white border border-sand/20"
            style={{ opacity: 1 - i * 0.07 }}
          />
        ))}
      </div>
    </div>
  );
}
