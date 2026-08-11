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
          borderBottom: '1px solid var(--border-base)',
          position: 'relative',
        }}>
          {/* Left amber accent stripe */}
          <div style={{
            position: 'absolute',
            left: -24,
            top: 0,
            bottom: 16,
            width: '3px',
            background: 'linear-gradient(180deg, var(--brand-primary) 0%, transparent 100%)',
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
                color: 'var(--text-heading)',
                lineHeight: 1.1,
              }}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'var(--text-amber)',
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
