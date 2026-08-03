import React from 'react'

// [color, background, border]
const V = {
  Open:         ['#7A9AB8', 'rgba(42,110,166,0.12)',   'rgba(42,110,166,0.30)'],
  Active:       ['#D4A32A', 'rgba(212,163,42,0.12)',   'rgba(212,163,42,0.30)'],
  Closed:       ['#7A9AB8', 'rgba(61,80,104,0.15)',    'rgba(61,80,104,0.30)'],
  Archived:     ['#3D5068', 'rgba(26,37,53,0.30)',     'rgba(61,80,104,0.20)'],
  Pending:      ['#D4A32A', 'rgba(212,163,42,0.12)',   'rgba(212,163,42,0.30)'],
  Processing:   ['#7A9AB8', 'rgba(42,110,166,0.12)',   'rgba(42,110,166,0.30)'],
  Indexed:      ['#34D399', 'rgba(26,122,74,0.12)',    'rgba(26,122,74,0.30)'],
  Uploaded:     ['#D4A32A', 'rgba(212,163,42,0.12)',   'rgba(212,163,42,0.30)'],
  Queued:       ['#D4A32A', 'rgba(212,163,42,0.12)',   'rgba(212,163,42,0.30)'],
  Failed:       ['#F87171', 'rgba(197,48,48,0.15)',    'rgba(197,48,48,0.35)'],
  Low:          ['#7A9AB8', 'rgba(61,80,104,0.15)',    'rgba(61,80,104,0.30)'],
  Medium:       ['#D4A32A', 'rgba(212,163,42,0.12)',   'rgba(212,163,42,0.30)'],
  High:         ['#F97316', 'rgba(249,115,22,0.15)',   'rgba(249,115,22,0.35)'],
  Critical:     ['#F87171', 'rgba(197,48,48,0.15)',    'rgba(197,48,48,0.35)'],
  Person:       ['#F87171', 'rgba(197,48,48,0.12)',    'rgba(197,48,48,0.30)'],
  Location:     ['#34D399', 'rgba(26,122,74,0.12)',    'rgba(26,122,74,0.30)'],
  Organization: ['#D4A32A', 'rgba(212,163,42,0.12)',   'rgba(212,163,42,0.30)'],
  IP:           ['#7A9AB8', 'rgba(42,110,166,0.15)',   'rgba(42,110,166,0.30)'],
  File:         ['#34D399', 'rgba(26,122,74,0.12)',    'rgba(26,122,74,0.30)'],
  Admin:        ['#F87171', 'rgba(197,48,48,0.12)',    'rgba(197,48,48,0.30)'],
  Investigator: ['#D4A32A', 'rgba(212,163,42,0.12)',   'rgba(212,163,42,0.30)'],
  Analyst:      ['#7A9AB8', 'rgba(42,110,166,0.12)',   'rgba(42,110,166,0.30)'],
  Viewer:       ['#3D5068', 'rgba(61,80,104,0.15)',    'rgba(61,80,104,0.30)'],
  Generating:   ['#7A9AB8', 'rgba(42,110,166,0.12)',   'rgba(42,110,166,0.30)'],
  Complete:     ['#34D399', 'rgba(26,122,74,0.12)',    'rgba(26,122,74,0.30)'],
}

export default function Badge({ label }) {
  const [color, bg, border] = V[label] || V.Viewer
  return (
    <span
      style={{
        color,
        background: bg,
        border: `1px solid ${border}`,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 6px',
        borderRadius: '2px',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '10px',
        fontWeight: '700',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        lineHeight: '16px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
