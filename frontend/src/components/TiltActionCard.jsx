import React, { useRef } from 'react'

export default function TiltActionCard({
  icon: Icon,
  label,
  desc,
  color,
  onClick,
  animDelay = 0,
}) {
  const ref = useRef(null)
  const shineRef = useRef(null)

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `
      perspective(700px)
      rotateX(${y * -12}deg)
      rotateY(${x * 12}deg)
      translateZ(12px)
      scale(1.02)
    `
    if (shineRef.current) {
      shineRef.current.style.opacity = '1'
      shineRef.current.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.15) 0%, transparent 55%)`
    }
  }

  const onEnter = (e) => {
    e.currentTarget.style.boxShadow = `0 16px 48px ${color}30, 0 0 0 1px ${color}55`
  }

  const onLeave = (e) => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(700px) rotateX(0) rotateY(0) translateZ(0) scale(1)'
    if (shineRef.current) shineRef.current.style.opacity = '0'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="animate-fade-up"
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, ${color}12 100%)`,
        border: `1px solid ${color}35`,
        borderRadius: 16,
        padding: '20px',
        cursor: 'pointer',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.1s ease, box-shadow 0.25s ease',
        overflow: 'hidden',
        animationDelay: `${animDelay}ms`,
      }}
    >
      {/* Shine overlay */}
      <div ref={shineRef} style={{
        position: 'absolute', inset: 0,
        opacity: 0, transition: 'opacity 0.3s',
        pointerEvents: 'none', borderRadius: 'inherit',
      }} />

      {/* Background glow blob */}
      <div style={{
        position: 'absolute', top: '-30%', right: '-20%',
        width: '60%', height: '60%', borderRadius: '50%',
        background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${color}35, ${color}18)`,
          border: `1px solid ${color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
          boxShadow: `0 4px 12px ${color}25`,
        }}>
          <Icon size={18} style={{ color }} />
        </div>

        {/* Label — full brightness */}
        <p style={{
          fontSize: 15, fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 5,
          letterSpacing: '-0.01em',
        }}>
          {label}
        </p>

        {/* Desc — was 0.35, now 0.65 */}
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
          {desc}
        </p>
      </div>
    </div>
  )
}
