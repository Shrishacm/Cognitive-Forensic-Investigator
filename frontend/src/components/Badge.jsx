import React from 'react'

// [color, background, border]
const V = {
  Open:         ['#60a5fa', 'rgba(59,130,246,0.12)',   'rgba(59,130,246,0.25)'],
  Active:       ['#34d399', 'rgba(16,185,129,0.12)',   'rgba(16,185,129,0.25)'],
  Closed:       ['#94a3b8', 'rgba(100,116,139,0.1)',   'rgba(100,116,139,0.2)'],
  Archived:     ['#64748b', 'rgba(100,116,139,0.08)',  'rgba(100,116,139,0.15)'],
  Pending:      ['#fbbf24', 'rgba(245,158,11,0.12)',   'rgba(245,158,11,0.25)'],
  Processing:   ['#60a5fa', 'rgba(59,130,246,0.12)',   'rgba(59,130,246,0.25)'],
  Indexed:      ['#34d399', 'rgba(16,185,129,0.12)',   'rgba(16,185,129,0.25)'],
  Uploaded:     ['#a78bfa', 'rgba(139,92,246,0.12)',   'rgba(139,92,246,0.25)'],
  Queued:       ['#fbbf24', 'rgba(245,158,11,0.12)',   'rgba(245,158,11,0.25)'],
  Failed:       ['#f87171', 'rgba(239,68,68,0.12)',    'rgba(239,68,68,0.25)'],
  Low:          ['#94a3b8', 'rgba(100,116,139,0.1)',   'rgba(100,116,139,0.2)'],
  Medium:       ['#fbbf24', 'rgba(245,158,11,0.12)',   'rgba(245,158,11,0.25)'],
  High:         ['#fb923c', 'rgba(249,115,22,0.12)',   'rgba(249,115,22,0.25)'],
  Critical:     ['#f87171', 'rgba(239,68,68,0.12)',    'rgba(239,68,68,0.25)'],
  Person:       ['#f87171', 'rgba(239,68,68,0.1)',     'rgba(239,68,68,0.22)'],
  Location:     ['#34d399', 'rgba(16,185,129,0.1)',    'rgba(16,185,129,0.22)'],
  Organization: ['#fbbf24', 'rgba(245,158,11,0.1)',    'rgba(245,158,11,0.22)'],
  IP:           ['#c084fc', 'rgba(192,132,252,0.1)',   'rgba(192,132,252,0.22)'],
  File:         ['#4ade80', 'rgba(74,222,128,0.1)',    'rgba(74,222,128,0.22)'],
  Admin:        ['#f87171', 'rgba(239,68,68,0.1)',     'rgba(239,68,68,0.22)'],
  Investigator: ['#818cf8', 'rgba(99,102,241,0.1)',    'rgba(99,102,241,0.22)'],
  Analyst:      ['#60a5fa', 'rgba(59,130,246,0.1)',    'rgba(59,130,246,0.22)'],
  Viewer:       ['#94a3b8', 'rgba(100,116,139,0.1)',   'rgba(100,116,139,0.2)'],
  // Report statuses
  Generating:   ['#60a5fa', 'rgba(59,130,246,0.12)',   'rgba(59,130,246,0.25)'],
  Complete:     ['#34d399', 'rgba(16,185,129,0.12)',   'rgba(16,185,129,0.25)'],
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
        padding: '1px 7px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '500',
        letterSpacing: '0.01em',
        lineHeight: '18px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
