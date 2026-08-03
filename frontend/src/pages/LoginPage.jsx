import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Network, Bot,
         HardDrive, FileText,
         Lock, Eye, EyeOff,
         ChevronRight, Activity,
         Search, AlertTriangle,
         Key, Globe } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const FEATURES = [
  {
    icon: HardDrive,
    title: 'Forensic Ingestion',
    desc: 'Parse .E01, .001, .dd disk images. Extract every file, email, browser history and registry entry automatically.',
    color: '#D4A32A',
  },
  {
    icon: Bot,
    title: 'AI Intelligence Partner',
    desc: 'Conduct natural language analysis grounded strictly in evidence with full source citations.',
    color: '#2A6EA6',
  },
  {
    icon: Network,
    title: 'Entity Link Analysis',
    desc: 'Map connections between targets, locations, communication endpoints and IP addresses across evidence.',
    color: '#D4A32A',
  },
  {
    icon: Shield,
    title: 'Chain of Custody',
    desc: 'SHA-256 integrity verification, immutable audit trail, and classified PDF reporting.',
    color: '#1A7A4A',
  },
  {
    icon: Key,
    title: 'Credential Extraction',
    desc: 'Detect passwords, private keys, authorization tokens and API credentials embedded in evidence.',
    color: '#D4A32A',
  },
  {
    icon: Globe,
    title: 'Geographic Mapping',
    desc: 'Plot GPS coordinates from EXIF metadata and geolocate IP communications on an offline map.',
    color: '#C53030',
  },
]

const STATS = [
  { value: '15+', label: 'Forensic Formats' },
  { value: '256-bit', label: 'Hash Verification' },
  { value: 'AIR-GAPPED', label: 'Operation Mode' },
  { value: '100%', label: 'Local Intelligence' },
]

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!form.username || !form.password) {
      toast.error('Enter credentials')
      return
    }
    setLoading(true)
    try {
      await signIn(form.username, form.password)
      navigate('/')
    } catch (e) {
      toast.error(
        e.response?.data?.error || 
        e.response?.data?.detail || 
        e.message ||
        'Authentication failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060B14',
      color: '#C8D8E8',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0,
        zIndex: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(42,110,166,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(42,110,166,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }} />

      {/* Top Banner */}
      <div style={{
        position: 'relative', zIndex: 10,
        background: 'rgba(212, 163, 42, 0.10)',
        borderBottom: '1px solid rgba(212, 163, 42, 0.25)',
        textAlign: 'center',
        padding: '3px 0',
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.22em',
          color: 'rgba(212, 163, 42, 0.85)',
          textTransform: 'uppercase',
        }}>
          ⬛ RESTRICTED ACCESS — AUTHORISED LAW ENFORCEMENT & INVESTIGATIVE PERSONNEL ONLY ⬛
        </span>
      </div>

      {/* Top nav */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 6vw',
        borderBottom: '1px solid rgba(42,110,166,0.20)',
        background: 'rgba(6,11,20,0.92)',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 4,
            background: 'rgba(212,163,42,0.12)',
            border: '1px solid rgba(212,163,42,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={18} color="#D4A32A"/>
          </div>
          <div>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#D4A32A',
            }}>
              CFI
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'rgba(122,154,184,0.7)',
              marginLeft: 12,
              letterSpacing: '0.04em',
            }}>
              Cognitive Forensic Investigator System
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 3,
            background: 'rgba(26,122,74,0.12)',
            border: '1px solid rgba(26,122,74,0.30)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: '#34D399',
          }}>
            <span style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#1A7A4A',
              boxShadow: '0 0 6px rgba(26,122,74,0.8)',
            }} />
            AIR-GAPPED SYSTEM
          </div>
          <button
            onClick={() => setShowLogin(true)}
            className="btn-primary"
            style={{
              padding: '8px 22px',
              fontSize: 13,
            }}>
            Authenticate Terminal
            <ChevronRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero section */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: '100%',
        margin: '0 auto',
        padding: '60px 6vw 40px',
        display: 'flex',
        gap: '6vw',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        {/* Left Column */}
        <div style={{ flex: '1 1 500px', textAlign: 'left' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            borderRadius: 3,
            background: 'rgba(212, 163, 42, 0.08)',
            border: '1px solid rgba(212, 163, 42, 0.30)',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#D4A32A',
            marginBottom: 20,
          }}>
            <Lock size={12} />
            CLASSIFIED INTELLIGENCE & FORENSIC SUITE
          </div>

          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 'clamp(48px, 6vw, 76px)',
            fontWeight: 800,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            lineHeight: 1.05,
            color: '#E8F0F8',
            marginBottom: 20,
          }}>
            AUTOMATED DIGITAL FORENSICS
            <br />
            <span style={{ color: '#D4A32A' }}>
              & REASONING PLATFORM
            </span>
          </h1>

          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            color: '#7A9AB8',
            maxWidth: 680,
            marginBottom: 40,
            lineHeight: 1.6,
          }}>
            Ingest disk images (.E01, .001), extract digital evidence, map multi-entity correlation graphs, and conduct interactive AI-assisted investigations — operated 100% offline within your secure boundary.
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 44 }}>
            <button
              onClick={() => setShowLogin(true)}
              className="btn-primary"
              style={{
                padding: '14px 32px',
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
              <Lock size={16} />
              AUTHENTICATE SESSION
            </button>
            <button
              onClick={() => navigate('/register')}
              className="btn-secondary"
              style={{
                padding: '14px 28px',
                fontSize: 14,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
              REGISTER OPERATOR
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {STATS.map(s => (
              <div key={s.label} style={{
                padding: '12px 22px',
                borderRadius: 4,
                background: '#0C1220',
                border: '1px solid rgba(42,110,166,0.22)',
                borderTop: '2px solid #D4A32A',
              }}>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#E8F0F8',
                  lineHeight: 1.1,
                }}>
                  {s.value}
                </p>
                <p style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(122,154,184,0.6)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  marginTop: 3,
                }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Features */}
        <div style={{ flex: '1 1 480px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {FEATURES.map((f) => (
              <div
                key={f.title}
                style={{
                  background: '#0C1220',
                  border: '1px solid rgba(42, 110, 166, 0.20)',
                  borderRadius: 4,
                  padding: '20px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(212, 163, 42, 0.40)'
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.4)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(42, 110, 166, 0.20)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 3,
                  background: `${f.color}15`,
                  border: `1px solid ${f.color}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <p style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#E8F0F8',
                  marginBottom: 6,
                }}>
                  {f.title}
                </p>
                <p style={{
                  fontSize: 12,
                  color: '#7A9AB8',
                  lineHeight: 1.5,
                }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login modal overlay */}
      {showLogin && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(4,7,14,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowLogin(false)
          }}
        >
          <div
            className="animate-scale-in"
            style={{
              width: '100%', maxWidth: 420,
              background: '#0C1220',
              border: '1px solid rgba(212, 163, 42, 0.40)',
              borderRadius: 4,
              padding: 28,
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12, marginBottom: 24,
              paddingBottom: 16,
              borderBottom: '1px solid rgba(42, 110, 166, 0.20)',
            }}>
              <div style={{
                width: 36, height: 36,
                borderRadius: 4,
                background: 'rgba(212, 163, 42, 0.12)',
                border: '1px solid rgba(212, 163, 42, 0.40)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Shield size={18} color="#D4A32A" />
              </div>
              <div>
                <p style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#D4A32A',
                  lineHeight: 1.1,
                }}>
                  OPERATOR AUTHENTICATION
                </p>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: 'rgba(122, 154, 184, 0.7)',
                }}>
                  SECURE TERMINAL ACCESS
                </p>
              </div>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(122, 154, 184, 0.8)',
                  display: 'block',
                  marginBottom: 6,
                }}>
                  OPERATOR ID / USERNAME
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="enter.operator.id"
                  autoFocus
                  className="input"
                />
              </div>

              <div>
                <label style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(122, 154, 184, 0.8)',
                  display: 'block',
                  marginBottom: 6,
                }}>
                  SECURITY KEY / PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••••••"
                    className="input"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(122, 154, 184, 0.6)',
                      display: 'flex',
                    }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  marginTop: 6,
                  fontSize: 14,
                }}>
                {loading
                  ? 'VERIFYING CREDENTIALS...'
                  : <><Lock size={14} /> AUTHENTICATE SESSION</>}
              </button>

              <div style={{ textAlign: 'center', paddingTop: 10 }}>
                <span style={{ fontSize: 12, color: 'rgba(122, 154, 184, 0.5)' }}>
                  Unregistered personnel?{' '}
                </span>
                <button
                  onClick={() => navigate('/register')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#D4A32A',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                  Register Operator ID
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
