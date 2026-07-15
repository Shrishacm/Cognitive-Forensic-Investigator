import React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize
}) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  // Build the window of up to 5 page numbers centred around current page
  const windowSize = Math.min(5, totalPages)
  let startPage
  if (totalPages <= 5) {
    startPage = 1
  } else if (page <= 3) {
    startPage = 1
  } else if (page >= totalPages - 2) {
    startPage = totalPages - 4
  } else {
    startPage = page - 2
  }

  const pageNumbers = Array.from(
    { length: windowSize },
    (_, i) => startPage + i
  )

  const btnBase =
    'p-1.5 rounded-lg text-ink-2 hover:text-ink-0 ' +
    'hover:bg-surface-4 disabled:opacity-30 disabled:cursor-not-allowed ' +
    'transition-colors'

  return (
    <div className="flex items-center justify-between mt-4">
      {/* Result range label */}
      <p className="text-xs text-ink-2">
        Showing {start}–{end} of {total}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <button
          id="pagination-first"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className={btnBase}
          title="First page"
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Prev page */}
        <button
          id="pagination-prev"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={btnBase}
          title="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page number buttons */}
        {pageNumbers.map(pageNum => (
          <button
            key={pageNum}
            id={`pagination-page-${pageNum}`}
            onClick={() => onPageChange(pageNum)}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
              ${pageNum === page
                ? 'bg-accent text-white'
                : 'text-ink-2 hover:bg-surface-4 hover:text-ink-0'}`}
          >
            {pageNum}
          </button>
        ))}

        {/* Next page */}
        <button
          id="pagination-next"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={btnBase}
          title="Next page"
        >
          <ChevronRight size={14} />
        </button>

        {/* Last page */}
        <button
          id="pagination-last"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className={btnBase}
          title="Last page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}
