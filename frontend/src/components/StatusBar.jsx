import React, { useState, useEffect } from 'react'
import { Moon, Sun, Monitor, Bell, Settings, Search } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import GlobalSearch from './GlobalSearch'

export default function StatusBar() {
  const [time, setTime] = useState(new Date())
  const { guiTheme, colorMode, setColorMode } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const pad = n => String(n).padStart(2, '0')
  const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`
  const dateStr = time.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  const cycleMode = () => {
    const modes = ['system', 'light', 'dark']
    setColorMode(modes[(modes.indexOf(colorMode) + 1) % modes.length])
  }

  const ModeIcon = colorMode === 'light' ? Sun : colorMode === 'dark' ? Moon : Monitor

  // ── Modern theme: clean top nav bar ──────────────────────
  if (guiTheme === 'modern') {
    return (
      <div style={{
        height: 60,
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-base)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        gap: 16,
        flexShrink: 0,
        zIndex: 40,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {/* Search bar */}
        <div style={{ flex: 1, maxWidth: 480 }}>
          <GlobalSearch />
        </div>

        {/* Right side actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          
          {/* Mode toggle */}
          <button
            onClick={cycleMode}
            title={`Color Mode: ${colorMode}`}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <ModeIcon size={17} />
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate('/settings')}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <Settings size={17} />
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: 'var(--border-base)', margin: '0 8px' }} />

          {/* Live clock */}
          <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
              {timeStr}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" }}>
              {dateStr}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Legacy theme: terminal classification bar + dark bar ──
  return (
    <div>
      {/* Classification banner */}
      <div style={{
        height: 20,
        background: 'var(--brand-glow)',
        borderBottom: '1px solid var(--border-amber-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.22em',
          color: 'var(--brand-primary)',
          textTransform: 'uppercase',
        }}>
          ⬛ RESTRICTED — AUTHORISED PERSONNEL ONLY — CFI SECURE SYSTEM ⬛
        </span>
      </div>

      {/* Main status bar */}
      <div style={{
        height: 42,
        background: 'var(--bg-panel)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-base)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        {/* System label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 6px var(--success)',
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--success)',
            letterSpacing: '0.04em',
          }}>
            SYS:ONLINE
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />

        {/* Search bar — centered */}
        <div style={{ flex: 1 }}>
          <GlobalSearch />
        </div>

        {/* Right: timestamp & theme toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          
          <button
            onClick={cycleMode}
            title={`Color Mode: ${colorMode}`}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex', padding: 4
            }}
          >
            <ModeIcon size={14} />
          </button>
          
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: 'var(--brand-primary)',
              letterSpacing: '0.08em',
            }}>
              {timeStr}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: 'var(--text-secondary)',
              letterSpacing: '0.05em',
            }}>
              {dateStr}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom separator line */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, var(--border-amber-dim) 30%, var(--border-subtle) 70%, transparent)',
        flexShrink: 0,
      }} />
    </div>
  )
}
