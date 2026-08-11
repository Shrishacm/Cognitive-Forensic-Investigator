import React, { useState } from 'react'
import useCountUp from '../hooks/useCountUp'

export default function AnimStatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'var(--brand-primary)',
  delay = 0,
}) {
  const count = useCountUp(typeof value === 'number' ? value : 0, 700)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="animate-fade-up"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: 'var(--bg-panel)',
        border: `1px solid var(--border-base)`,
        borderRadius: 6,
        padding: '16px',
        overflow: 'hidden',
        animationDelay: `${delay}ms`,
        transition: 'all 0.18s ease',
        boxShadow: hovered ? `0 8px 24px rgba(0,0,0,0.35)` : 'none',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, ${color}, transparent)`,
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <p style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}>
          {label}
        </p>
        <div style={{
          width: 28, height: 28,
          borderRadius: 4,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>

      <p style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'var(--text-heading)',
        lineHeight: 1.1,
      }}>
        {typeof value === 'number'
          ? count.toLocaleString()
          : value ?? '—'}
      </p>

      {sub && (
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--text-muted)',
          marginTop: 6,
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}
