export default function ArtistCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`glass-card rounded-2xl overflow-hidden ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-4">
        <div className={`skeleton flex-shrink-0 ${compact ? "w-14 h-14" : "w-20 h-20"} rounded-xl`} />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
          {!compact && (
            <>
              <div className="flex gap-2 mt-2">
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="skeleton h-2 w-full rounded mt-2" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
