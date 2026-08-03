import React from 'react'

/**
 * PageLayout — shared page wrapper.
 * Mission-brief style header: amber accent stripe + monospace subtitle.
 */
export default function PageLayout({
  title,
  subtitle,
  actions,
  children,
  fullWidth = false,
}) {
  return (
    <div
      className="animate-fade-in"
      style={{ width: '100%' }}
    >
      {(title || actions) && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 16,
          paddingBottom: 16,
          borderBottom: '1px solid rgba(42, 110, 166, 0.15)',
          position: 'relative',
        }}>
          {/* Left amber accent stripe */}
          <div style={{
            position: 'absolute',
            left: -24,
            top: 0,
            bottom: 16,
            width: '3px',
            background: 'linear-gradient(180deg, #D4A32A 0%, rgba(212,163,42,0.2) 100%)',
            borderRadius: '0 2px 2px 0',
          }} />

          <div style={{ paddingLeft: 4 }}>
            {title && (
              <h1 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#E8F0F8',
                lineHeight: 1.1,
              }}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'rgba(212, 163, 42, 0.7)',
                marginTop: 4,
                letterSpacing: '0.06em',
              }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
              marginTop: 2,
            }}>
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
