import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Users, Plus, Trash2, Shield, UserCheck } from 'lucide-react'
import api from '../api/client'
import PageLayout from '../components/PageLayout'
import toast from 'react-hot-toast'

// ── Access level palette ─────────────────────────────────────────────────────
const ACCESS_CONFIG = {
  manage: { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.25)', label: 'Manage' },
  write:  { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)',  label: 'Write'  },
  read:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.2)',  label: 'Read'   },
}

// ── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name, color = '#818cf8' }) {
  const initials = (name || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 8,
      background: `${color}18`,
      border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function CaseSettingsPage() {
  const { caseId } = useParams()
  const [accessList, setAccessList] = useState([])
  const [allUsers,   setAllUsers]   = useState([])
  const [selectedUser,  setSelectedUser]  = useState('')
  const [accessLevel,   setAccessLevel]   = useState('read')
  const [loading,       setLoading]       = useState(true)
  const [granting,      setGranting]      = useState(false)
  const [revoking,      setRevoking]      = useState(null)

  useEffect(() => { loadData() }, [caseId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [accRes, usersRes] = await Promise.all([
        api.get(`/cases/${caseId}/access`),
        api.get('/auth/users'),
      ])
      setAccessList(accRes.data || [])
      setAllUsers(usersRes.data   || [])
    } catch {
      toast.error('Failed to load access data')
    } finally {
      setLoading(false)
    }
  }

  const handleGrant = async () => {
    if (!selectedUser) return
    setGranting(true)
    try {
      await api.post(`/cases/${caseId}/access`, {
        user_id:      selectedUser,
        access_level: accessLevel,
      })
      toast.success('Access granted')
      setSelectedUser('')
      await loadData()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to grant access')
    } finally {
      setGranting(false)
    }
  }

  const handleRevoke = async (id, username) => {
    setRevoking(id)
    try {
      await api.delete(`/cases/${caseId}/access/${id}`)
      toast.success(`Access revoked for ${username}`)
      await loadData()
    } catch {
      toast.error('Failed to revoke access')
    } finally {
      setRevoking(null)
    }
  }

  // Users not already in the access list
  const unassignedUsers = allUsers.filter(
    u => !accessList.find(a => a.user_id === u.id)
  )

  const inputStyle = {
    background: 'var(--color-white-04)',
    border:     '1px solid rgba(255,255,255,0.09)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 12,
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <PageLayout
      title="Case Access"
      subtitle="Control which investigators and analysts can view and work on this case"
    >
      {/* Grant access form */}
      <div style={{
        background: 'var(--color-white-03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '20px 22px',
        marginBottom: 20,
      }}>
        <p style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-white-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 14,
        }}>
          Grant Access to a User
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          >
            <option value="">Select user…</option>
            {unassignedUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.full_name} (@{u.username}) — {u.role}
              </option>
            ))}
          </select>

          <select
            value={accessLevel}
            onChange={e => setAccessLevel(e.target.value)}
            style={{ ...inputStyle, width: 130 }}
          >
            <option value="read">Read</option>
            <option value="write">Write</option>
            <option value="manage">Manage</option>
          </select>

          <button
            onClick={handleGrant}
            disabled={!selectedUser || granting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 8,
              background: selectedUser && !granting ? '#4f46e5' : 'rgba(79,70,229,0.3)',
              border: 'none', color: 'var(--color-white-full)', fontSize: 12, fontWeight: 500,
              cursor: selectedUser && !granting ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap', transition: 'background 0.15s',
            }}
          >
            <Plus size={13} />
            {granting ? 'Granting…' : 'Grant Access'}
          </button>
        </div>

        <p style={{ fontSize: 11, marginTop: 10, color: 'var(--color-white-2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-white-3)' }}>Read</strong> — view only &nbsp;·&nbsp;
          <strong style={{ color: 'var(--color-white-3)' }}>Write</strong> — upload evidence &amp; run queries &nbsp;·&nbsp;
          <strong style={{ color: 'var(--color-white-3)' }}>Manage</strong> — full control including access management
        </p>
      </div>

      {/* Current access list */}
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'var(--color-white-03)',
          gap: 8,
        }}>
          <Users size={14} color="rgba(255,255,255,0.35)" />
          <span style={{ fontSize: 12, color: 'var(--color-white-4)', fontWeight: 600 }}>
            {loading ? '…' : `${accessList.length} user${accessList.length !== 1 ? 's' : ''} with access`}
          </span>
        </div>

        {/* Loading skeletons */}
        {loading && Array(3).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{
            height: 64, borderRadius: 0, margin: '1px 0',
            animationDelay: `${i * 100}ms`,
          }} />
        ))}

        {/* Access rows */}
        {!loading && accessList.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
          }}>
            <Shield size={28} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: 'var(--color-white-2)' }}>
              No users assigned yet. Grant access above.
            </p>
          </div>
        )}

        {!loading && accessList.map((a, idx) => {
          const cfg = ACCESS_CONFIG[a.access_level] || ACCESS_CONFIG.read
          return (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px',
              borderBottom: idx < accessList.length - 1
                ? '1px solid rgba(255,255,255,0.04)'
                : 'none',
              transition: 'background 0.1s',
            }}>
              <Avatar name={a.full_name} color={cfg.color} />

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {a.full_name || a.username}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-white-3)', fontFamily: 'monospace' }}>
                  @{a.username} &nbsp;·&nbsp; {a.role}
                  &nbsp;·&nbsp; granted by <strong style={{ color: 'var(--color-white-4)' }}>{a.granted_by}</strong>
                </p>
              </div>

              {/* Access level badge */}
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 6,
                color: cfg.color,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                textTransform: 'capitalize',
                flexShrink: 0,
              }}>
                {cfg.label}
              </span>

              {/* Revoke button */}
              <button
                onClick={() => handleRevoke(a.id, a.username)}
                disabled={revoking === a.id}
                title="Revoke access"
                style={{
                  padding: '5px 7px', borderRadius: 6,
                  background: 'none', border: 'none',
                  color: revoking === a.id ? '#f87171' : 'var(--color-white-2)',
                  cursor: revoking === a.id ? 'not-allowed' : 'pointer',
                  transition: 'color 0.15s', flexShrink: 0,
                  display: 'flex', alignItems: 'center',
                }}
                onMouseEnter={e => { if (revoking !== a.id) e.currentTarget.style.color = '#f87171' }}
                onMouseLeave={e => { if (revoking !== a.id) e.currentTarget.style.color = 'var(--color-white-2)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </PageLayout>
  )
}
