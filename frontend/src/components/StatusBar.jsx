import React from 'react'
import GlobalSearch from './GlobalSearch'

export default function StatusBar() {
  return (
    <div>
      {/* Top bar — search only */}
      <div style={{
        height: 38,
        background: 'rgba(4,5,11,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <GlobalSearch />
      </div>

      {/* Static separator line */}
      <div style={{
        height: 1,
        background: 'var(--color-white-07)',
        flexShrink: 0,
      }} />
    </div>
  )
}
