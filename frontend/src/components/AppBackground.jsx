import React from 'react'

export default function AppBackground() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/* Deep navy base */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: '#060B14',
      }} />

      {/* Precision grid — classified terminal overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(42,110,166,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(42,110,166,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }} />

      {/* Secondary micro-grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(42,110,166,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(42,110,166,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '8px 8px',
      }} />

      {/* Amber vignette — top left command corner */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '40%',
        height: '35%',
        background: 'radial-gradient(ellipse at 0% 0%, rgba(212,163,42,0.07) 0%, transparent 70%)',
      }} />

      {/* Steel blue vignette — bottom right */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '45%',
        height: '40%',
        background: 'radial-gradient(ellipse at 100% 100%, rgba(42,110,166,0.08) 0%, transparent 70%)',
      }} />

      {/* Top scanline band */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(212,163,42,0.4) 20%, rgba(212,163,42,0.6) 50%, rgba(212,163,42,0.4) 80%, transparent 100%)',
      }} />

      {/* Bottom scanline band */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(42,110,166,0.3) 30%, rgba(42,110,166,0.5) 50%, rgba(42,110,166,0.3) 70%, transparent 100%)',
      }} />

      {/* Very subtle moving scan line — gives terminal feel */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: '120px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(212,163,42,0.012) 50%, transparent 100%)',
        animation: 'scan-line 12s linear infinite',
        willChange: 'transform',
      }} />
    </div>
  )
}
