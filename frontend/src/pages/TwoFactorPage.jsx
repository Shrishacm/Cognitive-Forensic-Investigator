/**
 * TwoFactorPage
 *
 * Standalone route for Two-Factor Authentication setup.
 * Redirects to the Settings page with the Security tab pre-selected,
 * since the 2FA setup form already lives inside SettingsPage.
 */
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function TwoFactorPage() {
  const navigate = useNavigate()

  // Redirect to Settings page with the Security tab pre-selected,
  // since 2FA setup lives there.
  useEffect(() => {
    navigate('/settings?tab=security', { replace: true })
  }, [navigate])

  return null
}
