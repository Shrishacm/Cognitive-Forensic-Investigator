import React, { useState, useEffect } from 'react'
import { Cpu, Zap, Activity, Server, Save, CheckCircle2, ShieldCheck, Thermometer, Database } from 'lucide-react'
import { getHardwarePreference, updateHardwarePreference, getSystemInfo } from '../api/client'
import toast from 'react-hot-toast'

export default function LiveIngestionHardwareMonitor() {
  const [telemetry, setTelemetry] = useState(null)
  const [hardwareMode, setHardwareMode] = useState('auto')
  const [saving, setSaving] = useState(false)

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
          hardware_mode: hwRes.data.hardware_mode || 'auto'
        }))
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
          hardware_mode: mode
        }))
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

  const vramTotal = gpu.vram_total_mb || 0
  const vramUsed = gpu.vram_used_mb || 0
  const vramPercent = vramTotal > 0 ? Math.min(100, Math.round((vramUsed / vramTotal) * 100)) : 0
  const gpuUtil = gpu.gpu_util_percent ?? 0
  const cpuUtil = sys.cpu_percent ?? 0
  const ramPercent = sys.ram_percent ?? 0

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.08)',
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
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e4f0' }}>Live Hardware Compute Telemetry</span>
              <span style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 4,
                background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600,
                border: '1px solid rgba(16, 185, 129, 0.3)', letterSpacing: '0.05em'
              }}>
                LIVE 1s REFRESH
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Real-time hardware workload stats for AI queries & file ingestion
            </p>
          </div>
        </div>

        {/* Quick Mode Toggle Selector */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          {[
            { id: 'auto', label: '⚡ Auto' },
            { id: 'cuda', label: '🚀 GPU Mode' },
            { id: 'cpu', label: '💻 CPU Mode' }
          ].map(m => {
            const isSelected = activeMode === m.id
            return (
              <button
                key={m.id}
                onClick={() => handleSelectMode(m.id)}
                disabled={saving}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none'
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hardware Telemetry Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        
        {/* GPU Device & Temp */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 10, padding: '12px 14px'
        }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Graphics Processor
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e4f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
            {gpu.gpu_name ? gpu.gpu_name : (gpu.has_gpu ? 'Active GPU' : 'CPU Processing')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#10b981' }}>
            <ShieldCheck size={12} />
            <span>{activeMode === 'cpu' ? 'CPU Mode Selected' : (gpu.backend_type ? `${gpu.backend_type} Active` : 'Hardware Accelerated')}</span>
            {gpu.gpu_temp_c != null && (
              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Thermometer size={10} /> {gpu.gpu_temp_c}°C
              </span>
            )}
          </div>
        </div>

        {/* Live GPU Utilization */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 10, padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            <span>GPU Load</span>
            <span style={{ color: gpuUtil > 0 ? '#10b981' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{gpuUtil}% Load</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%', width: `${gpuUtil}%`, borderRadius: 3,
              background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            Ollama AI: <strong style={{ color: gpu.ollama_gpu_active ? '#10b981' : '#9ca3af' }}>{gpu.ollama_gpu_active ? 'GPU VRAM Loaded' : 'Standby'}</strong>
          </div>
        </div>

        {/* Live VRAM Allocation */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 10, padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            <span>VRAM Memory</span>
            <span style={{ color: '#818cf8', fontWeight: 700 }}>{vramTotal > 0 ? `${vramUsed} / ${vramTotal} MB` : 'N/A'}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%', width: `${vramPercent}%`, borderRadius: 3,
              background: 'linear-gradient(90deg, #818cf8 0%, #c084fc 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            Embeddings: <strong style={{ color: activeMode !== 'cpu' ? '#818cf8' : '#9ca3af' }}>{activeMode !== 'cpu' && gpu.has_gpu ? (gpu.torch_device ? gpu.torch_device.toUpperCase() : 'GPU') : 'CPU'}</strong>
          </div>
        </div>

        {/* Live CPU & RAM */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 10, padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            <span>CPU & Host RAM</span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>CPU {cpuUtil}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%', width: `${cpuUtil}%`, borderRadius: 3,
              background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            System RAM: <strong style={{ color: '#e2e4f0' }}>{sys.used_ram_mb || 0} / {sys.total_ram_mb || 0} MB ({ramPercent}%)</strong>
          </div>
        </div>

        {/* Resource Governor */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 10, padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            <span>Resource Governor</span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>ACTIVE</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 6 }}>
             <div style={{
              height: '100%', width: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 100%)',
              animation: 'pulse 2s infinite'
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            Status: <strong style={{ color: '#e2e4f0' }}>Dynamic Auto-Scaling</strong>
          </div>
        </div>

      </div>
    </div>
  )
}
