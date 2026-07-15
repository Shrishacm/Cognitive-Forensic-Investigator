import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Shield, LayoutDashboard, ListOrdered,
  Users, Plus, Search,
  ChevronRight, Upload, Bot, Network,
  StickyNote, ShieldCheck, HardDrive,
  Clock, AlertTriangle, FileText,
  Crosshair, Globe, UserSearch, LogOut,
  PanelLeftClose, PanelLeftOpen,
  Database, Cpu, Activity, Layers,
  Settings, Sparkles, Key, GitCompare, Settings2, Zap,
} from 'lucide-react'
import { getCases } from '../api/client'
import { useAuth } from '../context/AuthContext'

const NAV_TOP = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/'       },
  { icon: Layers,          label: 'Queue',          path: '/queue'  },
  { icon: Activity,        label: 'System Health',  path: '/health' },
]

const CASE_NAV = [
  { icon: Upload,        label: 'Evidence',       path: 'evidence'       },
  { icon: HardDrive,     label: 'Artifacts',      path: 'artifacts'      },
  { icon: Clock,         label: 'Timeline',       path: 'timeline'       },
  { icon: Bot,           label: 'Investigate',    path: 'investigate'    },
  { icon: Network,       label: 'Entity Map',     path: 'entities'       },
  { icon: UserSearch,    label: 'Profiles',       path: 'profiles'       },
  { icon: AlertTriangle, label: 'Anomalies',      path: 'anomalies'      },
  { icon: Crosshair,     label: 'Watchlist',      path: 'watchlist'      },
  { icon: Key,           label: 'Credentials',    path: 'credentials'   },
  { icon: Zap,           label: 'Contradictions', path: 'contradictions' },
  { icon: GitCompare,    label: 'Compare',        path: 'compare'        },
  { icon: Globe,         label: 'Geo Map',        path: 'geomap'         },
  { icon: FileText,      label: 'Reports',        path: 'reports'        },
  { icon: StickyNote,    label: 'Notes',          path: 'notes'          },
  { icon: ShieldCheck,   label: 'Audit Log',      path: 'audit'          },
  { icon: Settings2,     label: 'Access',         path: 'settings'       },
]

const STATUS_DOT = {
  Open:     '#3b82f6',
  Active:   '#10b981',
  Closed:   '#475569',
  Archived: '#1e293b',
}

function NavItem({ icon: Icon, label, path, active, onClick, collapsed, tooltip }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={collapsed ? label : undefined}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 10,
          padding: collapsed ? '8px 0' : '7px 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 8,
          background: active
            ? 'rgba(99,102,241,0.18)'
            : hovered ? 'var(--color-white-06)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: active ? '#c4b5fd' : hovered ? 'var(--text-primary)' : 'rgba(255,255,255,0.65)',
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          textAlign: 'left',
          transition: 'all 0.15s ease',
          boxShadow: active ? 'inset 2px 0 0 #818cf8' : 'none',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <Icon size={15} style={{ flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
        )}
        {!collapsed && active && (
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 8px rgba(129,140,248,0.9)', flexShrink: 0 }} />
        )}
      </button>
    </div>
  )
}

function CaseNavItem({ icon: Icon, label, active, onClick, collapsed }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? label : undefined}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 8,
        padding: collapsed ? '6px 0' : '5px 8px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 6,
        background: active ? 'rgba(99,102,241,0.15)' : hovered ? 'var(--color-white-06)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: active ? '#c4b5fd' : hovered ? 'var(--text-primary)' : 'var(--color-white-6)',
        fontSize: 12,
        fontWeight: active ? 500 : 400,
        textAlign: 'left',
        transition: 'all 0.12s ease',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={12} style={{ flexShrink: 0 }} />
      {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
    </button>
  )
}

export default function Sidebar({ activeCaseId, setActiveCaseId, status, collapsed, onToggle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut, isAdmin } = useAuth()
  const [cases, setCases] = useState([])
  const [expanded, setExpanded] = useState(activeCaseId)
  const [search, setSearch] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)

  useEffect(() => { loadCases() }, [])
  useEffect(() => { setExpanded(activeCaseId) }, [activeCaseId])

  const loadCases = async () => {
    try {
      const r = await getCases()
      setCases(r.data.filter(c => c.status !== 'Archived'))
    } catch {}
  }

  const filtered = cases.filter(c =>
    c.case_name.toLowerCase().includes(search.toLowerCase())
  )

  const isActive = (p) => location.pathname === p

  const dbOk = status?.database === 'connected'
  const ollamaOk = status?.ollama === 'running'

  return (
    <aside style={{
      width: '100%',
      background: 'rgba(4,5,11,0.9)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>

      {/* Brand header */}
      {collapsed ? (
        /* ── Collapsed: shield IS the expand button, no other button visible ── */
        <button
          onClick={onToggle}
          title="Expand sidebar"
          style={{
            width: '100%',
            padding: '14px 0',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.55)',
            transition: 'box-shadow 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 24px rgba(99,102,241,0.8)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.55)'}
          >
            <Shield size={15} color="white" />
          </div>
        </button>
      ) : (
        /* ── Expanded: brand on left, collapse button on right ── */
        <div style={{
          padding: '12px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(99,102,241,0.55)',
            }}>
              <Shield size={15} color="white" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>CFI</p>
              <p style={{ fontSize: 10, color: 'var(--color-white-5)' }}>Forensic Investigator</p>
            </div>
          </div>
          {/* Collapse button — only visible when expanded */}
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            style={{
              width: 24, height: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#a5b4fc'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'var(--color-white-1)' }}
          >
            <PanelLeftClose size={13} />
          </button>
        </div>
      )}

      {/* Global nav */}
      <div style={{ padding: collapsed ? '8px 6px 4px' : '8px 8px 4px', flexShrink: 0 }}>
        {NAV_TOP.map(item => (
          <NavItem key={item.path} {...item} active={isActive(item.path)} onClick={() => navigate(item.path)} collapsed={collapsed} />
        ))}
        {isAdmin && (
          <NavItem icon={Users} label="Users" path="/admin/users" active={isActive('/admin/users')} onClick={() => navigate('/admin/users')} collapsed={collapsed} />
        )}
      </div>

      {/* Divider */}
      {!collapsed && <div style={{ height: 1, margin: '4px 10px', background: 'var(--color-white-07)', flexShrink: 0 }} />}

      {/* Cases header + search */}
      {!collapsed && (
        <div style={{ padding: '6px 10px 4px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Cases
            </span>
            <button
              onClick={() => navigate('/cases')}
              title="New case"
              style={{
                width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: 'var(--color-white-5)', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'; e.currentTarget.style.color = '#a5b4fc' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--color-white-5)' }}
            >
              <Plus size={11} />
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-white-4)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              placeholder="Search cases..."
              style={{
                width: '100%',
                background: searchFocus ? 'var(--color-white-07)' : 'var(--color-white-04)',
                border: `1px solid ${searchFocus ? 'rgba(99,102,241,0.5)' : 'var(--color-white-09)'}`,
                borderRadius: 6, padding: '4px 8px 4px 24px',
                fontSize: 12, color: 'var(--text-primary)', outline: 'none', transition: 'all 0.15s',
              }}
            />
          </div>
        </div>
      )}

      {/* Case list */}
      <div style={{ flex: 1, overflowY: collapsed ? 'hidden' : 'auto', padding: collapsed ? '4px 6px' : '4px 8px 8px' }}>
        {!collapsed && filtered.map((c) => {
          const isOpen = expanded === c.id
          const isCurrent = activeCaseId === c.id
          const dotColor = STATUS_DOT[c.status] || '#475569'

          return (
            <div key={c.id} style={{ marginBottom: 1 }}>
              <button
                onClick={() => {
                  setActiveCaseId(c.id)
                  setExpanded(isOpen ? null : c.id)
                  navigate(`/cases/${c.id}`)
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px', borderRadius: 7,
                  background: isCurrent ? 'rgba(99,102,241,0.15)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: isCurrent ? '#c4b5fd' : 'rgba(255,255,255,0.75)',
                  fontSize: 12, fontWeight: isCurrent ? 500 : 400,
                  textAlign: 'left', transition: 'all 0.12s',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--color-white-06)' }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: isCurrent ? `0 0 8px ${dotColor}` : 'none' }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.case_name}</span>
                <span style={{ flexShrink: 0, color: 'var(--color-white-4)', display: 'flex', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
                  <ChevronRight size={11} />
                </span>
              </button>

              {/* Animated sub-nav */}
              <div style={{
                overflow: 'hidden',
                maxHeight: isOpen ? '600px' : '0',
                opacity: isOpen ? 1 : 0,
                transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
                marginLeft: 16, paddingLeft: 8,
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                marginTop: isOpen ? 2 : 0, marginBottom: isOpen ? 2 : 0,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingTop: 2, paddingBottom: 2 }}>
                  {CASE_NAV.map(nav => {
                    const np = `/cases/${c.id}/${nav.path}`
                    const active = location.pathname === np
                    return <CaseNavItem key={nav.path} icon={nav.icon} label={nav.label} active={active} onClick={() => navigate(np)} collapsed={false} />
                  })}
                </div>
              </div>
            </div>
          )
        })}

        {/* Collapsed mode: show case dots */}
        {collapsed && cases.slice(0, 8).map(c => {
          const isCurrent = activeCaseId === c.id
          const dotColor = STATUS_DOT[c.status] || '#475569'
          return (
            <button
              key={c.id}
              onClick={() => { setActiveCaseId(c.id); navigate(`/cases/${c.id}`) }}
              title={c.case_name}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '6px 0', borderRadius: 6,
                background: isCurrent ? 'rgba(99,102,241,0.15)' : 'transparent',
                border: 'none', cursor: 'pointer', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--color-white-06)' }}
              onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, boxShadow: isCurrent ? `0 0 8px ${dotColor}` : 'none' }} />
            </button>
          )
        })}

        {!collapsed && filtered.length === 0 && (
          <div style={{ padding: '20px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--color-white-4)' }}>
              {search ? 'No cases match' : 'No cases yet'}
            </p>
          </div>
        )}
      </div>

      {/* ── System status (admin area) ── */}
      {!collapsed && (
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          {/* Database */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {/* Static dot — no pulse animation */}
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: dbOk ? '#10b981' : '#ef4444',
              /* No animation — no blinking */
            }} />
            <Database size={11} style={{ color: dbOk ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.7)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: dbOk ? 'rgba(255,255,255,0.65)' : 'var(--color-white-3)' }}>Database</span>
          </div>
          {/* Ollama */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: ollamaOk ? '#10b981' : '#ef4444',
            }} />
            <Cpu size={11} style={{ color: ollamaOk ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.7)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: ollamaOk ? 'rgba(255,255,255,0.65)' : 'var(--color-white-3)' }}>Ollama</span>
          </div>
        </div>
      )}

      {/* Collapsed status dots */}
      {collapsed && (
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span title={`Database: ${dbOk ? 'Connected' : 'Error'}`} style={{ width: 7, height: 7, borderRadius: '50%', background: dbOk ? '#10b981' : '#ef4444', cursor: 'default' }} />
          <span title={`Ollama: ${ollamaOk ? 'Running' : 'Offline'}`} style={{ width: 7, height: 7, borderRadius: '50%', background: ollamaOk ? '#10b981' : '#ef4444', cursor: 'default' }} />
        </div>
      )}

      {/* User footer */}
      <div style={{
        padding: collapsed ? '10px 6px' : '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.35)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.3))',
            border: '1px solid rgba(99,102,241,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd' }}>
              {user?.full_name?.[0] || user?.username?.[0] || '?'}
            </span>
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                  {user?.full_name || user?.username || 'User'}
                </p>
                <p style={{ fontSize: 10, color: 'var(--color-white-5)' }}>{user?.role}</p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                title="Settings"
                style={{
                  padding: 5,
                  borderRadius: 5,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-white-4)',
                  display: 'flex',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#818cf8'
                  e.currentTarget.style.background = 'rgba(99,102,241,0.1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--color-white-4)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Settings size={13} />
              </button>
              <button
                onClick={signOut}
                title="Sign out"
                style={{
                  padding: 5, borderRadius: 5, background: 'transparent', border: 'none',
                  cursor: 'pointer', color: 'var(--color-white-4)', display: 'flex', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-white-4)'; e.currentTarget.style.background = 'transparent' }}
              >
                <LogOut size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
