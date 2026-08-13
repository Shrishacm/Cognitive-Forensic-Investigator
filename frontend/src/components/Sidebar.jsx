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
import { useTheme } from '../context/ThemeContext'

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
  { icon: Key,           label: 'Credentials',    path: 'credentials'    },
  { icon: Zap,           label: 'Contradictions', path: 'contradictions' },
  { icon: GitCompare,    label: 'Compare',        path: 'compare'        },
  { icon: Globe,         label: 'Geo Map',        path: 'geomap'         },
  { icon: FileText,      label: 'Reports',        path: 'reports'        },
  { icon: StickyNote,    label: 'Notes',          path: 'notes'          },
  { icon: ShieldCheck,   label: 'Audit Log',      path: 'audit'          },
  { icon: Settings2,     label: 'Access',         path: 'settings'       },
]

const STATUS_COLOR = {
  Open:     'var(--info)',
  Active:   'var(--brand-primary)',
  Closed:   'var(--text-muted)',
  Archived: 'var(--bg-panel-raised)',
}

const STATUS_LABEL = {
  Open:     'OPEN',
  Active:   'ACTIVE',
  Closed:   'CLOSED',
  Archived: 'ARCH',
}

function NavItem({ icon: Icon, label, path, active, onClick, collapsed }) {
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
          gap: collapsed ? 0 : 9,
          padding: collapsed ? '8px 0' : '7px 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 3,
          background: active
            ? 'var(--brand-glow)'
            : hovered ? 'var(--bg-active)' : 'transparent',
          border: 'none',
          borderLeft: active ? '2px solid var(--brand-primary)' : '2px solid transparent',
          cursor: 'pointer',
          color: active ? 'var(--brand-primary)' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: 12,
          fontWeight: active ? 600 : 400,
          fontFamily: "'Inter', sans-serif",
          textAlign: 'left',
          transition: 'all 0.12s ease',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}
      >
        <Icon size={14} style={{ flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
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
        gap: collapsed ? 0 : 7,
        padding: collapsed ? '5px 0' : '4px 8px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 2,
        background: active ? 'var(--brand-glow)' : hovered ? 'var(--bg-active)' : 'transparent',
        border: 'none',
        borderLeft: active ? '2px solid var(--brand-primary)' : '2px solid transparent',
        cursor: 'pointer',
        color: active ? 'var(--brand-primary)' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: 11,
        fontWeight: active ? 500 : 400,
        textAlign: 'left',
        transition: 'all 0.10s ease',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={11} style={{ flexShrink: 0 }} />
      {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
    </button>
  )
}

export default function Sidebar({ activeCaseId, setActiveCaseId, status, collapsed, onToggle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut, isAdmin } = useAuth()
  const { guiTheme, showSystemResources } = useTheme()
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
      background: 'var(--bg-sidebar)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRight: '1px solid var(--border-base)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Amber top accent stripe */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-glow))',
      }} />

      {/* Brand header */}
      {collapsed ? (
        <button
          onClick={onToggle}
          title="Expand sidebar"
          style={{
            width: '100%',
            padding: '16px 0',
            borderBottom: '1px solid var(--border-subtle)',
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
            width: 30, height: 30,
            background: 'var(--brand-glow)',
            border: '1px solid var(--border-amber-dim)',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={15} color="var(--brand-primary)" />
          </div>
        </button>
      ) : (
        <div style={{
          padding: '13px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 32, height: 32, flexShrink: 0,
              background: 'var(--brand-glow)',
              border: '1px solid var(--border-amber-dim)',
              borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={16} color="var(--brand-primary)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--brand-primary)',
                lineHeight: 1.1,
              }}>
                CFI
              </p>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                Forensic Intel System
              </p>
            </div>
          </div>
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            style={{
              width: 22, height: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 3,
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--brand-primary)'; e.currentTarget.style.borderColor = 'var(--border-amber-dim)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
          >
            <PanelLeftClose size={12} />
          </button>
        </div>
      )}

      {/* Global nav section */}
      {!collapsed && (
        <div style={{
          padding: '8px 10px 4px',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '0 4px',
          }}>
            Navigation
          </span>
        </div>
      )}
      <div style={{ padding: collapsed ? '6px 6px 2px' : '2px 8px 4px', flexShrink: 0 }}>
        {NAV_TOP.map(item => (
          (item.path !== '/health' || showSystemResources) && <NavItem key={item.path} {...item} active={isActive(item.path)} onClick={() => navigate(item.path)} collapsed={collapsed} />
        ))}
        {isAdmin && (
          <NavItem icon={Users} label="Users" path="/admin/users" active={isActive('/admin/users')} onClick={() => navigate('/admin/users')} collapsed={collapsed} />
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, margin: collapsed ? '4px 8px' : '4px 10px', background: 'var(--border-subtle)', flexShrink: 0 }} />

      {/* Cases section header + search */}
      {!collapsed && (
        <div style={{ padding: '4px 10px 4px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(122, 154, 184, 0.45)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: '0 2px',
            }}>
              Active Cases
            </span>
            <button
              onClick={() => navigate('/cases')}
              title="Manage cases"
              style={{
                width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 2, border: '1px solid rgba(42, 110, 166, 0.25)',
                background: 'transparent', color: 'rgba(122, 154, 184, 0.5)', cursor: 'pointer', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,163,42,0.45)'; e.currentTarget.style.color = '#D4A32A' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,110,166,0.25)'; e.currentTarget.style.color = 'rgba(122,154,184,0.5)' }}
            >
              <Plus size={10} />
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={10} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'rgba(122, 154, 184, 0.4)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              placeholder="Search cases..."
              style={{
                width: '100%',
                background: 'rgba(6, 11, 20, 0.8)',
                border: `1px solid ${searchFocus ? 'rgba(212,163,42,0.4)' : 'rgba(42,110,166,0.20)'}`,
                borderRadius: 3, padding: '4px 8px 4px 22px',
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#C8D8E8',
                outline: 'none', transition: 'all 0.12s',
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
          const statusColor = STATUS_COLOR[c.status] || '#3D5068'

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
                  padding: '5px 8px', borderRadius: 3,
                  background: isCurrent ? 'rgba(212, 163, 42, 0.08)' : 'transparent',
                  border: 'none',
                  borderLeft: isCurrent ? '2px solid rgba(212, 163, 42, 0.5)' : '2px solid transparent',
                  cursor: 'pointer',
                  color: isCurrent ? '#D4A32A' : 'rgba(200, 216, 232, 0.65)',
                  fontSize: 11, fontWeight: isCurrent ? 500 : 400,
                  textAlign: 'left', transition: 'all 0.10s',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(42,110,166,0.06)' }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Status tag */}
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: statusColor,
                  background: `${statusColor}18`,
                  border: `1px solid ${statusColor}40`,
                  borderRadius: 2,
                  padding: '0 4px',
                  flexShrink: 0,
                }}>
                  {STATUS_LABEL[c.status] || 'UNKN'}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.case_name}</span>
                <span style={{ flexShrink: 0, color: 'rgba(122,154,184,0.4)', display: 'flex', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease' }}>
                  <ChevronRight size={10} />
                </span>
              </button>

              {/* Sub-nav */}
              <div style={{
                overflow: 'hidden',
                maxHeight: isOpen ? '600px' : '0',
                opacity: isOpen ? 1 : 0,
                transition: 'max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
                marginLeft: 14, paddingLeft: 8,
                borderLeft: '1px solid rgba(42, 110, 166, 0.15)',
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

        {/* Collapsed: case dots */}
        {collapsed && cases.slice(0, 8).map(c => {
          const isCurrent = activeCaseId === c.id
          const statusColor = STATUS_COLOR[c.status] || '#3D5068'
          return (
            <button
              key={c.id}
              onClick={() => { setActiveCaseId(c.id); navigate(`/cases/${c.id}`) }}
              title={c.case_name}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '5px 0', borderRadius: 3,
                background: isCurrent ? 'rgba(212, 163, 42, 0.10)' : 'transparent',
                border: 'none', cursor: 'pointer', transition: 'all 0.10s',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, opacity: isCurrent ? 1 : 0.5 }} />
            </button>
          )
        })}

        {!collapsed && filtered.length === 0 && (
          <div style={{ padding: '16px 8px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(122, 154, 184, 0.4)' }}>
              {search ? 'NO CASES FOUND' : 'NO ACTIVE CASES'}
            </p>
          </div>
        )}
      </div>

      {/* System status */}
      {!collapsed && showSystemResources && (
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid rgba(42, 110, 166, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: dbOk ? '#1A7A4A' : '#C53030', flexShrink: 0 }} />
            <Database size={10} style={{ color: dbOk ? 'rgba(26,122,74,0.8)' : 'rgba(197,48,48,0.7)', flexShrink: 0 }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: dbOk ? 'rgba(200,216,232,0.55)' : 'rgba(197,48,48,0.7)', letterSpacing: '0.04em' }}>DB</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ollamaOk ? '#1A7A4A' : '#C53030', flexShrink: 0 }} />
            <Cpu size={10} style={{ color: ollamaOk ? 'rgba(26,122,74,0.8)' : 'rgba(197,48,48,0.7)', flexShrink: 0 }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: ollamaOk ? 'rgba(200,216,232,0.55)' : 'rgba(197,48,48,0.7)', letterSpacing: '0.04em' }}>AI</span>
          </div>
        </div>
      )}

      {/* Collapsed status dots */}
      {collapsed && showSystemResources && (
        <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, borderTop: '1px solid rgba(42, 110, 166, 0.15)' }}>
          <span title={`Database: ${dbOk ? 'Connected' : 'Error'}`} style={{ width: 5, height: 5, borderRadius: '50%', background: dbOk ? '#1A7A4A' : '#C53030' }} />
          <span title={`AI: ${ollamaOk ? 'Running' : 'Offline'}`} style={{ width: 5, height: 5, borderRadius: '50%', background: ollamaOk ? '#1A7A4A' : '#C53030' }} />
        </div>
      )}

      {/* User footer */}
      <div style={{
        padding: collapsed ? '10px 6px' : '10px 12px',
        borderTop: '1px solid rgba(42, 110, 166, 0.18)',
        background: 'rgba(6, 10, 18, 0.5)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{
            width: 28, height: 28,
            background: 'rgba(212, 163, 42, 0.10)',
            border: '1px solid rgba(212, 163, 42, 0.30)',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13, fontWeight: 700, color: '#D4A32A',
            }}>
              {user?.full_name?.[0] || user?.username?.[0] || '?'}
            </span>
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: '#C8D8E8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                  {user?.full_name || user?.username || 'User'}
                </p>
                <p style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9, fontWeight: 600,
                  color: 'rgba(212, 163, 42, 0.6)',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                }}>
                  {user?.role}
                </p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                title="Settings"
                style={{ padding: 5, borderRadius: 3, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(122, 154, 184, 0.5)', display: 'flex', transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#D4A32A' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(122, 154, 184, 0.5)' }}
              >
                <Settings size={12} />
              </button>
              <button
                onClick={signOut}
                title="Sign out"
                style={{ padding: 5, borderRadius: 3, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(122, 154, 184, 0.5)', display: 'flex', transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#C53030' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(122, 154, 184, 0.5)' }}
              >
                <LogOut size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
