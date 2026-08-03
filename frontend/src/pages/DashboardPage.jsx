import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderOpen, FileText, Bot,
  Users, Network, AlertTriangle,
  HardDrive, CheckCircle, Shield, ArrowRight,
  ExternalLink, Activity
} from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import AnimStatCard from '../components/AnimStatCard'
import Badge from '../components/Badge'
import { formatDistanceToNow } from 'date-fns'
import { fromUtc } from '../utils/time'
import toast from 'react-hot-toast'
import { ACTION_META } from '../constants/activityMeta'

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    try {
      const res = await api.get('/dashboard/stats')
      setStats(res.data)
    } catch {
      toast.error('Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'Investigator'

  if (loading) return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div className="skeleton" style={{ height: 34, width: 280, borderRadius: 4, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 16, width: 220, borderRadius: 4, marginBottom: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 110, borderRadius: 4 }} />
        ))}
      </div>
    </div>
  )

  if (!stats) return null

  const evidenceRate = stats.evidence?.total
    ? Math.round((stats.evidence.indexed / stats.evidence.total) * 100)
    : 0

  const panelStyle = {
    background: '#0C1220',
    border: '1px solid rgba(42, 110, 166, 0.22)',
    borderRadius: 4,
    padding: '20px',
  }

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>

      {/* Header */}
      <div style={{
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid rgba(42, 110, 166, 0.18)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          left: -24,
          top: 0,
          bottom: 16,
          width: '3px',
          background: 'linear-gradient(180deg, #D4A32A 0%, rgba(212,163,42,0.2) 100%)',
        }} />

        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#E8F0F8',
          lineHeight: 1.1,
        }}>
          OPERATIONS COMMAND CENTER — {timeOfDay.toUpperCase()}, OPERATOR {firstName.toUpperCase()}
        </h1>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'rgba(212, 163, 42, 0.75)',
          marginTop: 4,
          letterSpacing: '0.06em',
        }}>
          LIVE CASE INTELLIGENCE & FORENSIC METRICS OVERVIEW
        </p>
      </div>

      {/* Primary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <AnimStatCard icon={FolderOpen} label="Total Cases"    value={stats.cases?.total}       sub={`${stats.cases?.by_status?.Active || 0} active`} color="#D4A32A" delay={0}   />
        <AnimStatCard icon={FileText}   label="Evidence Files" value={stats.evidence?.total}     sub={`${evidenceRate}% indexed`}                       color="#7A9AB8" delay={60}  />
        <AnimStatCard icon={Bot}        label="AI Queries"     value={stats.queries?.total}      sub={`${stats.queries?.flagged || 0} flagged`}          color="#D4A32A" delay={120} />
        <AnimStatCard icon={Network}    label="Entities"       value={stats.entities?.total}     sub="extracted from evidence"                           color="#34D399" delay={180} />
      </div>

      {/* Secondary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <AnimStatCard icon={HardDrive}     label="Artifacts"  value={stats.artifacts?.total}                                                                          color="#7A9AB8" delay={240} />
        <AnimStatCard icon={AlertTriangle} label="Anomalies"  value={stats.artifacts?.anomalies}  color={stats.artifacts?.anomalies > 0 ? '#D4A32A' : '#34D399'}      delay={300} />
        <AnimStatCard icon={CheckCircle}   label="Indexed"    value={stats.evidence?.indexed}                                                                          color="#34D399" delay={360} />
        <AnimStatCard icon={Shield}        label="Failed"     value={stats.evidence?.failed || 0} color={stats.evidence?.failed > 0 ? '#F87171' : '#34D399'}           delay={420} />
      </div>

      {/* System Alerts */}
      {stats.alerts?.length > 0 && (
        <div style={{
          marginBottom: 16,
          background: '#0C1220',
          border: '1px solid rgba(212, 163, 42, 0.3)',
          borderRadius: 4,
          padding: '16px 20px',
        }}>
          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12, fontWeight: 700,
            color: '#D4A32A',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 12,
          }}>
            SYSTEM ALERTS & THREAT NOTIFICATIONS
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {stats.alerts.map((alert, i) => {
              const ALERT_CFG = {
                critical: { color: '#F87171', bg: 'rgba(197,48,48,0.12)', border: 'rgba(197,48,48,0.3)', dot: '#C53030' },
                warning: { color: '#D4A32A', bg: 'rgba(212,163,42,0.10)', border: 'rgba(212,163,42,0.3)', dot: '#D4A32A' },
                info: { color: '#34D399', bg: 'rgba(26,122,74,0.10)', border: 'rgba(26,122,74,0.3)', dot: '#1A7A4A' },
              }
              const cfg = ALERT_CFG[alert.level] || ALERT_CFG.info
              return (
                <div
                  key={i}
                  onClick={() => alert.action && navigate(alert.action)}
                  style={{
                    flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 3,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    cursor: alert.action ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', color: cfg.color, marginBottom: 2 }}>{alert.title}</p>
                    <p style={{ fontSize: 11, color: '#C8D8E8' }}>{alert.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Three column panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

        {/* Cases panel */}
        <div className="animate-fade-up stagger-5" style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#E8F0F8' }}>Cases Overview</h2>
            <button
              onClick={() => navigate('/cases')}
              style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#D4A32A', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              VIEW ALL <ArrowRight size={11} />
            </button>
          </div>

          {/* Status bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {Object.entries(stats.cases?.by_status || {}).map(([status, count]) => {
              const max = Math.max(...Object.values(stats.cases?.by_status || { _: 1 }))
              const pct = max > 0 ? (count / max) * 100 : 0
              const color = { Open: '#2A6EA6', Active: '#D4A32A', Closed: '#3D5068' }[status] || '#3D5068'
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: '#7A9AB8' }}>{status.toUpperCase()}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#E8F0F8' }}>{count}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(42, 110, 166, 0.15)', borderRadius: 2 }}>
                    <div style={{ height: 3, borderRadius: 2, width: `${pct}%`, background: color, transition: 'width 0.7s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent cases list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(stats.recent_cases || []).slice(0, 4).map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 8px', borderRadius: 3,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(42, 110, 166, 0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <FolderOpen size={12} style={{ color: '#D4A32A', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#C8D8E8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.case_name}
                </span>
                <Badge label={c.status} />
              </button>
            ))}
          </div>
        </div>

        {/* Entity breakdown */}
        <div className="animate-fade-up stagger-6" style={panelStyle}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#E8F0F8', marginBottom: 16 }}>Entity Distribution</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Person',       '#F87171'],
              ['Location',     '#34D399'],
              ['Organization', '#D4A32A'],
              ['IP',           '#7A9AB8'],
              ['File',         '#1A7A4A'],
            ].map(([type, color]) => {
              const count = stats.entities?.by_type?.[type] || 0
              const total = stats.entities?.total || 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={type}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 1, background: color, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: '#7A9AB8' }}>{type.toUpperCase()}</span>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#E8F0F8' }}>{count}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(42, 110, 166, 0.15)', borderRadius: 2 }}>
                    <div style={{ height: 3, borderRadius: 2, width: `${pct}%`, background: color, transition: 'width 0.7s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {stats.artifacts?.anomalies > 0 && (
            <div style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 3,
              background: 'rgba(212,163,42,0.10)', border: '1px solid rgba(212,163,42,0.3)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={13} style={{ color: '#D4A32A', flexShrink: 0 }} />
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#D4A32A' }}>
                {stats.artifacts.anomalies} anomalous file(s) flagged
              </p>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="animate-fade-up stagger-7" style={panelStyle}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 16, fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#E8F0F8',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Activity size={14} style={{ color: '#D4A32A' }} />
              System Audit Trail
            </h2>
            <button
              onClick={() => navigate('/activity')}
              style={{
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#D4A32A',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ALL LOGS <ExternalLink size={10} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(stats.recent_activity || []).map((event, i) => {
              const meta = ACTION_META[event.action] || { color: '#7A9AB8' }
              return (
                <div key={i}
                  className="animate-fade-up"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 3,
                    animationDelay: `${i * 30}ms`,
                    transition: 'background 0.15s',
                    cursor: event.case_id ? 'pointer' : 'default',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(42, 110, 166, 0.08)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'none'
                  }}
                  onClick={() => event.case_id && navigate(`/cases/${event.case_id}`)}
                >
                  <span style={{
                    width: 5, height: 5,
                    borderRadius: '50%',
                    background: meta.color || '#D4A32A',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 11,
                    color: '#C8D8E8',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {event.action.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: 'rgba(122, 154, 184, 0.6)',
                    flexShrink: 0,
                  }}>
                    {event.by}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Admin user panel */}
      {isAdmin && stats.users && (
        <div className="animate-fade-up stagger-8" style={{ ...panelStyle, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#E8F0F8', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={14} style={{ color: '#D4A32A' }} />
              OPERATOR & PERSONNEL DIRECTORY
            </h2>
            <button
              onClick={() => navigate('/admin/users')}
              style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#D4A32A', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              MANAGE <ArrowRight size={11} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            {[
              { label: 'Total',  value: stats.users.total,  color: '#E8F0F8' },
              { label: 'Active', value: stats.users.active, color: '#34D399' },
              ...Object.entries(stats.users.by_role || {}).map(([role, count]) => ({
                label: role, value: count, color: '#D4A32A',
              })),
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</p>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(122, 154, 184, 0.6)', marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
