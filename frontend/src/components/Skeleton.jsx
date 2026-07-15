import React from 'react'

export function SkeletonLine({ width = 'full', height = 3 }) {
  return (
    <div
      className={`skeleton h-${height} w-${width} rounded-sm`}
    />
  )
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card p-4 space-y-3">
      <SkeletonLine width="1/3" height={2} />
      <SkeletonLine height={8} />
      <SkeletonLine width="2/3" height={2} />
    </div>
  )
}

export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className={`grid grid-cols-${count} gap-3`}>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="stat-card space-y-3">
          <div className="flex justify-between">
            <SkeletonLine width="20" height={2} />
            <div className="skeleton w-7 h-7 rounded" />
          </div>
          <SkeletonLine width="16" height={8} />
          <SkeletonLine width="24" height={2} />
        </div>
      ))}
    </div>
  )
}

export default function Skeleton({ className = '' }) {
  return (
    <div className={`skeleton ${className}`} />
  )
}
