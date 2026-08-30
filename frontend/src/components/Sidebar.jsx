import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Fingerprint, LayoutDashboard, FolderOpen, HardDrive, Bot, Clock, Search, 
  AlertTriangle, FileText, ShieldCheck, Settings, Users, LogOut, MessageSquare, Shield,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const getNavItems = (caseId, isAdmin) => {
  const items = [
    { icon: LayoutDashboard, label: 'Dashboard',           path: '/' },
    { icon: FolderOpen,      label: 'Case Management',      path: '/cases' },
    { icon: HardDrive,       label: 'Evidence Management',  path: caseId ? `/cases/${caseId}/evidence` : '/cases' },
    { icon: Bot,             label: 'AI Analysis',          path: caseId ? `/cases/${caseId}/investigate` : '/cases' },
    { icon: Clock,           label: 'Timeline Analysis',    path: caseId ? `/cases/${caseId}/timeline` : '/cases' },
    { icon: Search,          label: 'Keyword Search',       path: caseId ? `/cases/${caseId}/artifacts` : '/cases' },
    { icon: AlertTriangle,   label: 'Malware Analysis',     path: caseId ? `/cases/${caseId}/anomalies` : '/cases' },
    { icon: FileText,        label: 'Report Generation',    path: caseId ? `/cases/${caseId}/reports` : '/cases' },
    { icon: ShieldCheck,     label: 'Logs & Activity',      path: caseId ? `/cases/${caseId}/audit` : '/activity' },
    { icon: Settings,        label: 'Settings',             path: '/settings' },
  ]
  
  if (isAdmin) {
    // Insert Users page before Settings
    items.splice(items.length - 1, 0, { icon: Users, label: 'Users & Access', path: '/admin/users' })
  }
  
  return items
}

export default function Sidebar({ activeCaseId, status, collapsed, onToggle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut, isAdmin } = useAuth()
  const [hoveredItem, setHoveredItem] = useState(null)

  const navItems = getNavItems(activeCaseId, isAdmin)

  const handleNavClick = (item) => {
    if (item.path === '/cases' && item.label !== 'Case Management') {
      toast.error(`Please select or create a case to access ${item.label}.`, {
        id: 'case-required-toast'
      })
      navigate('/cases')
    } else {
      navigate(item.path)
    }
  }

  const isActive = (item) => {
    if (item.path === '/') {
      return location.pathname === '/'
    }
    if (item.label === 'Case Management') {
      const isSubRoute = location.pathname.includes('/evidence') ||
                         location.pathname.includes('/investigate') ||
                         location.pathname.includes('/timeline') ||
                         location.pathname.includes('/artifacts') ||
                         location.pathname.includes('/anomalies') ||
                         location.pathname.includes('/reports') ||
                         location.pathname.includes('/audit')
      return location.pathname.startsWith('/cases') && !isSubRoute
    }
    if (item.path === '/cases') {
      return false
    }
    return location.pathname.startsWith(item.path)
  }

  return (
    <aside style={{
      width: '100%',
      background: 'var(--surface-1)', // Adapt to light/dark
      borderRight: '1px solid var(--line-DEFAULT)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>

      {/* Brand Header */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid var(--line-DEFAULT)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
              flexShrink: 0,
            }}>
              <Fingerprint size={18} color="white" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-0)', letterSpacing: '-0.01em', lineHeight: 1.2, margin: 0 }}>
                IDF AI Assistant
              </h1>
              <p style={{ fontSize: 9, color: 'var(--ink-2)', margin: '1px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Intelligent Digital Forensic AI
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={onToggle}
            title="Expand Sidebar"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
              border: 'none', cursor: 'pointer', margin: '0 auto'
            }}
          >
            <Fingerprint size={16} color="white" />
          </button>
        )}

        {!collapsed && (
          <button
            onClick={onToggle}
            title="Collapse Sidebar"
            style={{
              width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
              color: 'var(--ink-2)', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink-0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-2)'; e.currentTarget.style.borderColor = 'var(--line-DEFAULT)' }}
          >
            <PanelLeftClose size={13} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {navItems.map(item => {
          const active = isActive(item)
          const isHovered = hoveredItem === item.label
          const Icon = item.icon

          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item)}
              onMouseEnter={() => setHoveredItem(item.label)}
              onMouseLeave={() => setHoveredItem(null)}
              title={collapsed ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : 12,
                padding: collapsed ? '10px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 8,
                background: active
                  ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' // Premium blue/purple gradient pill
                  : isHovered ? 'var(--bg-hover)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? '#ffffff' : isHovered ? 'var(--ink-0)' : 'var(--ink-1)',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom widgets section */}
      {!collapsed && (
        <div style={{
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          borderTop: '1px solid var(--line-DEFAULT)',
          flexShrink: 0,
        }}>
          {/* AI Assistant card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)',
            border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: 10,
            padding: '12px 14px',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-0)' }}>AI Assistant</span>
              <span style={{
                background: '#4f46e5', color: '#ffffff', fontSize: 8, fontWeight: 700,
                padding: '1px 4px', borderRadius: 4, letterSpacing: '0.05em'
              }}>BETA</span>
            </div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, margin: '0 0 10px 0' }}>
              Ask AI about evidence, cases, or forensic queries...
            </p>
            <button
              onClick={() => navigate(activeCaseId ? `/cases/${activeCaseId}/investigate` : '/cases')}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
              }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}
            >
              <MessageSquare size={11} />
              Start Conversation
            </button>
          </div>

          {/* System Status */}
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 8,
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#10b981', flexShrink: 0
            }}>
              <Shield size={11} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-0)', margin: 0 }}>System Status</p>
              <p style={{ fontSize: 9, color: '#10b981', margin: 0 }}>All Systems Operational</p>
            </div>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>2 min ago</span>
          </div>
        </div>
      )}

      {/* User Footer */}
      <div style={{
        padding: collapsed ? '14px 6px' : '12px 16px',
        borderTop: '1px solid var(--line-DEFAULT)',
        background: 'var(--surface-2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: '1.5px solid rgba(255,255,255,0.15)'
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>
              {user?.full_name?.[0] || user?.username?.[0] || 'A'}
            </span>
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, lineHeight: 1.3 }}>
                  {user?.full_name || user?.username || 'Analyst'}
                </p>
                <p style={{ fontSize: 9, color: 'var(--ink-2)', margin: 0 }}>
                  {user?.role || 'Digital Forensic Expert'}
                </p>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                style={{
                  padding: 5, borderRadius: 5, background: 'transparent', border: 'none',
                  color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-2)'; e.currentTarget.style.background = 'transparent' }}
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






