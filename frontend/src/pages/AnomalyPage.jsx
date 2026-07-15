import React, { useState, 
                useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, Shield,
         Clock, Flag,
         ChevronDown,
         ChevronRight } from 'lucide-react'
import { getAnomalies, 
         flagArtifact } from '../api/client'
import PageLayout from '../components/PageLayout'
import toast from 'react-hot-toast'

const REASON_COLORS = {
  after_hours:
    'bg-orange-500/20 text-orange-400 '
    + 'border-orange-500/30',
  backdated:
    'bg-red-500/20 text-red-400 '
    + 'border-red-500/30',
  future_timestamp:
    'bg-danger/20 text-danger '
    + 'border-danger/30',
  zeroed_timestamp:
    'bg-gray-500/20 text-gray-400 '
    + 'border-gray-500/30',
  accessed_before_modified:
    'bg-purple-500/20 text-purple-400 '
    + 'border-purple-500/30',
  mass_modification:
    'bg-warning/20 text-warning '
    + 'border-warning/30',
  identical_timestamps:
    'bg-yellow-500/20 text-yellow-400 '
    + 'border-yellow-500/30',
}

export default function AnomalyPage() {
  const { caseId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = 
    useState(true)
  const [expanded, setExpanded] = 
    useState({})

  useEffect(() => {
    loadAnomalies()
  }, [caseId])

  const loadAnomalies = async () => {
    try {
      const res = await getAnomalies(caseId)
      setData(res.data)
    } catch {
      toast.error(
        'Failed to load anomalies')
    } finally {
      setLoading(false)
    }
  }

  const handleFlag = async (
      artifactId) => {
    try {
      await flagArtifact(caseId, artifactId)
      setData(prev => ({
        ...prev,
        anomalies: prev.anomalies.map(a =>
          a.id === artifactId
            ? {...a, is_flagged: 
               !a.is_flagged}
            : a
        )
      }))
    } catch {}
  }

  if (loading) return (
    <div className="flex items-center 
      justify-center h-64">
      <div className="w-6 h-6 border-2 
        border-accent rounded-full 
        border-t-transparent 
        animate-spin" />
    </div>
  )

  if (!data) return null

  const { anomalies, by_type,
          anomaly_count, total_artifacts,
          anomaly_rate,
          descriptions } = data

  return (
    <PageLayout
      title="Anomaly Detection"
      subtitle="Automatically flag files that show suspicious timestamp activity. This includes backdated files, files modified outside of working hours, or massive modifications that might indicate tampering or evidence wiping."
    >

      {/* Summary cards */}
      <div className="grid grid-cols-3 
        gap-3 mb-6">
        <div className="bg-surface-2 border 
          border-line rounded-xl p-4">
          <p className="text-xs 
            text-ink-2 mb-1">
            Total Artifacts
          </p>
          <p className="text-2xl font-bold 
            text-ink-0">
            {total_artifacts}
          </p>
        </div>
        <div className={`border rounded-xl 
          p-4 ${anomaly_count > 0
            ? 'bg-warning/10 '
              + 'border-warning/30'
            : 'bg-surface-2 border-line'}`}>
          <p className="text-xs 
            text-ink-2 mb-1">
            Anomalies Found
          </p>
          <p className={`text-2xl font-bold
            ${anomaly_count > 0
              ? 'text-warning'
              : 'text-success'}`}>
            {anomaly_count}
          </p>
        </div>
        <div className="bg-surface-2 border 
          border-line rounded-xl p-4">
          <p className="text-xs 
            text-ink-2 mb-1">
            Anomaly Rate
          </p>
          <p className={`text-2xl font-bold
            ${anomaly_rate > 10
              ? 'text-danger'
              : anomaly_rate > 3
              ? 'text-warning'
              : 'text-success'}`}>
            {anomaly_rate}%
          </p>
        </div>
      </div>

      {/* Anomaly type breakdown */}
      {Object.keys(by_type).length > 0 && (
        <div className="bg-surface-2 border 
          border-line rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold
            text-ink-0 mb-3">
            Anomaly Types Detected
          </h2>
          <div className="space-y-2">
            {Object.entries(by_type).map(
              ([reason, count]) => (
              <div key={reason}>
                <div className="flex items-center
                  justify-between mb-1">
                  <div className="flex items-center
                    gap-2">
                    <span className={`text-xs 
                      px-2 py-0.5 rounded-full 
                      border font-medium
                      ${REASON_COLORS[reason]
                        || 'bg-gray-500/20 '
                        + 'text-gray-400 '
                        + 'border-gray-500/30'}`}>
                      {reason.replace(/_/g,' ')}
                    </span>
                  </div>
                  <span className="text-xs 
                    text-ink-2">
                    {count} file(s)
                  </span>
                </div>
                <p className="text-xs 
                  text-ink-2 ml-1">
                  {descriptions[reason]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomalous files list */}
      {anomaly_count === 0 ? (
        <div className="text-center py-16 
          text-ink-2">
          <Shield size={40}
            className="mx-auto mb-3 
                       text-success 
                       opacity-60" />
          <p className="text-sm font-medium 
            text-success">
            No anomalies detected
          </p>
          <p className="text-xs mt-1">
            All timestamps appear consistent
            across {total_artifacts} artifacts
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold
            text-ink-2 uppercase 
            tracking-wider mb-3">
            Anomalous Files
          </h2>
          <div className="space-y-2">
            {anomalies.map((a, idx) => (
              <div key={a.id}
                className="bg-surface-2 border 
                  border-warning/20 
                  rounded-xl overflow-hidden">
                <button
                  onClick={() =>
                    setExpanded(prev => ({
                      ...prev,
                      [idx]: !prev[idx]
                    }))}
                  className="w-full flex 
                    items-center gap-3 p-3 
                    text-left"
                >
                  <AlertTriangle size={14}
                    className="text-warning 
                               shrink-0" />
                  <div className="flex-1 
                                  min-w-0">
                    <p className="text-sm 
                      font-medium 
                      text-ink-0 
                      truncate">
                      {a.filename}
                    </p>
                    <p className="text-xs 
                      text-ink-2 
                      font-mono truncate">
                      {a.internal_path}
                    </p>
                  </div>
                  <div className="flex items-center
                    gap-2 shrink-0">
                    {a.reasons.slice(0,2)
                      .map(r => (
                      <span key={r}
                        className={`text-xs 
                          px-1.5 py-0.5 
                          rounded border
                          ${REASON_COLORS[r]
                            || 'bg-gray-500/20'
                            + ' text-gray-400'
                            + ' border-gray-500'
                            + '/30'}`}>
                        {r.replace(/_/g,' ')}
                      </span>
                    ))}
                    {expanded[idx]
                      ? <ChevronDown size={13}
                          className="text-ink-2"/>
                      : <ChevronRight size={13}
                          className="text-ink-2"/>
                    }
                  </div>
                </button>

                {expanded[idx] && (
                  <div className="px-4 pb-4 
                    border-t border-line">
                    <div className="grid 
                      grid-cols-2 gap-3 
                      mt-3 mb-3">
                      {[
                        ['Modified',
                         a.modified_at],
                        ['Born', a.born_at],
                        ['Accessed',
                         a.accessed_at],
                        ['SHA-256',
                         a.sha256_hash
                           ?.slice(0,16)
                         + '...']
                      ].map(([label, val]) =>
                        (
                        <div key={label}>
                          <p className="text-xs 
                            text-ink-2">
                            {label}
                          </p>
                          <p className="text-xs 
                            font-mono 
                            text-ink-1">
                            {val || 'Unknown'}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex 
                      flex-wrap gap-1.5 mb-3">
                      {a.reasons.map(r => (
                        <div key={r}>
                          <span className={`
                            text-xs px-2 
                            py-0.5 rounded-full
                            border font-medium
                            ${REASON_COLORS[r]
                              || 'bg-gray-500/20'
                              + ' text-gray-400'
                              + ' border-gray-500'
                              + '/30'}`}>
                            {r.replace(
                              /_/g, ' ')}
                          </span>
                          <p className="text-xs 
                            text-ink-2 
                            mt-0.5 ml-1">
                            {descriptions[r]}
                          </p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => 
                        handleFlag(a.id)}
                      className={`flex 
                        items-center gap-1.5 
                        text-xs px-3 py-1.5 
                        rounded-lg border 
                        transition-colors
                        ${a.is_flagged
                          ? 'bg-warning/20 '
                            + 'border-warning/50'
                            + ' text-warning'
                          : 'bg-surface-1 '
                            + 'border-line '
                            + 'text-ink-2 '
                            + 'hover:text-warning'
                        }`}
                    >
                      <Flag size={11} />
                      {a.is_flagged
                        ? 'Remove Flag'
                        : 'Flag as Evidence'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  )
}
