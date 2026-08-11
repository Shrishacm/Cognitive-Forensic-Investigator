import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderOpen, FileText, Bot,
  Users, Network, AlertTriangle,
  HardDrive, CheckCircle, Shield, ArrowRight,
  ExternalLink, Activity, TrendingUp, TrendingDown,
  Plus, Bell, Clock, ChevronRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'
import useCountUp from '../hooks/useCountUp'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts'

// Animated stat card for Modern theme
function ModernStatCard({ icon: Icon, label, value, sub, color, trend, delay = 0 }) {
  const count = useCountUp(typeof value === 'number' ? value : 0, 800)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-base)',
        borderRadius: 12,
        padding: '20px 24px',
        cursor: 'default',
        transition: 'all 0.2s ease',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,0,0,0.12), 0 0 0 2px ' + color + '30'
          : '0 1px 3px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient background */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 120, height: 120,
        background: `radial-gradient(circle at top right, ${color}12, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${color}25`,
        }}>
          <Icon size={20} color={color} />
        </div>
        {trend !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontWeight: 600,
            color: trend >= 0 ? '#10b981' : '#ef4444',
            background: trend >= 0 ? '#10b98115' : '#ef444415',
            padding: '3px 8px', borderRadius: 20,
          }}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <p style={{
        fontSize: 32, fontWeight: 700,
        color: 'var(--text-heading)',
        lineHeight: 1, marginBottom: 6,
        letterSpacing: '-0.02em',
      }}>
        {typeof value === 'number' ? count.toLocaleString() : (value ?? '—')}
      </p>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: sub ? 4 : 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

const AREA_DATA = [
  { day: 'Mon', value: 24 }, { day: 'Tue', value: 38 },
  { day: 'Wed', value: 29 }, { day: 'Thu', value: 52 },
  { day: 'Fri', value: 41 }, { day: 'Sat', value: 18 },
  { day: 'Sun', value: 35 },
]

const PIE_DATA = [
  { name: 'Documents', value: 42 },
  { name: 'Images', value: 28 },
  { name: 'Audio', value: 18 },
  { name: 'Video', value: 12 },
]
const PIE_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-panel-raised)', border: '1px solid var(--border-base)',
        borderRadius: 8, padding: '8px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
      }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-primary)', marginTop: 2 }}>
          {payload[0].value} analyses
        </p>
      </div>
    )
  }
  return null
}

export default function ModernDashboard({ stats }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'Investigator'

  const evidenceRate = stats.evidence?.total
    ? Math.round((stats.evidence.indexed / stats.evidence.total) * 100)
    : 0

  const card = {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-base)',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  const ALERT_CFG = {
    critical: { color: '#EF4444', bg: '#EF444410', icon: AlertTriangle, dot: '#EF4444' },
    warning:  { color: '#F59E0B', bg: '#F59E0B10', icon: Clock,        dot: '#F59E0B' },
    info:     { color: '#10B981', bg: '#10B98110', icon: CheckCircle,  dot: '#10B981' },
  }

  const displayAlerts = (stats.alerts?.length > 0 ? stats.alerts : [
    { title: 'Evidence Indexed Successfully', message: 'All pending files have been processed and indexed.', level: 'info' },
    { title: 'Anomaly Detected', message: 'Suspicious IP pattern flagged in network logs.', level: 'warning' },
    { title: 'Auth Failure', message: 'Multiple failed login attempts detected from 192.168.1.104.', level: 'critical' },
  ]).slice(0, 4)

  const displayCases = (stats.recent_cases || []).slice(0, 5)

  const STATUS_DOT = {
    Active:   '#10B981',
    Open:     '#3B82F6',
    Closed:   '#9CA3AF',
    Archived: '#6B7280',
  }

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>

      {/* ── Top header row ────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.2 }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Here's your investigation overview for today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/cases')}
            style={{
              padding: '10px 20px', borderRadius: 8,
              background: 'transparent',
              border: '1px solid var(--border-base)',
              color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.color = 'var(--brand-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          >
            <FolderOpen size={15} /> All Cases
          </button>
          <button
            onClick={() => navigate('/cases')}
            style={{
              padding: '10px 20px', borderRadius: 8,
              background: 'var(--brand-primary)',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.15s',
              boxShadow: '0 4px 14px var(--brand-glow)',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            <Plus size={15} /> New Case
          </button>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <ModernStatCard icon={FolderOpen}    label="Total Cases"    value={stats.cases?.total}       sub={`${stats.cases?.by_status?.Active || 0} active`}          color="#4F46E5" trend={12}  delay={0}   />
        <ModernStatCard icon={FileText}      label="Evidence Files" value={stats.evidence?.total}     sub={`${evidenceRate}% indexed`}                               color="#10B981" trend={8}   delay={60}  />
        <ModernStatCard icon={Bot}           label="AI Queries"     value={stats.queries?.total}      sub={`${stats.queries?.flagged || 0} flagged`}                 color="#F59E0B" trend={-3}  delay={120} />
        <ModernStatCard icon={AlertTriangle} label="Anomalies"      value={stats.artifacts?.anomalies || 0} sub="requiring review"                               color="#EF4444" trend={0}   delay={180} />
      </div>

      {/* ── Charts row ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Analysis Trend */}
        <div style={card} className="animate-fade-up stagger-2">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>Analysis Activity</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>AI queries run this week</p>
            </div>
            <div style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              color: '#10B981', background: '#10B98115', border: '1px solid #10B98130'
            }}>
              ↑ 23% this week
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={AREA_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="modernGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-base)' }} />
              <Area
                type="monotone" dataKey="value"
                stroke="var(--brand-primary)" strokeWidth={2.5}
                fill="url(#modernGrad)" dot={false}
                activeDot={{ r: 5, fill: 'var(--brand-primary)', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Evidence Breakdown */}
        <div style={card} className="animate-fade-up stagger-3">
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>Evidence Breakdown</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>By file type</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={4} dataKey="value">
                  {PIE_DATA.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />)}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    background: 'var(--bg-panel-raised)', border: '1px solid var(--border-base)',
                    borderRadius: 8, fontSize: 12
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PIE_DATA.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Recent Cases + Alerts ──────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Recent Cases */}
        <div style={card} className="animate-fade-up stagger-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>Recent Cases</h2>
            <button
              onClick={() => navigate('/cases')}
              style={{
                fontSize: 12, color: 'var(--brand-primary)', background: 'none',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 4, fontWeight: 500, padding: '4px 8px', borderRadius: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-glow)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              View All <ChevronRight size={14} />
            </button>
          </div>

          {displayCases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <FolderOpen size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No cases yet</p>
              <button
                onClick={() => navigate('/cases')}
                style={{
                  marginTop: 12, padding: '8px 16px', borderRadius: 8,
                  background: 'var(--brand-primary)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                }}
              >
                Create First Case
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {displayCases.map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 14px', borderRadius: 10,
                    background: 'var(--bg-panel-raised)', cursor: 'pointer',
                    border: '1px solid var(--border-subtle)', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-panel-raised)' }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                    background: 'var(--brand-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--border-amber-dim)',
                  }}>
                    <FolderOpen size={17} color="var(--brand-primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{c.case_name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: STATUS_DOT[c.status] || '#9CA3AF',
                      }} />
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.status}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Alerts */}
        <div style={card} className="animate-fade-up stagger-5">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>System Alerts</h2>
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: '#EF444420', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={11} color="#EF4444" />
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayAlerts.map((alert, i) => {
              const cfg = ALERT_CFG[alert.level] || ALERT_CFG.info
              const AlertIcon = cfg.icon
              return (
                <div
                  key={i}
                  onClick={() => alert.action && navigate(alert.action)}
                  style={{
                    display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10,
                    background: cfg.bg, cursor: alert.action ? 'pointer' : 'default',
                    border: `1px solid ${cfg.color}20`, transition: 'all 0.15s',
                  }}
                >
                  <div style={{ marginTop: 1, flexShrink: 0 }}>
                    <AlertIcon size={15} color={cfg.color} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: cfg.color, marginBottom: 2 }}>{alert.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{alert.message}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick stats row */}
          <div style={{
            marginTop: 16, paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)',
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          }}>
            {[
              { label: 'Entities', value: stats.entities?.total || 0, color: '#4F46E5' },
              { label: 'Artifacts', value: stats.artifacts?.total || 0, color: '#10B981' },
              { label: 'Indexed', value: stats.evidence?.indexed || 0, color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: 'var(--bg-panel-raised)' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
