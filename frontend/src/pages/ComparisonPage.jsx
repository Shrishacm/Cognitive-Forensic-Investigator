import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  GitCompare, RefreshCw, ArrowLeftRight,
  Shield, AlertTriangle, Flag,
} from 'lucide-react'
import { getAllArtifacts, compareArtifacts } from '../api/client'
import PageLayout from '../components/PageLayout'
import toast from 'react-hot-toast'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(b) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

function shortDate(dt) {
  if (!dt) return '—'
  return dt.slice(0, 10)
}

// ── Similarity bar ───────────────────────────────────────────────────────────

function SimilarityBar({ pct }) {
  const color = pct >= 70 ? '#34d399' : pct >= 35 ? '#fbbf24' : '#f87171'
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        background: 'var(--color-white-06)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 3,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 40 }}>
        {pct}%
      </span>
    </div>
  )
}

// ── Artifact panel ───────────────────────────────────────────────────────────

function ArtifactPanel({ artifact, caseId, side, accentColor }) {
  if (!artifact) return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.015)',
      border: '1px dashed rgba(255,255,255,0.08)',
      borderRadius: 12, minHeight: 460, gap: 10,
    }}>
      <GitCompare size={28} color="rgba(255,255,255,0.1)" />
      <p style={{ fontSize: 12, color: 'var(--color-white-2)' }}>
        Select {side} artifact above
      </p>
    </div>
  )

  const ext = (artifact.file_extension || '').toLowerCase()
  const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'].includes(ext)
  const isPdf   = ext === '.pdf'
  const fileUrl = artifact.has_stored_file
    ? `/api/cases/${caseId}/artifacts/${artifact.id}/view`
    : null

  // Meta chips
  const chips = [
    { label: 'Modified',  val: shortDate(artifact.modified_at) },
    { label: 'Size',      val: formatBytes(artifact.file_size_bytes) },
    { label: 'Entropy',   val: artifact.shannon_entropy != null ? artifact.shannon_entropy.toFixed(2) : null },
    { label: 'Type',      val: artifact.extraction_type },
    { label: 'SHA-256',   val: artifact.sha256_hash ? artifact.sha256_hash.slice(0, 12) + '…' : null },
  ].filter(c => c.val && c.val !== '—')

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'rgba(255,255,255,0.025)',
      border: `1px solid ${accentColor}22`,
      borderRadius: 12, overflow: 'hidden', minHeight: 460,
    }}>
      {/* Colored top stripe */}
      <div style={{ height: 3, background: accentColor, opacity: 0.7 }} />

      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'var(--color-white-03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          {artifact.is_flagged && (
            <Flag size={11} color="#f87171" style={{ flexShrink: 0 }} />
          )}
          {artifact.is_anomaly && (
            <AlertTriangle size={11} color="#fbbf24" style={{ flexShrink: 0 }} />
          )}
          <p style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {artifact.filename}
          </p>
        </div>
        <p style={{
          fontSize: 10, color: 'var(--color-white-3)', fontFamily: 'monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {artifact.internal_path}
        </p>
      </div>

      {/* Meta strip */}
      <div style={{
        display: 'flex', gap: 14, padding: '8px 16px', flexWrap: 'wrap',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        {chips.map(({ label, val }) => (
          <div key={label}>
            <span style={{
              fontSize: 9, color: 'var(--color-white-2)',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              display: 'block', marginBottom: 2,
            }}>
              {label}
            </span>
            <span style={{
              fontSize: 11, color: 'var(--color-white-5)',
              fontFamily: label === 'SHA-256' || label === 'Entropy' ? 'monospace' : 'inherit',
            }}>
              {val}
            </span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {fileUrl && isImage ? (
          <img
            src={fileUrl}
            alt={artifact.filename}
            style={{ maxWidth: '100%', borderRadius: 8, display: 'block' }}
          />
        ) : fileUrl && isPdf ? (
          <iframe
            src={fileUrl}
            style={{ width: '100%', height: 420, border: 'none', borderRadius: 8 }}
            title={artifact.filename}
          />
        ) : artifact.extracted_text ? (
          <pre style={{
            fontSize: 11, fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            color: 'var(--color-white-5)', whiteSpace: 'pre-wrap',
            wordBreak: 'break-word', lineHeight: 1.75, margin: 0,
          }}>
            {artifact.extracted_text.slice(0, 6000)}
            {artifact.extracted_text.length > 6000 && (
              <span style={{ color: 'var(--color-white-2)', fontStyle: 'italic' }}>
                {'\n\n… truncated (showing first 6 000 chars)'}
              </span>
            )}
          </pre>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 8, marginTop: 40,
          }}>
            <Shield size={28} color="rgba(255,255,255,0.1)" />
            <p style={{ fontSize: 12, color: 'var(--color-white-2)' }}>
              No extracted text content
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ComparisonPage() {
  const { caseId }        = useParams()
  const [searchParams]    = useSearchParams()
  const [artifacts, setArtifacts]   = useState([])
  const [sel1, setSel1]             = useState(searchParams.get('a1') || '')
  const [sel2, setSel2]             = useState(searchParams.get('a2') || '')
  const [compData, setCompData]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [artifactsLoading, setArtifactsLoading] = useState(true)

  // Load artifact list once
  useEffect(() => {
    ;(async () => {
      try {
        const res = await getAllArtifacts(caseId, { page_size: 500 })
        setArtifacts(res.data.items || res.data || [])
      } catch {
        toast.error('Could not load artifacts list')
      } finally {
        setArtifactsLoading(false)
      }
    })()
  }, [caseId])

  // Auto-compare whenever both selectors are set
  const runCompare = useCallback(async (id1, id2) => {
    if (!id1 || !id2) return
    if (id1 === id2) {
      toast.error('Please select two different artifacts')
      return
    }
    setLoading(true)
    try {
      const res = await compareArtifacts(caseId, id1, id2)
      setCompData(res.data)
    } catch {
      toast.error('Comparison failed — check that both artifacts exist')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    if (sel1 && sel2) runCompare(sel1, sel2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel1, sel2])

  const handleSwap = () => {
    setSel1(sel2)
    setSel2(sel1)
  }

  const selectStyle = {
    flex: 1,
    background: 'var(--color-white-04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 12,
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'auto',
  }

  const ds = compData?.diff_stats

  return (
    <PageLayout
      title="Evidence Comparison"
      subtitle="Select two artifacts to view them side by side — text, images, metadata, and similarity analysis"
      fullWidth
    >
      {/* Selector row */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10, marginBottom: 16,
      }}>
        <select
          value={sel1}
          onChange={e => setSel1(e.target.value)}
          disabled={artifactsLoading}
          style={selectStyle}
        >
          <option value="">Select first artifact…</option>
          {artifacts.map(a => (
            <option key={a.id} value={a.id}>
              {a.filename} — {(a.internal_path || '').split('/').slice(-2).join('/')}
            </option>
          ))}
        </select>

        <button
          onClick={handleSwap}
          title="Swap artifacts"
          style={{
            padding: '8px 10px', borderRadius: 8, flexShrink: 0,
            background: 'var(--color-white-04)',
            border: '1px solid rgba(255,255,255,0.09)',
            color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', transition: 'all 0.15s',
          }}
        >
          <ArrowLeftRight size={16} />
        </button>

        <select
          value={sel2}
          onChange={e => setSel2(e.target.value)}
          disabled={artifactsLoading}
          style={selectStyle}
        >
          <option value="">Select second artifact…</option>
          {artifacts.map(a => (
            <option key={a.id} value={a.id}>
              {a.filename} — {(a.internal_path || '').split('/').slice(-2).join('/')}
            </option>
          ))}
        </select>

        {sel1 && sel2 && (
          <button
            onClick={() => runCompare(sel1, sel2)}
            disabled={loading}
            style={{
              padding: '8px 16px', borderRadius: 8, flexShrink: 0,
              background: '#4f46e5', border: 'none',
              color: 'var(--color-white-full)', fontSize: 12, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />Comparing…</>
              : <><GitCompare size={12} />Re-compare</>}
          </button>
        )}
      </div>

      {/* Similarity / diff stats bar */}
      {ds && !loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20,
          padding: '12px 18px', marginBottom: 16,
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 600, flexShrink: 0 }}>
            Text Similarity
          </span>
          <SimilarityBar pct={ds.similarity_pct} />
          {[
            ['Common words',     ds.common_words],
            ['Unique to left',  ds.unique_to_first],
            ['Unique to right', ds.unique_to_second],
          ].map(([label, val]) => (
            <div key={label} style={{ textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: 9, color: 'var(--color-white-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
                {label}
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
                {val.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '60px 20px',
          color: 'var(--color-white-3)', fontSize: 13,
        }}>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Comparing artifacts…
        </div>
      )}

      {/* Side-by-side panels */}
      {!loading && (compData || sel1 || sel2) && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <ArtifactPanel
            artifact={compData?.artifact_1 || null}
            caseId={caseId}
            side="first"
            accentColor="#818cf8"
          />
          <ArtifactPanel
            artifact={compData?.artifact_2 || null}
            caseId={caseId}
            side="second"
            accentColor="#34d399"
          />
        </div>
      )}

      {/* Empty state — neither selector touched yet */}
      {!loading && !compData && !sel1 && !sel2 && (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          background: 'rgba(255,255,255,0.015)',
          border: '1px dashed rgba(255,255,255,0.07)',
          borderRadius: 14,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <GitCompare size={30} color="rgba(99,102,241,0.5)" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-white-4)', marginBottom: 8 }}>
            Select two artifacts to compare
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-white-2)', maxWidth: 380, margin: '0 auto' }}>
            Use the dropdowns above to choose any two extracted files.
            Documents, emails, logs, and images are displayed side by side
            with automatic similarity analysis.
          </p>
        </div>
      )}
    </PageLayout>
  )
}
