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
      {/* Deep base */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--bg-app)',
      }} />

      {/* Dot grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Blob 1 — indigo */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '-10%',
        width: '55%',
        height: '55%',
        borderRadius: '50%',
        background:
          'radial-gradient(ellipse, rgba(79,70,229,0.18) 0%, transparent 70%)',
        animation: 'blob-move-1 16s ease-in-out infinite',
        filter: 'blur(1px)',
      }} />

      {/* Blob 2 — cyan */}
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-10%',
        width: '50%',
        height: '50%',
        borderRadius: '50%',
        background:
          'radial-gradient(ellipse, rgba(6,182,212,0.13) 0%, transparent 70%)',
        animation: 'blob-move-2 20s ease-in-out infinite',
        filter: 'blur(1px)',
      }} />

      {/* Blob 3 — violet */}
      <div style={{
        position: 'absolute',
        top: '40%',
        left: '30%',
        width: '40%',
        height: '40%',
        borderRadius: '50%',
        background:
          'radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 70%)',
        animation: 'blob-move-3 24s ease-in-out infinite',
        filter: 'blur(1px)',
      }} />

      {/* Vignette overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(4,5,11,0.6) 100%)',
      }} />
    </div>
  )
}
