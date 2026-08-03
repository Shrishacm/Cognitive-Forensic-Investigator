import React from 'react'
import useCountUp from '../hooks/useCountUp'

const ACCENT_COLORS = {
  indigo: {
    line: '#D4A32A',
    icon: 'rgba(212, 163, 42, 0.12)',
    text: '#D4A32A'
  },
  blue: {
    line: '#2A6EA6',
    icon: 'rgba(42, 110, 166, 0.12)',
    text: '#7A9AB8'
  },
  green: {
    line: '#1A7A4A',
    icon: 'rgba(26, 122, 74, 0.12)',
    text: '#34D399'
  },
  purple: {
    line: '#D4A32A',
    icon: 'rgba(212, 163, 42, 0.12)',
    text: '#E8C050'
  },
  yellow: {
    line: '#D4A32A',
    icon: 'rgba(212, 163, 42, 0.15)',
    text: '#D4A32A'
  },
  red: {
    line: '#C53030',
    icon: 'rgba(197, 48, 48, 0.15)',
    text: '#F87171'
  },
  slate: {
    line: '#3D5068',
    icon: 'rgba(61, 80, 104, 0.15)',
    text: '#7A9AB8'
  },
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'indigo',
  onClick,
  animDelay = 0,
  className = ''
}) {
  const numValue = typeof value === 'number' ? value : 0
  const displayCount = useCountUp(numValue, 600)
  const colors = ACCENT_COLORS[accent] || ACCENT_COLORS.indigo

  return (
    <div
      onClick={onClick}
      className={`stat-card ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        animationDelay: `${animDelay}ms`,
        background: '#0C1220',
        border: '1px solid rgba(42, 110, 166, 0.22)',
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${colors.line}, transparent)`
        }}
      />

      <div className="relative p-4">
        <div className="flex items-start justify-between mb-2">
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(122, 154, 184, 0.7)'
            }}
          >
            {label}
          </p>
          <div
            className="w-7 h-7 rounded flex items-center justify-center shrink-0"
            style={{
              background: colors.icon,
              border: `1px solid ${colors.line}30`
            }}
          >
            {Icon && <Icon size={14} style={{ color: colors.text }} />}
          </div>
        </div>

        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 26,
            fontWeight: 700,
            color: '#E8F0F8',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          {typeof value === 'number'
            ? displayCount.toLocaleString()
            : value ?? '—'}
        </p>

        {sub && (
          <p
            className="truncate mt-2"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'rgba(122, 154, 184, 0.5)'
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}
