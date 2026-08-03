import React, { useState, useEffect } from 'react'
import GlobalSearch from './GlobalSearch'

export default function StatusBar() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const pad = n => String(n).padStart(2, '0')
  const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`
  const dateStr = time.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div>
      {/* Classification banner */}
      <div style={{
        height: 20,
        background: 'rgba(212, 163, 42, 0.10)',
        borderBottom: '1px solid rgba(212, 163, 42, 0.25)',
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
          color: 'rgba(212, 163, 42, 0.75)',
          textTransform: 'uppercase',
        }}>
          ⬛ RESTRICTED — AUTHORISED PERSONNEL ONLY — CFI SECURE SYSTEM ⬛
        </span>
      </div>

      {/* Main status bar */}
      <div style={{
        height: 42,
        background: 'rgba(6, 11, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(42, 110, 166, 0.20)',
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
            background: '#1A7A4A',
            boxShadow: '0 0 6px rgba(26, 122, 74, 0.8)',
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'rgba(26, 122, 74, 0.9)',
            letterSpacing: '0.04em',
          }}>
            SYS:ONLINE
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: 'rgba(42, 110, 166, 0.25)' }} />

        {/* Search bar — centered */}
        <div style={{ flex: 1 }}>
          <GlobalSearch />
        </div>

        {/* Right: timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 1, height: 16, background: 'rgba(42, 110, 166, 0.25)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: 'rgba(212, 163, 42, 0.8)',
              letterSpacing: '0.08em',
            }}>
              {timeStr}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: 'rgba(122, 154, 184, 0.6)',
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
        background: 'linear-gradient(90deg, transparent, rgba(212,163,42,0.15) 30%, rgba(42,110,166,0.15) 70%, transparent)',
        flexShrink: 0,
      }} />
    </div>
  )
}
