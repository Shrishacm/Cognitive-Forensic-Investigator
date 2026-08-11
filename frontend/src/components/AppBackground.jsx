import React from 'react'
import { useTheme } from '../context/ThemeContext'

export default function AppBackground() {
  const { guiTheme, resolvedMode } = useTheme()
  const isModernLight = guiTheme === 'modern' && resolvedMode === 'light'

  if (guiTheme === 'modern') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: isModernLight ? '#F8FAFC' : 'var(--bg-app)' }} />
        {/* Subtle indigo radial glows */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-5%', width: '50%', height: '50%',
          background: isModernLight
            ? 'radial-gradient(ellipse at 0% 0%, rgba(79,70,229,0.05) 0%, transparent 65%)'
            : 'radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.08) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-5%', width: '45%', height: '45%',
          background: isModernLight
            ? 'radial-gradient(ellipse at 100% 100%, rgba(79,70,229,0.04) 0%, transparent 65%)'
            : 'radial-gradient(ellipse at 100% 100%, rgba(99,102,241,0.06) 0%, transparent 65%)',
        }} />
      </div>
    )
  }

  // Legacy: full terminal grid + scan line
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-app)' }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(42,110,166,0.06) 1px, transparent 1px),linear-gradient(90deg, rgba(42,110,166,0.06) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(42,110,166,0.03) 1px, transparent 1px),linear-gradient(90deg, rgba(42,110,166,0.03) 1px, transparent 1px)`,
        backgroundSize: '8px 8px',
      }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '35%', background: 'radial-gradient(ellipse at 0% 0%, rgba(212,163,42,0.07) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '45%', height: '40%', background: 'radial-gradient(ellipse at 100% 100%, rgba(42,110,166,0.08) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,163,42,0.6) 50%, transparent)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(42,110,166,0.5) 50%, transparent)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, height: '120px', background: 'linear-gradient(180deg, transparent 0%, rgba(212,163,42,0.012) 50%, transparent 100%)', animation: 'scan-line 12s linear infinite', willChange: 'transform' }} />
    </div>
  )
}
