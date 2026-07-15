import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, FolderOpen, Users,
  HardDrive, Bot, StickyNote, Loader
} from 'lucide-react'
import { globalSearch } from '../api/client'

const SECTION_CONFIG = {
  cases: {
    icon: FolderOpen,
    label: 'Cases',
    color: 'text-accent',
    getTitle: r => r.case_name,
    getSubtitle: r =>
      r.case_number
        ? `#${r.case_number} · ${r.status}`
        : r.status,
    getPath: r => `/cases/${r.id}`
  },
  entities: {
    icon: Users,
    label: 'Entities',
    color: 'text-teal-400',
    getTitle: r => r.name,
    getSubtitle: r => `${r.entity_type} · ${r.frequency}×`,
    getPath: r => `/cases/${r.case_id}/profiles?entity=${r.id}`
  },
  artifacts: {
    icon: HardDrive,
    label: 'Artifacts',
    color: 'text-blue-400',
    getTitle: r => r.filename,
    getSubtitle: r => r.internal_path,
    getPath: r => `/cases/${r.case_id}/artifacts`
  },
  queries: {
    icon: Bot,
    label: 'Queries',
    color: 'text-purple-400',
    getTitle: r =>
      r.question_text.length > 60
        ? r.question_text.slice(0, 60) + '...'
        : r.question_text,
    getSubtitle: r => `by ${r.asked_by}`,
    getPath: r => `/cases/${r.case_id}/investigate`
  },
  notes: {
    icon: StickyNote,
    label: 'Notes',
    color: 'text-yellow-400',
    getTitle: r => r.snippet?.slice(0, 60) || 'Note',
    getSubtitle: r => `by ${r.author}`,
    getPath: r => `/cases/${r.case_id}/notes`
  }
}

export default function GlobalSearch({ caseId = null }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef()
  const containerRef = useRef()
  const debounceRef = useRef()

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
        setResults(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearch = (value) => {
    setQuery(value)
    clearTimeout(debounceRef.current)
    if (value.length < 2) {
      setResults(null)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await globalSearch(value, caseId)
        setResults(res.data)
        setOpen(true)
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const handleSelect = (path) => {
    navigate(path)
    setOpen(false)
    setQuery('')
    setResults(null)
  }

  const totalResults = results?.total || 0

  return (
    <div ref={containerRef} className="relative w-72">
      {/* Search input */}
      <div className="relative">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2 pointer-events-none"
        />
        <input
          ref={inputRef}
          id="global-search-input"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search… ⌘K"
          className="w-full bg-surface-1 border border-line rounded-xl
            pl-8 pr-8 py-1.5 text-sm text-ink-0
            placeholder:text-ink-2 focus:outline-none focus:border-accent/50
            transition-colors"
        />
        {query && !loading && (
          <button
            onClick={() => {
              setQuery('')
              setResults(null)
              setOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2
              text-ink-2 hover:text-ink-0 transition-colors"
          >
            <X size={13} />
          </button>
        )}
        {loading && (
          <Loader
            size={13}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-accent animate-spin"
          />
        )}
      </div>

      {/* Results dropdown */}
      {open && results && (
        <div
          className="absolute top-full mt-2 left-0 right-0
            bg-surface-2 border border-line rounded-xl shadow-2xl
            z-50 max-h-96 overflow-y-auto"
        >
          {totalResults === 0 ? (
            <div className="p-4 text-center text-ink-2 text-sm">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="px-3 py-2 border-b border-line">
                <span className="text-xs text-ink-2">
                  {totalResults} result{totalResults !== 1 ? 's' : ''} for &quot;{query}&quot;
                </span>
              </div>

              {/* Sections */}
              {Object.entries(SECTION_CONFIG).map(([key, config]) => {
                const items = results[key] || []
                if (items.length === 0) return null
                const Icon = config.icon
                return (
                  <div key={key}>
                    {/* Section header */}
                    <div className="px-3 py-1.5 bg-surface-1">
                      <span
                        className={`text-xs font-semibold text-ink-2 uppercase tracking-wider
                          flex items-center gap-1.5 ${config.color}`}
                      >
                        <Icon size={11} />
                        {config.label} ({items.length})
                      </span>
                    </div>
                    {/* Items */}
                    {items.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelect(config.getPath(item))}
                        className="w-full flex items-start gap-2 px-3 py-2.5 text-left
                          hover:bg-surface-4 transition-colors border-b border-line/40
                          last:border-b-0"
                      >
                        <Icon
                          size={12}
                          className={`${config.color} shrink-0 mt-0.5`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-ink-0 truncate">
                            {config.getTitle(item)}
                          </p>
                          <p className="text-xs text-ink-2 truncate">
                            {config.getSubtitle(item)}
                          </p>
                          {(item.snippet || item.text_snippet) && (
                            <p className="text-xs text-ink-2 italic mt-0.5 truncate">
                              {item.snippet || item.text_snippet}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
