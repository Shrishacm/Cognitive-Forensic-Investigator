import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Clock, AlertTriangle, File, FileText,
  Database, Globe, Image,
  ChevronDown, ChevronRight, Flag
} from 'lucide-react'
import { getTimeline, flagArtifact } from '../api/client'
import PageLayout from '../components/PageLayout'
import toast from 'react-hot-toast'

// Dot/bar colour per extraction type
const TYPE_COLOR = {
  text:            'bg-blue-500',
  pdf:             'bg-red-500',
  sqlite:          'bg-yellow-500',
  html:            'bg-green-500',
  exif:            'bg-purple-500',
  browser_history: 'bg-green-500',
  unsupported:     'bg-gray-500',
  error:           'bg-danger',
}

// Icon per extraction type
const TYPE_ICON = {
  text:    FileText,
  pdf:     FileText,
  sqlite:  Database,
  html:    Globe,
  exif:    Image,
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

// Safely extract HH:MM:SS from a timestamp string like "2024-05-28 14:32:00 UTC"
function timeOnly(ts) {
  if (!ts || ts === 'Unknown') return '—'
  // Grab chars 11-19 (the time portion)
  const part = String(ts).slice(11, 19)
  return part || ts.slice(0, 19)
}

export default function TimelinePage() {
  const { caseId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => { loadTimeline() }, [caseId])

  const loadTimeline = async () => {
    setLoading(true)
    try {
      const res = await getTimeline(caseId)
      setData(res.data)
      // Auto-expand anomalous days
      const autoExpand = {}
      res.data.timeline.forEach((day, i) => {
        if (day.is_anomaly) autoExpand[i] = true
      })
      setExpanded(autoExpand)
    } catch {
      toast.error('Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }

  const handleFlag = async (artifactId, dayIdx, eventIdx) => {
    try {
      const res = await flagArtifact(caseId, artifactId)
      const flagged = res.data.is_flagged
      // Immutably update nested state
      setData(prev => {
        const timeline = prev.timeline.map((day, di) => {
          if (di !== dayIdx) return day
          return {
            ...day,
            events: day.events.map((ev, ei) =>
              ei === eventIdx ? { ...ev, is_flagged: flagged } : ev
            ),
          }
        })
        return { ...prev, timeline }
      })
      toast.success(flagged ? 'Artifact flagged' : 'Flag removed')
    } catch {
      toast.error('Failed to update flag')
    }
  }

  const toggleDay = (idx) =>
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-accent rounded-full border-t-transparent animate-spin" />
    </div>
  )

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!data || data.timeline.length === 0) return (
    <PageLayout
      title="Forensic Timeline"
      subtitle="A chronological view of all file activity found in your evidence. Files are ordered by when they were created, modified, or accessed — helping you reconstruct exactly what happened and when."
    >
      <div className="text-center py-16 text-ink-2">
        <Clock size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium mb-1">No timeline data yet</p>
        <p className="text-xs">Upload a disk image to generate a forensic timeline</p>
      </div>
    </PageLayout>
  )

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <PageLayout
      title="Forensic Timeline"
      subtitle={
        <>
          A chronological view of all file activity found in your evidence. Files are ordered by when they were created, 
          modified, or accessed — helping you reconstruct exactly what happened and when.
          <br/>
          <span className="text-ink-1 mt-1 inline-block">
            {data.total_events.toLocaleString()} events
            {data.date_range.first && (
              <> &nbsp;·&nbsp; {data.date_range.first} → {data.date_range.last}</>
            )}
            {data.anomaly_count > 0 && (
              <span className="ml-2 text-warning font-medium">
                · ⚠ {data.anomaly_count} anomalous day{data.anomaly_count !== 1 ? 's' : ''}
              </span>
            )}
          </span>
        </>
      }
      actions={
        <button
          onClick={loadTimeline}
          className="text-xs text-ink-2 hover:text-ink-0 flex items-center gap-1 transition-colors"
        >
          <Clock size={12} />
          Refresh
        </button>
      }
    >

      {/* Legend */}
      <div className="flex gap-3 flex-wrap mb-5">
        {Object.entries(TYPE_COLOR).filter(([k]) => k !== 'unsupported' && k !== 'error').map(([type, cls]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
            <span className="text-xs text-ink-2 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical spine */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-3">
          {data.timeline.map((day, dayIdx) => {
            const isOpen = !!expanded[dayIdx]

            // Build type counts for mini bars
            const typeCounts = day.events.reduce((acc, ev) => {
              const t = ev.extraction_type || 'unsupported'
              acc[t] = (acc[t] || 0) + 1
              return acc
            }, {})

            return (
              <div key={day.date} className="relative pl-14">
                {/* Timeline dot */}
                <div className={`absolute left-[14px] top-[14px] w-4 h-4 rounded-full border-2 border-bg-primary z-10
                  ${day.is_anomaly ? 'bg-warning' : 'bg-accent'}`}
                />

                {/* Day header button */}
                <button
                  onClick={() => toggleDay(dayIdx)}
                  className={`w-full flex items-center gap-2.5 p-3 rounded-xl text-left transition-colors border
                    ${day.is_anomaly
                      ? 'bg-warning/10 border-warning/30 hover:bg-warning/15'
                      : 'bg-surface-2 border-line hover:border-accent/30 hover:bg-surface-4'}`}
                >
                  {day.is_anomaly && (
                    <AlertTriangle size={14} className="text-warning shrink-0" />
                  )}

                  <span className="font-mono text-sm font-semibold text-ink-0">
                    {day.date}
                  </span>

                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0
                    ${day.is_anomaly
                      ? 'bg-warning/20 text-warning'
                      : 'bg-accent/20 text-accent'}`}
                  >
                    {day.event_count} event{day.event_count !== 1 ? 's' : ''}
                  </span>

                  {day.is_anomaly && (
                    <span className="text-xs text-warning">Unusual volume</span>
                  )}

                  {/* Type mini-bars */}
                  <div className="flex gap-2 ml-auto items-center">
                    {Object.entries(typeCounts).map(([type, count]) => (
                      <div key={type} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-sm ${TYPE_COLOR[type] || 'bg-gray-500'}`} />
                        <span className="text-xs text-ink-2">{count}</span>
                      </div>
                    ))}
                  </div>

                  {isOpen
                    ? <ChevronDown size={14} className="text-ink-2 shrink-0" />
                    : <ChevronRight size={14} className="text-ink-2 shrink-0" />
                  }
                </button>

                {/* Expanded events */}
                {isOpen && (
                  <div className="mt-2 space-y-1.5 pl-2">
                    {day.events.map((event, eventIdx) => {
                      const Icon = TYPE_ICON[event.extraction_type] || File
                      const dotCls = TYPE_COLOR[event.extraction_type] || 'bg-gray-500'
                      // Convert bg-X to text-X for icon colouring
                      const iconCls = dotCls.replace('bg-', 'text-')

                      return (
                        <div
                          key={event.id}
                          className={`flex items-start gap-3 p-2.5 rounded-lg bg-surface-1 border transition-colors
                            ${event.is_flagged ? 'border-warning/30' : 'border-transparent'}`}
                        >
                          <Icon size={13} className={`shrink-0 mt-0.5 ${iconCls}`} />

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-ink-0 truncate">
                              {event.filename}
                            </p>
                            <p className="text-xs text-ink-2 font-mono truncate">
                              {event.internal_path}
                            </p>
                            <div className="flex gap-3 mt-1 flex-wrap">
                              {event.modified_at && event.modified_at !== 'Unknown' && (
                                <span className="text-xs text-ink-2">
                                  M: {timeOnly(event.modified_at)}
                                </span>
                              )}
                              {event.accessed_at && event.accessed_at !== 'Unknown' && (
                                <span className="text-xs text-ink-2">
                                  A: {timeOnly(event.accessed_at)}
                                </span>
                              )}
                              <span className="text-xs text-ink-2">
                                {formatBytes(event.file_size_bytes)}
                              </span>
                              {event.sha256_hash && (
                                <span className="text-xs font-mono text-ink-2">
                                  {event.sha256_hash.slice(0, 8)}…
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Flag button */}
                          <button
                            onClick={() => handleFlag(event.id, dayIdx, eventIdx)}
                            className={`p-1 rounded transition-colors shrink-0
                              ${event.is_flagged
                                ? 'text-warning'
                                : 'text-ink-2 hover:text-warning'}`}
                            title={event.is_flagged ? 'Remove flag' : 'Flag artifact'}
                          >
                            <Flag size={11} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </PageLayout>
  )
}
