/**
 * ChangePasswordPage
 *
 * Standalone route for changing password.
 * Renders the same password-change form that exists inside SettingsPage,
 * as a dedicated page reachable at /change-password.
 */
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ChangePasswordPage() {
  const navigate = useNavigate()

  // Redirect to Settings page with the Security tab pre-selected,
  // since password change lives there.
  useEffect(() => {
    navigate('/settings?tab=security', { replace: true })
  }, [navigate])

  return null
}
