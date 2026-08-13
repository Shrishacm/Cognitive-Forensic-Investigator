import React, { useState, useEffect } from 'react'
import { Cpu, Zap, Activity, Server, Save, CheckCircle2, ShieldCheck, Thermometer, Database } from 'lucide-react'
import { getHardwarePreference, updateHardwarePreference, getSystemInfo } from '../api/client'
import toast from 'react-hot-toast'

export default function LiveIngestionHardwareMonitor() {
  const [telemetry, setTelemetry] = useState(null)
  const [hardwareMode, setHardwareMode] = useState('auto')
  const [saving, setSaving] = useState(false)
  const [availableBackends, setAvailableBackends] = useState(['auto', 'cpu'])

  const fetchTelemetry = async () => {
    try {
      const [hwRes, sysRes] = await Promise.all([
        getHardwarePreference().catch(() => null),
        getSystemInfo().catch(() => null)
      ])

      if (hwRes?.data) {
        setTelemetry(prev => ({
          ...prev,
          gpu: hwRes.data.gpu_info || {},
          hardware_mode: hwRes.data.hardware_mode || 'auto',
          embedding_device: hwRes.data.embedding_device || hwRes.data.vector_embedding_device || 'cpu',
        }))
        if (hwRes.data.available_backends?.length) {
          setAvailableBackends(hwRes.data.available_backends)
        }
        if (!saving && hwRes.data.hardware_mode) {
          setHardwareMode(hwRes.data.hardware_mode)
        }
      }

      if (sysRes?.data?.system) {
        setTelemetry(prev => ({
          ...prev,
          system: sysRes.data.system
        }))
      }
    } catch (e) {
      // silent telemetry poll
    }
  }

  useEffect(() => {
    fetchTelemetry()
    const timer = setInterval(fetchTelemetry, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSelectMode = async (mode) => {
    setHardwareMode(mode)
    setSaving(true)
    try {
      const res = await updateHardwarePreference({ hardware_mode: mode })
      toast.success(`Compute mode set to ${mode.toUpperCase()}`)
      if (res.data?.gpu_info) {
        setTelemetry(prev => ({
          ...prev,
          gpu: res.data.gpu_info,
          hardware_mode: mode,
          embedding_device: res.data.embedding_device || mode,
        }))
      }
      if (res.data?.available_backends?.length) {
        setAvailableBackends(res.data.available_backends)
      }
    } catch {
      toast.error('Failed to change compute mode')
    } finally {
      setSaving(false)
    }
  }

  const gpu = telemetry?.gpu || {}
  const sys = telemetry?.system || {}
  const activeMode = telemetry?.hardware_mode || hardwareMode || 'auto'
  // Actual embedding device reported by backend (what the model is truly on)
  const embeddingDevice = telemetry?.embedding_device || gpu.torch_device || 'cpu'

  const vramTotal = gpu.vram_total_mb || 0
  const vramUsed = gpu.vram_used_mb || 0
  const vramPercent = vramTotal > 0 ? Math.min(100, Math.round((vramUsed / vramTotal) * 100)) : 0
  const gpuUtil = gpu.gpu_util_percent ?? 0
  const cpuUtil = sys.cpu_percent ?? 0
  const ramPercent = sys.ram_percent ?? 0

  return (
    <div style={{
      background: 'var(--bg-panel)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--border-base)',
      borderRadius: 14,
      padding: '18px 22px',
      marginBottom: 20,
    }}>
      {/* Header & Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(99, 102, 241, 0.2))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={16} style={{ color: '#10b981' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)' }}>Live Hardware Compute Telemetry</span>
              <span style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 4,
                background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600,
                border: '1px solid rgba(16, 185, 129, 0.3)', letterSpacing: '0.05em'
              }}>
                LIVE 1s REFRESH
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
              Real-time hardware workload stats for AI queries & file ingestion
            </p>
          </div>
        </div>

        {/* Quick Mode Toggle Selector — buttons rendered from available backends */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--bg-app)', padding: 4, borderRadius: 8,
          border: '1px solid var(--border-subtle)'
        }}>
          {availableBackends.map(id => {
            const isSelected = activeMode === id
            // Human-readable labels that adapt to what's detected
            const labelMap = {
              auto: '⚡ Auto',
              cuda: gpu.backend_type === 'AMD ROCm' ? '🔴 ROCm GPU' : '🚀 CUDA GPU',
              mps:  '🍎 Apple MPS',
              xpu:  '🔵 Intel XPU',
              cpu:  '💻 CPU Mode',
            }
            const label = labelMap[id] || `🔧 ${id.toUpperCase()}`
            return (
              <button
                key={id}
                onClick={() => handleSelectMode(id)}
                disabled={saving}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hardware Telemetry Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        
        {/* GPU Device & Temp */}
        <div style={{
          background: 'var(--bg-panel-raised)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '12px 14px'
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Graphics Processor
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
            {gpu.gpu_name ? gpu.gpu_name : (gpu.has_gpu ? 'Active GPU' : 'CPU Processing')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#10b981' }}>
            <ShieldCheck size={12} />
            <span>{activeMode === 'cpu' ? 'CPU Mode Selected' : (gpu.backend_type ? `${gpu.backend_type} Active` : 'Hardware Accelerated')}</span>
            {gpu.gpu_temp_c != null && (
              <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Thermometer size={10} /> {gpu.gpu_temp_c}°C
              </span>
            )}
          </div>
        </div>

        {/* Live GPU Utilization */}
        <div style={{
          background: 'var(--bg-panel-raised)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            <span>GPU Load</span>
            <span style={{ color: gpuUtil > 0 ? '#10b981' : 'var(--text-muted)', fontWeight: 700 }}>{gpuUtil}% Load</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border-subtle)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%', width: `${gpuUtil}%`, borderRadius: 3,
              background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            Ollama AI: <strong style={{ color: gpu.ollama_gpu_active ? '#10b981' : 'var(--text-muted)' }}>{gpu.ollama_gpu_active ? 'GPU VRAM Loaded' : 'Standby'}</strong>
          </div>
        </div>

        {/* Live VRAM Allocation */}
        <div style={{
          background: 'var(--bg-panel-raised)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            <span>VRAM Memory</span>
            <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{vramTotal > 0 ? `${vramUsed} / ${vramTotal} MB` : 'N/A'}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border-subtle)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%', width: `${vramPercent}%`, borderRadius: 3,
              background: 'linear-gradient(90deg, #818cf8 0%, #c084fc 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            Embeddings: <strong style={{ color: embeddingDevice !== 'cpu' ? 'var(--amber)' : 'var(--text-muted)' }}>{embeddingDevice.toUpperCase()}</strong>
          </div>
        </div>

        {/* Live CPU & RAM */}
        <div style={{
          background: 'var(--bg-panel-raised)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            <span>CPU & Host RAM</span>
            <span style={{ color: 'var(--warning)', fontWeight: 700 }}>CPU {cpuUtil}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border-subtle)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%', width: `${cpuUtil}%`, borderRadius: 3,
              background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            System RAM: <strong style={{ color: 'var(--text-primary)' }}>{sys.used_ram_mb || 0} / {sys.total_ram_mb || 0} MB ({ramPercent}%)</strong>
          </div>
        </div>

        {/* Resource Governor */}
        <div style={{
          background: 'var(--bg-panel-raised)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            <span>Resource Governor</span>
            <span style={{ color: 'var(--info)', fontWeight: 700 }}>ACTIVE</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border-subtle)', overflow: 'hidden', marginBottom: 6 }}>
             <div style={{
              height: '100%', width: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 100%)',
              animation: 'pulse 2s infinite'
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            Status: <strong style={{ color: 'var(--text-primary)' }}>Dynamic Auto-Scaling</strong>
          </div>
        </div>

      </div>
    </div>
  )
}
