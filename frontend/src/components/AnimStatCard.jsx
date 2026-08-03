import React from 'react'
import useCountUp from '../hooks/useCountUp'

export default function AnimStatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = '#D4A32A',
  delay = 0,
}) {
  const count = useCountUp(
    typeof value === 'number' ? value : 0,
    700
  )

  return (
    <div
      className="animate-fade-up"
      style={{
        position: 'relative',
        background: '#0C1220',
        border: `1px solid rgba(42, 110, 166, 0.22)`,
        borderRadius: 4,
        padding: '16px',
        overflow: 'hidden',
        animationDelay: `${delay}ms`,
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.boxShadow = `0 6px 24px rgba(0,0,0,0.5), inset 0 1px 0 ${color}20`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(42, 110, 166, 0.22)'
        e.currentTarget.style.boxShadow = 'none'
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
          color: 'rgba(122, 154, 184, 0.7)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}>
          {label}
        </p>
        <div style={{
          width: 28, height: 28,
          borderRadius: 3,
          background: `${color}15`,
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
        color: '#E8F0F8',
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
          color: 'rgba(122, 154, 184, 0.5)',
          marginTop: 6,
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}
