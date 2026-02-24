"use client"

export default function SkeletonCard() {
  return (
    <div className="animate-pulse backdrop-blur-xl bg-white/5 
                    border border-white/10 rounded-2xl 
                    overflow-hidden shadow-xl">

      {/* IMAGE */}
      <div className="h-64 bg-gray-800/60" />

      {/* CONTENT */}
      <div className="p-6 space-y-3">
        <div className="h-4 bg-gray-700/60 rounded w-3/4" />
        <div className="h-3 bg-gray-700/40 rounded w-1/2" />
        <div className="h-2 bg-gray-700/40 rounded w-full mt-4" />
      </div>
    </div>
  )
}