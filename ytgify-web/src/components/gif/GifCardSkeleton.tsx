/**
 * Loading skeleton for GIF card
 */
export function GifCardSkeleton() {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-full bg-gray-800" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-gray-800 rounded mb-1.5" />
          <div className="h-3 w-32 bg-gray-800 rounded" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="aspect-video bg-gray-800" />

      {/* Actions skeleton */}
      <div className="flex items-center gap-6 px-3 py-3">
        <div className="h-6 w-14 bg-gray-800 rounded" />
        <div className="h-6 w-14 bg-gray-800 rounded" />
        <div className="h-6 w-10 bg-gray-800 rounded" />
      </div>

      {/* Title skeleton */}
      <div className="px-3 pb-3">
        <div className="h-4 w-3/4 bg-gray-800 rounded" />
      </div>
    </div>
  )
}

/**
 * Grid of loading skeletons
 */
export function GifCardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <GifCardSkeleton key={i} />
      ))}
    </div>
  )
}
