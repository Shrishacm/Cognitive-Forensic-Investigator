import React from 'react'
import useTilt from '../hooks/useTilt'

export default function GlassCard({
  children,
  className = '',
  tilt = false,
  glowColor = null,
  onClick,
  style = {},
  padding = '20px',
  animClass = '',
}) {
  const tiltProps = useTilt(8)

  const baseStyle = {
    position: 'relative',
    background: 'rgba(255,255,255,0.025)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding,
    cursor: onClick ? 'pointer' : 'default',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.12s ease, box-shadow 0.25s ease, border-color 0.25s ease',
    overflow: 'hidden',
    ...style,
  }

  if (glowColor) {
    baseStyle.boxShadow = `0 0 0 1px ${glowColor}30, 0 8px 32px ${glowColor}15`
  }

  const handleMouseEnter = (e) => {
    if (!tilt && onClick) {
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.4)'
    }
  }

  const handleMouseLeave = (e) => {
    if (!tilt && onClick) {
      e.currentTarget.style.borderColor = 'var(--color-white-07)'
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = glowColor
        ? `0 0 0 1px ${glowColor}30, 0 8px 32px ${glowColor}15`
        : 'none'
    }
  }

  return (
    <div
      ref={tilt ? tiltProps.ref : undefined}
      onMouseMove={tilt ? tiltProps.onMouseMove : undefined}
      onMouseLeave={tilt ? tiltProps.onMouseLeave : handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onClick={onClick}
      style={baseStyle}
      className={`${animClass} ${className}`.trim()}
    >
      {/* Shine overlay for tilt */}
      {tilt && (
        <div
          className="card-shine"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            opacity: 0,
            transition: 'opacity 0.3s',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  )
}
