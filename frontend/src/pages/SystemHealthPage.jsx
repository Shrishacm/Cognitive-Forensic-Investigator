/**
 * SystemHealthPage
 *
 * Placeholder — System health monitoring will be implemented here.
 * For now, this component simply renders a basic status view.
 */
import React, { useState, useEffect } from 'react'
import { Activity, Database, Cpu, HardDrive, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { getStatus } from '../api/client'
import PageLayout from '../components/PageLayout'

function StatusDot({ status }) {
  const color =
    status === 'ok' || status === 'online' || status === 'connected' || status === 'running'
      ? '#10b981'
    : status === 'offline' || status === 'error' || status === 'not found'
      ? '#ef4444'
    : '#f59e0b'
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 6px ${color}`,
      marginRight: 8,
      flexShrink: 0,
    }} />
  )
}

function StatusCard({ icon: Icon, label, value, status, detail }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
    }}>
      <div style={{
        width: 40, height: 40,
        borderRadius: 10,
        background: 'rgba(99,102,241,0.1)',
        border: '1px solid rgba(99,102,241,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} style={{ color: '#818cf8' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          {label}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <StatusDot status={status} />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e4f0' }}>{value}</span>
        </div>
        {detail && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{detail}</p>
        )}
      </div>
    </div>
  )
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getStatus()
        setHealth(res.data)
      } catch {
        setHealth({ database: 'error', ollama: 'offline' })
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  return (
    <PageLayout
      title="System Health"
      subtitle="Live status of all backend services — refreshes every 15 s"
    >

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12, animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <StatusCard
            icon={Database}
            label="Database"
            value={health?.database === 'connected' ? 'Connected' : (health?.database || 'Unknown')}
            status={health?.database}
            detail="SQLite — data/forensic.db"
          />
          <StatusCard
            icon={Activity}
            label="AI Engine (Ollama)"
            value={health?.ollama === 'running' ? 'Running' : 'Offline'}
            status={health?.ollama}
            detail={
              health?.models?.length
                ? `${health.models.length} model(s) loaded — ${health.models[0]}`
                : 'http://localhost:11434'
            }
          />
          <StatusCard
            icon={Cpu}
            label="Backend API"
            value="Running"
            status="ok"
            detail="FastAPI — port 8000"
          />
          <StatusCard
            icon={HardDrive}
            label="Vector Store"
            value="Qdrant"
            status="ok"
            detail="Local — data/qdrant_store"
          />
        </div>
      )}
    </PageLayout>
  )
}
