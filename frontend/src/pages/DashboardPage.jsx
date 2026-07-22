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

const ACTION_COLOR = {
  CASE_CREATED:       '#10b981',
  FILE_INGESTED:      '#818cf8',
  FILE_UPLOADED:      '#60a5fa',
  QUERY_MADE:         '#a78bfa',
  REPORT_GENERATED:   '#f59e0b',
  NOTE_ADDED:         '#fbbf24',
  ENTITY_FLAGGED:     '#f97316',
  CASE_UPDATED:       '#3b82f6',
  CASE_CLOSED:        '#64748b',
  LOGIN_SUCCESS:      '#10b981',
  LOGIN_FAILED:       '#ef4444',
  INTEGRITY_VERIFIED: '#10b981',
  PROFILE_GENERATED:  '#a78bfa',
}

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
      <div className="skeleton" style={{ height: 34, width: 280, borderRadius: 8, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 16, width: 220, borderRadius: 6, marginBottom: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 110, borderRadius: 14 }} />
        ))}
      </div>
    </div>
  )

  if (!stats) return null

  const evidenceRate = stats.evidence?.total
    ? Math.round((stats.evidence.indexed / stats.evidence.total) * 100)
    : 0

  const panelStyle = {
    background: 'var(--color-white-04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: '20px',
    backdropFilter: 'blur(20px)',
  }

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #fff 0%, #818cf8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.2,
        }}>
          Good {timeOfDay}, {firstName}
        </h1>
        {/* Subtitle — was 0.3, now 0.6 */}
        <p style={{ fontSize: 13, color: 'var(--color-white-6)', marginTop: 4 }}>
          Here's what's happening across your cases
        </p>
      </div>

      {/* Primary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <AnimStatCard icon={FolderOpen} label="Total Cases"    value={stats.cases?.total}       sub={`${stats.cases?.by_status?.Active || 0} active`} color="#818cf8" delay={0}   />
        <AnimStatCard icon={FileText}   label="Evidence Files" value={stats.evidence?.total}     sub={`${evidenceRate}% indexed`}                       color="#60a5fa" delay={60}  />
        <AnimStatCard icon={Bot}        label="AI Queries"     value={stats.queries?.total}      sub={`${stats.queries?.flagged || 0} flagged`}          color="#a78bfa" delay={120} />
        <AnimStatCard icon={Network}    label="Entities"       value={stats.entities?.total}     sub="extracted from evidence"                           color="#34d399" delay={180} />
      </div>

      {/* Secondary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <AnimStatCard icon={HardDrive}     label="Artifacts"  value={stats.artifacts?.total}                                                                          color="#94a3b8" delay={240} />
        <AnimStatCard icon={AlertTriangle} label="Anomalies"  value={stats.artifacts?.anomalies}  color={stats.artifacts?.anomalies > 0 ? '#fbbf24' : '#34d399'}      delay={300} />
        <AnimStatCard icon={CheckCircle}   label="Indexed"    value={stats.evidence?.indexed}                                                                          color="#34d399" delay={360} />
        <AnimStatCard icon={Shield}        label="Failed"     value={stats.evidence?.failed || 0} color={stats.evidence?.failed > 0 ? '#f87171' : '#34d399'}           delay={420} />
      </div>

      {/* System Alerts */}
      {stats.alerts?.length > 0 && (
        <div style={{
          marginBottom: 16,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14,
          padding: '16px 20px',
        }}>
          <p style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--color-white-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}>
            System Alerts
          </p>
          <div style={{
            display: 'flex', gap: 10,
            flexWrap: 'wrap',
          }}>
            {stats.alerts.map((alert, i) => {
              const ALERT_CFG = {
                critical: { color: '#e879f9', bg: 'rgba(232,121,249,0.08)', border: 'rgba(232,121,249,0.2)', dot: '#e879f9' },
                warning: { color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', dot: '#f59e0b' },
                info: { color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', dot: '#10b981' },
              }
              const cfg = ALERT_CFG[alert.level] || ALERT_CFG.info
              return (
                <div
                  key={i}
                  onClick={() => alert.action && navigate(alert.action)}
                  style={{
                    flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 10,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    cursor: alert.action ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (alert.action) e.currentTarget.style.filter = 'brightness(1.15)'
                  }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}88`, flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: cfg.color, marginBottom: 2 }}>{alert.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-white-4)' }}>{alert.message}</p>
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
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Cases</h2>
            <button
              onClick={() => navigate('/cases')}
              style={{ fontSize: 11, color: 'var(--color-white-5)', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-white-5)'}
            >
              View all <ArrowRight size={11} />
            </button>
          </div>

          {/* Status bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {Object.entries(stats.cases?.by_status || {}).map(([status, count]) => {
              const max = Math.max(...Object.values(stats.cases?.by_status || { _: 1 }))
              const pct = max > 0 ? (count / max) * 100 : 0
              const color = { Open: '#3b82f6', Active: '#10b981', Closed: '#64748b' }[status] || '#64748b'
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    {/* Status label — was 0.4, now 0.7 */}
                    <span style={{ fontSize: 12, color: 'var(--color-white-6)' }}>{status}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--color-white-08)', borderRadius: 99 }}>
                    <div style={{ height: 4, borderRadius: 99, width: `${pct}%`, background: color, transition: 'width 0.7s ease' }} />
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
                  padding: '7px 8px', borderRadius: 7,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-white-06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <FolderOpen size={12} style={{ color: 'var(--color-white-4)', flexShrink: 0 }} />
                {/* Case name — was 0.5, now 0.8 */}
                <span style={{ flex: 1, fontSize: 12, color: 'var(--color-white-6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.case_name}
                </span>
                <Badge label={c.status} />
              </button>
            ))}
          </div>
        </div>

        {/* Entity breakdown */}
        <div className="animate-fade-up stagger-6" style={panelStyle}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Entity Breakdown</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Person',       '#f87171'],
              ['Location',     '#34d399'],
              ['Organization', '#fbbf24'],
              ['IP',           '#c084fc'],
              ['File',         '#4ade80'],
            ].map(([type, color]) => {
              const count = stats.entities?.by_type?.[type] || 0
              const total = stats.entities?.total || 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={type}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                      {/* Entity type — was 0.4, now 0.75 */}
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{type}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--color-white-08)', borderRadius: 99 }}>
                    <div style={{ height: 4, borderRadius: 99, width: `${pct}%`, background: color, transition: 'width 0.7s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {stats.artifacts?.anomalies > 0 && (
            <div style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 8,
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#fcd34d' }}>
                {stats.artifacts.anomalies} anomalous file(s) detected
              </p>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="animate-fade-up stagger-7" style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <h2 style={{
              fontSize: 13, fontWeight: 600,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Activity size={14}
                style={{
                  color: 'var(--color-white-3)'
                }} />
              Recent Activity
            </h2>
            <button
              onClick={() => navigate('/activity')}
              style={{
                fontSize: 11,
                color: '#818cf8',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
              }}
            >
              View all recent activity
              <ExternalLink size={10} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(stats.recent_activity || []).map((event, i) => {
              const meta = ACTION_META[event.action] || { color: '#64748b' }
              return (
                <div key={i}
                  className="animate-fade-up"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    animationDelay: `${i * 30}ms`,
                    transition: 'background 0.15s',
                    cursor: event.case_id ? 'pointer' : 'default',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--color-white-03)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'none'
                  }}
                  onClick={() => event.case_id && navigate(`/cases/${event.case_id}`)}
                >
                  <span style={{
                    width: 7, height: 7,
                    borderRadius: '50%',
                    background: meta.color,
                    boxShadow: `0 0 6px ${meta.color}99`,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {event.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: 'var(--color-white-2)',
                    flexShrink: 0,
                  }}>
                    {event.by}
                  </span>
                  <span style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.18)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {formatDistanceToNow(fromUtc(event.at), { addSuffix: true })}
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
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={14} style={{ color: 'var(--color-white-5)' }} />
              System Users
            </h2>
            <button
              onClick={() => navigate('/admin/users')}
              style={{ fontSize: 11, color: 'var(--color-white-5)', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-white-5)'}
            >
              Manage <ArrowRight size={11} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            {[
              { label: 'Total',  value: stats.users.total,  color: 'var(--text-primary)' },
              { label: 'Active', value: stats.users.active, color: '#10b981' },
              ...Object.entries(stats.users.by_role || {}).map(([role, count]) => ({
                label: role, value: count, color: 'rgba(255,255,255,0.75)',
              })),
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</p>
                {/* Label — was 0.25, now 0.55 */}
                <p style={{ fontSize: 12, color: 'var(--color-white-5)', marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
