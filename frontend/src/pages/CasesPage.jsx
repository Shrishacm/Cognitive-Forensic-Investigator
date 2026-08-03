import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, ChevronRight, Archive, Upload } from 'lucide-react'
import { getCases, createCase, archiveCase, importCase } from '../api/client'
import Badge from '../components/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import PageLayout from '../components/PageLayout'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { fromUtc } from '../utils/time'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function CasesPage({ setActiveCaseId }) {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    case_name: '',
    case_number: '',
    priority: 'Medium',
    description: '',
    created_by: 'Investigator',
    tags: ''
  })
  const [confirmArchive, setConfirmArchive] = useState(null)
  const importRef = useRef()

  useEffect(() => { loadCases() }, [])

  const loadCases = async () => {
    try {
      const res = await getCases()
      setCases(res.data)
    } catch {
      toast.error('Failed to load cases')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.case_name.trim()) {
      toast.error('Case name is required')
      return
    }
    try {
      const payload = {
        ...form,
        tags: form.tags
          ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
          : []
      }
      const res = await createCase(payload)
      toast.success('Case created')
      setShowForm(false)
      setForm({ case_name: '', case_number: '', priority: 'Medium', description: '', created_by: 'Investigator', tags: '' })
      setActiveCaseId(res.data.id)
      navigate(`/cases/${res.data.id}`)
    } catch {
      toast.error('Failed to create case')
    }
  }

  const openCase = (c) => {
    setActiveCaseId(c.id)
    navigate(`/cases/${c.id}`)
  }

  const handleArchive = async (c) => {
    try {
      await archiveCase(c.id)
      setCases(prev => prev.filter(x => x.id !== c.id))
      toast.success(`"${c.case_name}" archived`)
    } catch {
      toast.error('Archive failed')
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await importCase(fd)
      toast.success(`Imported: ${res.data.case_name}`)
      navigate(`/cases/${res.data.new_case_id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-amber-500 rounded-full border-t-transparent animate-spin" />
    </div>
  )

  return (
    <PageLayout
      title="Case Registry"
      subtitle={`${cases.length} REGISTERED FORENSIC CASE FILE(S)`}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            ref={importRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <button
            onClick={() => importRef.current?.click()}
            className="btn-secondary"
          >
            <Upload size={13} />
            Import Case ZIP
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus size={14} />
            New Case File
          </button>
        </div>
      }
    >
      {/* New Case Form */}
      {showForm && (
        <div style={{
          background: '#0C1220',
          border: '1px solid rgba(212, 163, 42, 0.35)',
          borderRadius: 4,
          padding: '20px',
          marginBottom: 20,
        }}>
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#D4A32A',
            marginBottom: 16,
          }}>
            CREATE NEW FORENSIC CASE FILE
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(122,154,184,0.8)', display: 'block', marginBottom: 4 }}>
                Case Name *
              </label>
              <input
                value={form.case_name}
                onChange={e => setForm({ ...form, case_name: e.target.value })}
                placeholder="Operation Phantom Trace"
                className="input"
              />
            </div>
            <div>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(122,154,184,0.8)', display: 'block', marginBottom: 4 }}>
                Case Number / Ref ID
              </label>
              <input
                value={form.case_number}
                onChange={e => setForm({ ...form, case_number: e.target.value })}
                placeholder="CFI-2026-001"
                className="input"
              />
            </div>
            <div>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(122,154,184,0.8)', display: 'block', marginBottom: 4 }}>
                Priority Rating
              </label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="input"
              >
                {['Low', 'Medium', 'High', 'Critical'].map(p => (
                  <option key={p} style={{ background: '#0C1220' }}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(122,154,184,0.8)', display: 'block', marginBottom: 4 }}>
                Lead Investigator
              </label>
              <input
                value={form.created_by}
                onChange={e => setForm({ ...form, created_by: e.target.value })}
                placeholder="Det. Markov"
                className="input"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(122,154,184,0.8)', display: 'block', marginBottom: 4 }}>
                Case Overview & Objectives
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Brief summary of investigation scope..."
                className="input"
                style={{ resize: 'none' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(122,154,184,0.8)', display: 'block', marginBottom: 4 }}>
                Tags / Classification Keywords (comma separated)
              </label>
              <input
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder="cybercrime, espionage, malware"
                className="input"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={handleCreate}
              className="btn-primary"
            >
              Initialize Case File
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Case grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cases.map(c => (
          <button
            key={c.id}
            onClick={() => openCase(c)}
            style={{
              background: '#0C1220',
              border: '1px solid rgba(42, 110, 166, 0.22)',
              borderRadius: 4,
              padding: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              width: '100%',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(212, 163, 42, 0.40)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(42, 110, 166, 0.22)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <FolderOpen size={16} style={{ color: '#D4A32A', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#E8F0F8' }}>
                    {c.case_name}
                  </span>
                  {c.case_number && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#D4A32A' }}>#{c.case_number}</span>
                  )}
                </div>
                {c.description && (
                  <p style={{ fontSize: 12, color: '#7A9AB8', marginLeft: 24, marginBottom: 8 }} className="truncate">
                    {c.description}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 24, flexWrap: 'wrap' }}>
                  <Badge label={c.status} />
                  <Badge label={c.priority} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(122, 154, 184, 0.6)' }}>
                    {c.evidence_count} evidence · {c.query_count} queries · {formatBytes(c.storage_bytes || 0)}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(122, 154, 184, 0.4)', marginLeft: 'auto' }}>
                    CREATED {formatDistanceToNow(fromUtc(c.created_at), { addSuffix: true }).toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12, flexShrink: 0 }}>
                <button
                  id={`archive-case-${c.id}`}
                  onClick={e => { e.stopPropagation(); setConfirmArchive(c) }}
                  style={{ padding: 4, background: 'none', border: 'none', color: 'rgba(122, 154, 184, 0.4)', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(122, 154, 184, 0.4)'}
                  title="Archive case"
                >
                  <Archive size={14} />
                </button>
                <ChevronRight size={16} style={{ color: '#D4A32A' }} />
              </div>
            </div>
          </button>
        ))}
        {cases.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(122, 154, 184, 0.4)' }}>
            <FolderOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>NO CASE FILES REGISTERED IN SYSTEM</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmArchive}
        title="Archive Case File"
        message={`Archive "${confirmArchive?.case_name}"? It will be removed from the active registry. Evidence files are preserved on disk.`}
        confirmLabel="Archive File"
        onConfirm={() => handleArchive(confirmArchive)}
        onCancel={() => setConfirmArchive(null)}
      />
    </PageLayout>
  )
}
