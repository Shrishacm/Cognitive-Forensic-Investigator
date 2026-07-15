import React from 'react'
import useCountUp from '../hooks/useCountUp'

export default function AnimStatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
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
        background: 'var(--color-white-04)',
        border: `1px solid ${color}30`,
        borderRadius: 14,
        padding: '18px',
        overflow: 'hidden',
        animationDelay: `${delay}ms`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = `0 12px 40px ${color}25, 0 0 0 1px ${color}50`
        e.currentTarget.style.borderColor = `${color}55`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = `${color}30`
      }}
    >
      {/* Top gradient line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, ${color}00, ${color}dd, ${color}00)`,
        borderRadius: '14px 14px 0 0',
      }} />

      {/* Corner glow */}
      <div style={{
        position: 'absolute',
        top: -24, right: -24,
        width: 80, height: 80,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        {/* Label — was 0.35, now 0.7 */}
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-white-6)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          {label}
        </p>
        <div style={{
          width: 30, height: 30,
          borderRadius: 8,
          background: `${color}22`,
          border: `1px solid ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>

      <p style={{
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: '-0.03em',
        background: `linear-gradient(135deg, #fff 0%, ${color} 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: `number-in 0.5s ${delay + 200}ms ease both`,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {typeof value === 'number'
          ? count.toLocaleString()
          : value ?? '—'}
      </p>

      {/* Sub — was 0.28, now 0.6 */}
      {sub && (
        <p style={{
          fontSize: 12,
          color: 'var(--color-white-6)',
          marginTop: 4,
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}
