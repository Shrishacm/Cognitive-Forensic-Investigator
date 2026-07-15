import React, { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Upload, File, FileText,
  Database, Music, Video,
  Image, Mail, Table,
  CheckCircle, Clock,
  AlertCircle, RefreshCw,
  Info, Shield, Archive,
  Play, Loader, X, Cpu,
  ChevronDown, ChevronUp,
  Zap, Activity, ChevronRight, Square,
  Zap as ZapIcon, Sliders, Save, MemoryStick, HardDrive
} from "lucide-react"
import {
  getEvidence, uploadEvidence,
  getEvidenceItem, archiveEvidence,
  verifyEvidence,
  getSystemInfo, addToQueue, estimateTime,
  getStorageStats,
  getQueue, getQueueHistory, cancelJob,
  forceStartJob, stopJob, updateJobSettings
} from "../api/client"
import Badge from "../components/Badge"
import ConfirmDialog from "../components/ConfirmDialog"
import PageLayout from "../components/PageLayout"
import toast from "react-hot-toast"
import { formatDistanceToNow } from "date-fns"
import useWebSocket from "../hooks/useWebSocket"

// ── Supported format groups ────────────────────────────────
const FILE_GROUPS = [
  {
    label: 'Forensic Images',
    icon: Database,
    color: 'text-accent',
    exts: '.E01 .001 .dd .raw .img',
    desc: 'Full disk image ingestion via pytsk3 — extracts all files inside the image'
  },
  {
    label: 'Documents',
    icon: FileText,
    color: 'text-blue-400',
    exts: '.pdf .txt .docx .doc',
    desc: 'Text extraction with full content indexing'
  },
  {
    label: 'Spreadsheets & Slides',
    icon: Table,
    color: 'text-green-400',
    exts: '.xlsx .xls .pptx .ppt',
    desc: 'Cell data and slide text extracted and indexed'
  },
  {
    label: 'Audio',
    icon: Music,
    color: 'text-purple-400',
    exts: '.mp3 .wav .m4a .flac .ogg .aac',
    desc: 'Transcribed via Whisper (local AI) — no cloud required'
  },
  {
    label: 'Video',
    icon: Video,
    color: 'text-pink-400',
    exts: '.mp4 .avi .mov .mkv .wmv',
    desc: 'Metadata extracted + audio track transcribed via Whisper'
  },
  {
    label: 'Images',
    icon: Image,
    color: 'text-yellow-400',
    exts: '.jpg .jpeg .png .tiff .bmp',
    desc: 'OCR (text in images) + EXIF metadata (GPS, camera, date)'
  },
  {
    label: 'Email',
    icon: Mail,
    color: 'text-orange-400',
    exts: '.eml .msg',
    desc: 'Headers, body, sender, recipient, date all extracted'
  },
]

// ── Per-extension icon map ─────────────────────────────────
const EXT_ICON = {
  '.pdf':  FileText, '.txt':  FileText,
  '.docx': FileText, '.doc':  FileText,
  '.xlsx': Table,    '.xls':  Table,
  '.pptx': FileText, '.ppt':  FileText,
  '.mp3':  Music,    '.wav':  Music,
  '.m4a':  Music,    '.flac': Music,
  '.ogg':  Music,    '.aac':  Music,
  '.mp4':  Video,    '.avi':  Video,
  '.mov':  Video,    '.mkv':  Video,
  '.wmv':  Video,
  '.jpg':  Image,    '.jpeg': Image,
  '.png':  Image,    '.tiff': Image,
  '.bmp':  Image,
  '.eml':  Mail,     '.msg':  Mail,
  '.e01':  Database, '.001':  Database,
  '.dd':   Database, '.raw':  Database,
  '.img':  Database,
}

const statusIcon = {
  'Uploaded': <Clock size={14} className="text-warning" />,
  'Queued': <Clock size={14} className="text-warning" />,
  'Running': <Loader size={14} className="text-accent animate-spin" />,
  'Indexed': <CheckCircle size={14} className="text-success" />,
  'Completed': <CheckCircle size={14} className="text-success" />,
  'Failed': <AlertCircle size={14} className="text-danger" />
}

const ACCEPT_STRING =
  '.pdf,.txt,.docx,.doc,' +
  '.xlsx,.xls,.pptx,.ppt,' +
  '.mp3,.wav,.m4a,.flac,.ogg,.aac,' +
  '.mp4,.avi,.mov,.mkv,.wmv,' +
  '.jpg,.jpeg,.png,.tiff,.bmp,' +
  '.eml,.msg,.e01,.001,.dd,.raw,.img'

function getFileIcon(filename) {
  if (!filename) return File
  const ext = '.' + filename.split('.').pop().toLowerCase()
  return EXT_ICON[ext] || File
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

// ── Sub-components ─────────────────────────────────────────

function ProgressBar({ percent, status }) {
  const color =
    status === 'Failed'  ? 'bg-danger'
    : status === 'Stopped' ? 'bg-warning'
    : status === 'Completed' ? 'bg-success'
    : 'bg-accent'
  return (
    <div className="w-full bg-surface-1 rounded-full h-2 mt-2">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  )
}

function formatSeconds(s) {
  if (!s) return '—'
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

const STEPS = [
  { key: '1', label: 'Reading' },
  { key: '2', label: 'Extracting' },
  { key: '3', label: 'Chunking' },
  { key: '4', label: 'Embedding' },
  { key: '5', label: 'Graph' },
]

function detectStep(currentStep) {
  if (!currentStep) return 0
  const m = currentStep.match(/Step (\d)\/5/)
  return m ? parseInt(m[1]) : 0
}

function StepIndicator({ currentStep }) {
  const active = detectStep(currentStep)
  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      {STEPS.map((s, i) => {
        const done    = active > i + 1
        const running = active === i + 1
        return (
          <React.Fragment key={s.key}>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-all
              ${done    ? 'bg-success/15 border-success/40 text-success'
              : running ? 'bg-accent/15 border-accent/40 text-accent animate-pulse'
              :           'bg-surface-1 border-line text-ink-2 opacity-40'}`}>
              {done    ? <CheckCircle size={9} />
               : running ? <Loader size={9} className="animate-spin" /> : null}
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight size={10} className="text-ink-2 opacity-25 shrink-0" />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Instructions panel ─────────────────────────────────────
function InstructionsPanel() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-surface-2 border border-accent/20 rounded-xl mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/5 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider">
          <Info size={13} />
          How ingestion works — specs &amp; resource settings
        </span>
        {open ? <ChevronUp size={13} className="text-ink-2" /> : <ChevronDown size={13} className="text-ink-2" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-line">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-surface-1 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={13} className="text-accent" />
                <p className="text-xs font-semibold text-ink-0">5 Ingestion Phases</p>
              </div>
              <ol className="space-y-1.5">
                {[
                  ['Read file', 'Load bytes from disk'],
                  ['Extract text', 'PDF, DOCX, audio, images (OCR)'],
                  ['Chunk text', 'Split into ~500-word segments'],
                  ['Embed chunks', 'Store vectors in Qdrant for AI search'],
                  ['Entity graph', 'Extract names, IPs, locations, dates'],
                ].map(([name, desc], i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent text-xs font-bold shrink-0 w-4">{i + 1}.</span>
                    <div>
                      <p className="text-xs font-medium text-ink-0 leading-none">{name}</p>
                      <p className="text-[10px] text-ink-2 leading-tight mt-0.5">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-surface-1 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={13} className="text-accent" />
                <p className="text-xs font-semibold text-ink-0">Supported File Types</p>
              </div>
              <div className="space-y-1.5">
                {[
                  ['Documents', 'PDF, TXT, DOCX, XLSX, PPTX, EML, MSG'],
                  ['Images (OCR)', 'JPG, PNG, TIFF, BMP (requires Tesseract)'],
                  ['Audio', 'MP3, WAV, M4A, FLAC (requires Whisper)'],
                  ['Video', 'MP4, AVI, MOV, MKV (requires ffmpeg)'],
                  ['Disk images', '.E01, .DD, .RAW, .IMG (forensic)'],
                ].map(([type, exts]) => (
                  <div key={type}>
                    <p className="text-[10px] font-semibold text-ink-2 uppercase tracking-wide">{type}</p>
                    <p className="text-xs text-ink-1">{exts}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-1 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={13} className="text-accent" />
                <p className="text-xs font-semibold text-ink-0">Resource Settings</p>
              </div>
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-ink-0">CPU Throttle %</p>
                  <p className="text-[10px] text-ink-2 leading-snug mt-0.5">
                    Limits how much CPU ingestion uses. 100% = full speed,
                    50% = half speed, 25% = very slow but minimal impact.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink-0">Min Free RAM (GB)</p>
                  <p className="text-[10px] text-ink-2 leading-snug mt-0.5">
                    RAM kept free for OS. If RAM drops below this, ingestion
                    pauses 30–60s and auto-resumes when free.
                  </p>
                </div>
                <div className="bg-accent/5 border border-accent/20 rounded p-2">
                  <p className="text-[10px] text-accent font-medium">
                    💡 Use Force Start to bypass limits instantly.
                    Use Edit to adjust specs on any active job.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Edit Settings Modal ────────────────────────────────────
function EditSettingsModal({ job, onClose, onSaved }) {
  const [cpu, setCpu]     = useState(job.cpu_throttle_percent ?? 70)
  const [ram, setRam]     = useState(Math.round((job.min_free_ram_mb ?? 2048) / 1024 * 10) / 10)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateJobSettings(job.id, {
        cpu_throttle_percent: cpu,
        min_free_ram_mb:      Math.round(ram * 1024),
      })
      toast.success(`Settings updated — CPU ${cpu}%, RAM floor ${ram} GB`)
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 border border-line rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-ink-0">Edit Resource Settings</h2>
          </div>
          <button onClick={onClose} className="text-ink-2 hover:text-ink-0 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status badge */}
          <div className="flex items-center gap-2 bg-surface-1 rounded-lg px-3 py-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${job.status === 'Running' ? 'bg-accent animate-pulse' : 'bg-warning'}`} />
            <p className="text-xs text-ink-2">
              <span className="font-medium text-ink-0">{job.status}</span>
              {job.status === 'Running' && ' — changes apply on next batch check'}
              {job.status === 'Queued'  && ' — changes apply when job starts'}
            </p>
          </div>

          {/* CPU slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-ink-0 flex items-center gap-1.5">
                <Cpu size={12} className="text-accent" /> CPU Throttle
              </label>
              <span className={`text-sm font-bold tabular-nums
                ${cpu >= 80 ? 'text-warning' : cpu >= 50 ? 'text-accent' : 'text-success'}`}>
                {cpu}%
              </span>
            </div>
            <input
              type="range" min="10" max="100" step="5"
              value={cpu}
              onChange={e => setCpu(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-ink-2 mt-0.5">
              <span>10% (very slow)</span>
              <span>50% (balanced)</span>
              <span>100% (full)</span>
            </div>
          </div>

          {/* RAM slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-ink-0 flex items-center gap-1.5">
                <MemoryStick size={12} className="text-accent" /> Min Free RAM
              </label>
              <span className={`text-sm font-bold tabular-nums
                ${ram < 1 ? 'text-danger' : ram < 2 ? 'text-warning' : 'text-success'}`}>
                {ram} GB
              </span>
            </div>
            <input
              type="range" min="0" max="8" step="0.5"
              value={ram}
              onChange={e => setRam(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-ink-2 mt-0.5">
              <span>0 GB (override)</span>
              <span>2 GB (safe)</span>
              <span>8 GB (cautious)</span>
            </div>
            {ram < 1 && (
              <p className="text-[10px] text-danger mt-1 flex items-center gap-1">
                <AlertCircle size={10} />
                0 GB min RAM — ingestion will never pause. Use carefully.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-line text-xs text-ink-2 hover:text-ink-0 hover:border-ink-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────

export default function EvidencePage() {
  const { caseId } = useParams()
  const [evidence, setEvidence] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [investigator, setInvestigator] = useState('Investigator')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [showFormats, setShowFormats] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(null)
  const [verifyResult, setVerifyResult] = useState({})
  const [verifying, setVerifying] = useState({})
  const fileRef = useRef()
  const pollRef = useRef({})

  // Queue state
  const [sysInfo, setSysInfo] = useState(null)
  const [queueConfig, setQueueConfig] = useState({})
  const [estimates, setEstimates] = useState({})
  const [addingToQueue, setAddingToQueue] = useState({})

  // Storage stats
  const [storageStats, setStorageStats] = useState(null)

  const loadEvidence = async () => {
    try {
      const res = await getEvidence(caseId)
      setEvidence(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      toast.error('Failed to load evidence')
    }
  }

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('investigator', investigator)
      await uploadEvidence(caseId, formData)
      toast.success(`Uploaded ${file.name}`)
      loadEvidence()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleArchive = async (ev) => {
    try {
      await archiveEvidence(caseId, ev.id)
      toast.success('Evidence archived')
      setConfirmArchive(null)
      loadEvidence()
    } catch (e) {
      toast.error('Failed to archive')
    }
  }

  const handleVerify = async (id) => {
    setVerifying(prev => ({ ...prev, [id]: true }))
    try {
      const res = await verifyEvidence(caseId, id)
      setVerifyResult(prev => ({ ...prev, [id]: res.data }))
      toast.success('Verification complete')
    } catch (e) {
      toast.error('Verification failed')
    } finally {
      setVerifying(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleEstimate = async (ev) => {
    try {
      const cpu = queueConfig[ev.id]?.cpu_throttle_percent || 70
      const res = await estimateTime([ev.id], cpu)
      setEstimates(prev => ({
        ...prev,
        [ev.id]: res.data.estimates[ev.id] || { human_readable: 'Unknown' }
      }))
    } catch (e) {
      toast.error('Failed to estimate time')
    }
  }

  const handleAddToQueue = async (ev) => {
    setAddingToQueue(prev => ({ ...prev, [ev.id]: true }))
    try {
      const conf = queueConfig[ev.id] || {}
      await addToQueue({
        evidence_ids: [ev.id],
        cpu_throttle_percent: conf.cpu_throttle_percent || 70,
        min_free_ram_mb: conf.min_free_ram_mb !== undefined && conf.min_free_ram_mb !== '' ? conf.min_free_ram_mb : 2048,
        priority: 1
      })
      toast.success('Added to queue')
      loadEvidence()
      loadQueue()
      loadHistory()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to queue')
    } finally {
      setAddingToQueue(prev => ({ ...prev, [ev.id]: false }))
    }
  }

  useEffect(() => {
    loadEvidence()
  }, [caseId])

  // --- QUEUE LOGIC ---
  const [queue, setQueue]           = useState([])
  const [history, setHistory]       = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [liveProgress, setLiveProgress] = useState({})
  const [editingJob, setEditingJob] = useState(null)   // job being settings-edited
  const [overrideJobs, setOverrideJobs] = useState({}) // jobId -> bool (local UI state)
  const [stoppingJobs, setStoppingJobs] = useState({}) // jobId -> bool

  useEffect(() => {
  }, [])

  useWebSocket('/ws/global', useCallback((data) => {
    if (data.type === 'INGESTION_COMPLETE' || data.type === 'INGESTION_FAILED') {
      loadQueue()
      loadHistory()
      if (data.job_id) {
        setLiveProgress(prev => { const n = { ...prev }; delete n[data.job_id]; return n })
        setOverrideJobs(prev => { const n = { ...prev }; delete n[data.job_id]; return n })
        setStoppingJobs(prev => { const n = { ...prev }; delete n[data.job_id]; return n })
      }
    } else if (data.type === 'INGESTION_PROGRESS' && data.job_id) {
      setLiveProgress(prev => ({
        ...prev,
        [data.job_id]: {
          percent: data.percent ?? prev[data.job_id]?.percent ?? 0,
          step:    data.step    ?? prev[data.job_id]?.step    ?? '',
        }
      }))
    }
  }, []))

  const loadAll = async () => {
    await Promise.all([loadQueue(), loadHistory(), loadSysInfo()])
  }

  const loadQueue = async () => {
    try {
      const res = await getQueue()
      setQueue(Array.isArray(res.data) ? res.data : [])
    } catch {}
  }

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await getQueueHistory()
      setHistory(Array.isArray(res.data) ? res.data : [])
    } catch {}
    finally { setLoadingHistory(false) }
  }

  const loadSysInfo = async () => {
    try {
      const res = await getSystemInfo()
      setSysInfo(res.data)
    } catch {}
  }

  const handleCancel = async (jobId) => {
    try {
      await cancelJob(jobId)
      await loadQueue()
      toast.success('Job cancelled')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Cancel failed')
    }
  }

  const handleForceStart = async (jobId) => {
    try {
      await forceStartJob(jobId)
      setOverrideJobs(prev => ({ ...prev, [jobId]: true }))
      toast.success('Force-start activated — resource limits bypassed')
      await loadQueue()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Force-start failed')
    }
  }

  const handleStop = async (jobId) => {
    try {
      setStoppingJobs(prev => ({ ...prev, [jobId]: true }))
      await stopJob(jobId)
      toast.success('Stop signal sent — job will halt after current batch')
      setTimeout(loadQueue, 1500)
    } catch (e) {
      setStoppingJobs(prev => { const n = { ...prev }; delete n[jobId]; return n })
      toast.error(e.response?.data?.detail || 'Stop failed')
    }
  }

  const handleRefresh = async () => {
    toast.success('Refreshed')
  }

  const running = queue.filter(j => j.status === 'Running')
  const waiting = queue.filter(j => j.status === 'Queued')

  const mergeProgress = (job) => {
    const live = liveProgress[job.id]
    if (!live) return job
    return {
      ...job,
      progress_percent: live.percent ?? job.progress_percent,
      current_step:     live.step    ?? job.current_step,
    }
  }

  const ramColor = !sysInfo ? 'text-ink-2'
    : sysInfo.system.available_ram_mb < 2048 ? 'text-danger'
    : sysInfo.system.available_ram_mb < 3072 ? 'text-warning'
    : 'text-success'


  useEffect(() => { loadAll(); const qPoll = setInterval(loadAll, 4000); return () => clearInterval(qPoll); }, [caseId])
  return (
    <PageLayout
      title="Evidence Files"
      subtitle="Upload the digital files you want to investigate — disk images, documents, photos, emails, audio, and more. The system will automatically extract text, metadata, and entities from each file so you can search and analyse them."
      fullWidth={true}
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Library */}
        <div className="xl:col-span-7 space-y-6">
      {/* Supported formats toggle */}
      <button
        id="toggle-formats-btn"
        onClick={() => setShowFormats(!showFormats)}
        className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-accent mb-4 transition-colors"
      >
        <Info size={12} />
        {showFormats ? 'Hide supported formats' : 'View all supported formats'}
      </button>

      {showFormats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
          {FILE_GROUPS.map(group => (
            <div key={group.label}
              className="bg-surface-2 border border-line rounded-xl p-3 flex gap-3">
              <group.icon size={18} className={`${group.color} shrink-0 mt-0.5`} />
              <div>
                <p className="text-xs font-semibold text-ink-0">
                  {group.label}
                </p>
                <p className="text-xs font-mono text-ink-2 mt-0.5">
                  {group.exts}
                </p>
                <p className="text-xs text-ink-2 mt-1">
                  {group.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Investigator name */}
      <div className="mb-4">
        <label className="text-xs text-ink-2 mb-1 block">Your Name</label>
        <input
          id="investigator-name"
          value={investigator}
          onChange={e => setInvestigator(e.target.value)}
          className="bg-surface-2 border border-line rounded-lg px-3 py-2
            text-sm text-ink-0 focus:outline-none focus:border-accent w-64"
        />
      </div>

      {/* Deleted file recovery toggle */}
      <div className="flex items-center gap-3 mb-5">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            id="toggle-deleted-recovery"
            onClick={() => setIncludeDeleted(!includeDeleted)}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer
              ${includeDeleted
                ? 'bg-warning'
                : 'bg-surface-1 border border-line'}`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white
                transition-transform shadow-sm
                ${includeDeleted ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </div>
          <span className="text-xs text-ink-1 select-none">
            Recover deleted files
          </span>
        </label>
        {includeDeleted && (
          <span className="text-xs text-warning">
            ⚠ Only applies to forensic disk images (.E01 / .001 / .dd)
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        id="drop-zone"
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          handleUpload(e.dataTransfer.files[0])
        }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center
          cursor-pointer transition-colors mb-6
          ${dragOver
            ? 'border-accent bg-accent/10'
            : 'border-line hover:border-accent/50'}`}
      >
        <Upload size={32} className="mx-auto mb-3 text-ink-2" />
        <p className="text-ink-0 font-medium">
          Drop a file here or click to upload
        </p>
        <p className="text-ink-2 text-sm mt-1">
          Forensic images · Documents · Audio · Video · Images · Email
        </p>
        <p className="text-ink-2 text-xs mt-1">
          All files are ingested locally — nothing leaves your machine
        </p>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_STRING}
          className="hidden"
          onChange={e => handleUpload(e.target.files[0])}
        />
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-ink-2 mb-4">
          <RefreshCw size={14} className="animate-spin" />
          Uploading…
        </div>
      )}


      {/* Storage stats banner */}
      {storageStats && storageStats.total_mb > 0 && (
        <div className="flex items-center gap-3 mb-4 text-xs text-ink-2 bg-surface-2 border border-line rounded-xl px-4 py-2">
          <HardDrive size={13} className="text-accent" />
          <span>
            Extracted files stored:{' '}
            <span className="text-ink-0 font-medium">
              {storageStats.total_mb} MB
            </span>
            {' '}across{' '}
            <span className="text-ink-0 font-medium">
              {storageStats.total_files}
            </span>
            {' '}files
            {storageStats.viewable_files > 0 && (
              <span className="ml-2">
                · {storageStats.viewable_files} viewable in browser
              </span>
            )}
          </span>
        </div>
      )}

      {/* Evidence list */}
      <div className="space-y-3">
        {evidence.map(ev => {
          const Icon = getFileIcon(ev.original_filename)
          return (
            <div key={ev.id} className="bg-surface-2 border border-line rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-accent shrink-0" />
                  <div>
                    <p className="font-medium text-ink-0 text-sm">
                      {ev.original_filename}
                    </p>
                    <p className="text-xs text-ink-2 mt-0.5">
                      {formatBytes(ev.file_size_bytes)} · Uploaded by {ev.ingested_by}
                    </p>
                    {ev.sha256_hash && (
                      <p className="text-xs font-mono text-ink-2 mt-0.5">
                        SHA-256: {ev.sha256_hash.slice(0, 16)}…
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {statusIcon[ev.status]}
                  <Badge label={ev.status} />
                  {/* Archive button */}
                  <button
                    id={`archive-btn-${ev.id}`}
                    onClick={() => setConfirmArchive(ev)}
                    className="p-1 rounded text-ink-2 hover:text-danger transition-colors"
                    title="Archive evidence"
                  >
                    <Archive size={13} />
                  </button>
                </div>
              </div>

              {/* Indexed: show stats + verify button */}
              {ev.status === 'Indexed' && (
                <>
                  <div className="flex gap-4 mt-3 pt-3 border-t border-line">
                    <span className="text-xs text-ink-2">
                      {ev.chunk_count} chunks
                    </span>
                    <span className="text-xs text-ink-2">
                      {ev.entity_count} entities
                    </span>
                  </div>

                  {/* Integrity verify */}
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      id={`verify-btn-${ev.id}`}
                      onClick={() => handleVerify(ev.id)}
                      disabled={verifying[ev.id]}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5
                        rounded-lg border border-line text-ink-2
                        hover:border-accent/50 hover:text-accent
                        disabled:opacity-50 transition-colors"
                    >
                      {verifying[ev.id]
                        ? <RefreshCw size={11} className="animate-spin" />
                        : <Shield size={11} />}
                      Verify Integrity
                    </button>

                    {verifyResult[ev.id] && (
                      <span className={`text-xs font-medium flex items-center gap-1
                        ${verifyResult[ev.id].passed
                          ? 'text-success'
                          : 'text-danger'}`}>
                        {verifyResult[ev.id].passed
                          ? <><CheckCircle size={11} /> Hash match — unmodified</>
                          : <><AlertCircle size={11} /> HASH MISMATCH — tampered!</>}
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Queue config — shown for Uploaded items */}
              {ev.status === 'Uploaded' && (
                <div className="mt-3 pt-3 border-t border-line">
                  {/* Resource config */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-ink-2 block">
                          Min Free RAM (GB)
                        </label>
                        {((queueConfig[ev.id]?.min_free_ram_mb !== undefined ? queueConfig[ev.id].min_free_ram_mb : 2048) / 1024) < 2 && (
                          <span className="text-[10px] text-warning flex items-center gap-1" title="Low RAM might cause system instability">
                            <AlertCircle size={10} /> &lt; 2GB Warning
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="32"
                        step="0.5"
                        value={
                          queueConfig[ev.id]?.min_free_ram_mb === '' 
                            ? '' 
                            : ((queueConfig[ev.id]?.min_free_ram_mb !== undefined ? queueConfig[ev.id].min_free_ram_mb : 2048) / 1024)
                        }
                        onChange={e => {
                          const val = e.target.value;
                          setQueueConfig(prev => ({
                            ...prev,
                            [ev.id]: {
                              ...prev[ev.id],
                              min_free_ram_mb: val === '' ? '' : Math.round(parseFloat(val) * 1024)
                            }
                          }))
                        }}
                        className="w-full bg-surface-1 border border-line
                          rounded-lg px-2 py-1.5 text-xs text-ink-0
                          focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-ink-2 mb-1 block">
                        CPU Speed (%)
                      </label>
                      <input
                        type="range"
                        min="25"
                        max="100"
                        step="25"
                        value={
                          queueConfig[ev.id]?.cpu_throttle_percent || 70
                        }
                        onChange={e =>
                          setQueueConfig(prev => ({
                            ...prev,
                            [ev.id]: {
                              ...prev[ev.id],
                              cpu_throttle_percent: parseInt(e.target.value)
                            }
                          }))
                        }
                        className="w-full mt-2"
                      />
                      <div className="flex justify-between text-xs text-ink-2 mt-0.5">
                        <span>Slow</span>
                        <span className="font-medium text-ink-0">
                          {queueConfig[ev.id]?.cpu_throttle_percent || 70}%
                        </span>
                        <span>Fast</span>
                      </div>
                    </div>
                  </div>

                  {/* Time estimate */}
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => handleEstimate(ev)}
                      className="text-xs text-ink-2 hover:text-accent
                        flex items-center gap-1 transition-colors"
                    >
                      <Clock size={11} />
                      Estimate time
                    </button>
                    {estimates[ev.id] && (
                      <span className="text-xs text-accent font-medium">
                        ~{estimates[ev.id].human_readable}
                      </span>
                    )}
                    {estimates[ev.id]?.note && (
                      <span className="text-xs text-ink-2">(±50%)</span>
                    )}
                  </div>

                  {/* Add to queue button */}
                  <button
                    onClick={() => handleAddToQueue(ev)}
                    disabled={addingToQueue[ev.id]}
                    className="flex items-center gap-2 bg-accent
                      hover:bg-accent-hover disabled:opacity-50 text-white
                      px-4 py-2 rounded-xl text-xs font-medium
                      transition-colors"
                  >
                    {addingToQueue[ev.id]
                      ? <Loader size={12} className="animate-spin" />
                      : <Play size={12} />}
                    Add to Queue
                  </button>
                </div>
              )}

              {/* Queued status label */}
              {ev.status === 'Queued' && (
                <p className="text-xs text-warning mt-2 flex items-center gap-1">
                  <Clock size={11} />
                  Waiting in queue
                </p>
              )}

              {ev.status === 'Failed' && ev.error_message && (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-xs text-danger">
                    Error: {ev.error_message}
                  </p>
                  <button
                    onClick={() => {
                      setEvidence(prev => prev.map(e =>
                        e.id === ev.id ? { ...e, status: 'Uploaded', error_message: null } : e
                      ))
                    }}
                    className="self-start flex items-center gap-1.5 text-xs px-3 py-1.5
                      rounded-lg border border-danger/30 text-danger
                      hover:bg-danger/10 transition-colors"
                  >
                    <RefreshCw size={11} />
                    Retry Ingestion
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {evidence.length === 0 && (
          <div className="text-center py-12 text-ink-2">
            <File size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No evidence files yet</p>
            <p className="text-xs mt-1">Upload a file above to get started</p>
          </div>
        )}
      </div>

      {/* Archive confirmation dialog */}
      <ConfirmDialog
        isOpen={!!confirmArchive}
        title="Archive Evidence"
        message={`Archive "${confirmArchive?.original_filename}"? This removes it from active investigations. The file is kept on disk but AI queries will no longer return its content.`}
        confirmLabel="Archive"
        confirmClassName="bg-danger hover:bg-red-600 text-white"
        onConfirm={() => handleArchive(confirmArchive)}
        onCancel={() => setConfirmArchive(null)}
      />
        </div>

        {/* RIGHT COLUMN: Engine */}
        <div className="xl:col-span-5 bg-surface-2/40 rounded-2xl p-6 border border-line xl:sticky xl:top-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Zap size={22} className="text-accent" />
            <h2 className="text-lg font-bold text-ink-0">Ingestion Engine</h2>
          </div>
      {/* Settings modal */}
      {editingJob && (
        <EditSettingsModal
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onSaved={loadQueue}
        />
      )}

      {/* Instructions */}
      <InstructionsPanel />

      {/* System status card */}
      {sysInfo && (
        <div className="bg-surface-2 border border-line rounded-xl p-4 mb-6">
          <h2 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Cpu size={13} /> System Status
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-ink-2">Available RAM</p>
              <p className={`text-lg font-bold ${ramColor}`}>
                {(sysInfo.system.available_ram_mb / 1024).toFixed(1)} GB
              </p>
              <p className="text-xs text-ink-2">of {(sysInfo.system.total_ram_mb / 1024).toFixed(0)} GB total</p>
            </div>
            <div>
              <p className="text-xs text-ink-2">CPU</p>
              <p className="text-lg font-bold text-ink-0">{sysInfo.system.cpu_percent}%</p>
              <p className="text-xs text-ink-2">{sysInfo.system.cpu_count} cores</p>
            </div>
            <div>
              <p className="text-xs text-ink-2">Queue</p>
              <p className="text-lg font-bold text-ink-0">{running.length} running</p>
              <p className="text-xs text-ink-2">{waiting.length} waiting</p>
            </div>
            <div>
              <p className="text-xs text-ink-2">Suggested Budget</p>
              <p className="text-xs font-medium text-ink-1 mt-1 leading-relaxed">
                {sysInfo.suggested_budget?.description || '—'}
              </p>
            </div>
          </div>

          {sysInfo.system.available_ram_mb < 2048 && (
            <div className="mt-3 flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg p-2">
              <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger">
                <strong>RAM is very low.</strong> Ingestion is paused and will auto-resume when resources free up.
                Use <strong>Force Start</strong> to bypass this and run regardless.
              </p>
            </div>
          )}

          {sysInfo.system.available_ram_mb >= 2048 && running.length > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
              <p className="text-xs text-success">Resources healthy — ingestion running.</p>
            </div>
          )}
        </div>
      )}


      {/* Running jobs */}
      {running.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Loader size={13} className="animate-spin text-accent" />
            Currently Processing ({running.length})
          </h2>
          <div className="space-y-3">
            {running.map(rawJob => {
              const job  = mergeProgress(rawJob)
              const isOverride  = overrideJobs[job.id]
              const isStopping  = stoppingJobs[job.id]
              return (
                <div key={job.id}
                  className={`border rounded-xl p-4 transition-all
                    ${isOverride
                      ? 'bg-warning/5 border-warning/40'
                      : 'bg-accent/5 border-accent/30'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Override / normal badge */}
                      {isOverride && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-warning bg-warning/15 border border-warning/30 rounded px-1.5 py-0.5 mb-1.5">
                          <ZapIcon size={9} /> OVERRIDE MODE — resource limits bypassed
                        </span>
                      )}
                      <p className="text-sm font-semibold text-ink-0">
                        {isStopping ? 'Stopping… waiting for batch to finish' : (job.current_step || 'Processing…')}
                      </p>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-xs text-ink-2 flex items-center gap-1">
                          <Cpu size={10} /> {job.cpu_throttle_percent}% CPU
                        </span>
                        <span className="text-xs text-ink-2 flex items-center gap-1">
                          <MemoryStick size={10} /> {(job.min_free_ram_mb / 1024).toFixed(1)} GB RAM min
                        </span>
                        {job.estimated_seconds && (
                          <span className="text-xs text-ink-2 flex items-center gap-1">
                            <Clock size={10} /> Est. {formatSeconds(job.estimated_seconds)}
                          </span>
                        )}
                      </div>
                      {job.evidence_id && (
                        <p className="text-xs font-mono text-ink-2 mt-1">
                          Evidence: {job.evidence_id.slice(0, 8)}…
                        </p>
                      )}
                      <StepIndicator currentStep={job.current_step} />
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* Percent */}
                      <span className={`text-2xl font-bold tabular-nums ${isOverride ? 'text-warning' : 'text-accent'}`}>
                        {job.progress_percent}%
                      </span>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* Edit settings */}
                        {!isStopping && (
                          <button
                            onClick={() => setEditingJob(job)}
                            title="Edit resource settings"
                            className="flex items-center gap-1 px-2 py-1 rounded border border-line text-[11px] text-ink-2 hover:text-ink-0 hover:border-accent/40 transition-colors"
                          >
                            <Sliders size={11} /> Edit
                          </button>
                        )}
                        {/* Force start (if not already in override) */}
                        {!isOverride && !isStopping && (
                          <button
                            onClick={() => handleForceStart(job.id)}
                            title="Force start — bypass resource limits"
                            className="flex items-center gap-1 px-2 py-1 rounded border border-warning/40 text-[11px] text-warning hover:bg-warning/10 transition-colors"
                          >
                            <ZapIcon size={11} /> Force
                          </button>
                        )}
                        {/* Stop */}
                        {!isStopping && (
                          <button
                            onClick={() => handleStop(job.id)}
                            title="Stop ingestion"
                            className="flex items-center gap-1 px-2 py-1 rounded border border-danger/40 text-[11px] text-danger hover:bg-danger/10 transition-colors"
                          >
                            <Square size={11} fill="currentColor" /> Stop
                          </button>
                        )}
                        {isStopping && (
                          <span className="flex items-center gap-1 text-[11px] text-warning animate-pulse">
                            <Loader size={11} className="animate-spin" /> Stopping
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ProgressBar percent={job.progress_percent} status={job.status} />
                  <p className="text-[10px] text-ink-2 mt-1.5">
                    ↺ Live updates via WebSocket.
                    {isOverride
                      ? ' Running at full speed — no resource limits.'
                      : ' Auto-pauses if RAM drops below threshold and resumes when free.'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}


      {/* Waiting jobs */}
      {waiting.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Clock size={13} />
            Waiting ({waiting.length})
          </h2>
          <div className="space-y-2">
            {waiting.map((job, idx) => {
              const isOverride = overrideJobs[job.id]
              return (
                <div key={job.id}
                  className="bg-surface-2 border border-line rounded-xl p-3 flex items-center gap-3">
                  <span className="text-xs font-mono text-ink-2 w-5 text-center shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-1 font-mono truncate">
                      {job.evidence_id?.slice(0, 8)}…
                      {isOverride && (
                        <span className="ml-2 text-warning text-[10px] font-bold">[OVERRIDE — will start next]</span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-ink-2">{job.cpu_throttle_percent}% CPU</span>
                      <span className="text-xs text-ink-2">{(job.min_free_ram_mb / 1024).toFixed(1)} GB RAM min</span>
                      {job.estimated_seconds && (
                        <span className="text-xs text-ink-2">~{formatSeconds(job.estimated_seconds)}</span>
                      )}
                    </div>
                  </div>

                  {/* Queued job actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingJob(job)}
                      title="Edit resource settings"
                      className="flex items-center gap-1 px-2 py-1 rounded border border-line text-[11px] text-ink-2 hover:text-ink-0 hover:border-accent/40 transition-colors"
                    >
                      <Sliders size={11} /> Edit
                    </button>
                    {!isOverride && (
                      <button
                        onClick={() => handleForceStart(job.id)}
                        title="Force start — bypass resource limits and jump to front"
                        className="flex items-center gap-1 px-2 py-1 rounded border border-warning/40 text-[11px] text-warning hover:bg-warning/10 transition-colors"
                      >
                        <ZapIcon size={11} /> Force
                      </button>
                    )}
                    <button
                      onClick={() => handleCancel(job.id)}
                      className="p-1 text-ink-2 hover:text-danger transition-colors"
                      title="Cancel job"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}


      {/* History */}
      <div>
        <button
          onClick={() => setShowHistory(v => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-ink-2 uppercase tracking-wider mb-2 hover:text-ink-0 transition-colors"
        >
          {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          History ({history.length})
        </button>

        {showHistory && (
          <div className="space-y-2">
            {loadingHistory && (
              <div className="flex items-center gap-2 text-xs text-ink-2 py-4">
                <Loader size={12} className="animate-spin" /> Loading history…
              </div>
            )}
            {!loadingHistory && history.length === 0 && (
              <p className="text-xs text-ink-2 py-4 text-center">No completed jobs yet.</p>
            )}
            {history.map(job => (
              <div key={job.id} className="bg-surface-2 border border-line rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {job.status === 'Completed'
                      ? <CheckCircle size={14} className="text-success shrink-0" />
                      : job.status === 'Stopped'
                      ? <Square size={14} className="text-warning shrink-0" fill="currentColor" />
                      : <AlertCircle size={14} className="text-danger shrink-0" />
                    }
                    <span className="text-xs font-medium text-ink-0">{job.status}</span>
                    {job.evidence_id && (
                      <span className="text-xs font-mono text-ink-2">{job.evidence_id.slice(0, 8)}…</span>
                    )}
                  </div>
                  <span className="text-xs text-ink-2">
                    {job.completed_at
                      ? formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })
                      : '—'}
                  </span>
                </div>
                <p className="text-xs text-ink-2 mt-1">{job.current_step || job.error_message || '—'}</p>
                <ProgressBar percent={100} status={job.status} />
                {job.status === 'Failed' && job.error_message && (
                  <p className="text-[10px] text-danger mt-1 font-mono break-all">{job.error_message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

        </div>
      </div>
    </PageLayout>
  )
}
