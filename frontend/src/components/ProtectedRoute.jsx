import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from
  '../context/AuthContext'

export default function ProtectedRoute({
  children,
  minimumRole = 'Viewer'
}) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="flex items-center
      justify-center h-screen
      bg-surface-0">
      <div className="w-8 h-8 border-2
        border-accent rounded-full
        border-t-transparent
        animate-spin" />
    </div>
  )

  if (!user) return (
    <Navigate to="/login" replace />
  )

  const ROLE_HIERARCHY = [
    'Viewer', 'Analyst',
    'Investigator', 'Admin'
  ]
  const userLevel = ROLE_HIERARCHY
    .indexOf(user.role)
  const requiredLevel = ROLE_HIERARCHY
    .indexOf(minimumRole)

  if (userLevel < requiredLevel) return (
    <div className="flex items-center
      justify-center h-screen
      bg-surface-0">
      <div className="text-center">
        <p className="text-danger
          text-lg font-bold">
          Access Denied
        </p>
        <p className="text-ink-2
          text-sm mt-2">
          You need {minimumRole} role
          or higher.
        </p>
      </div>
    </div>
  )

  return children
}
