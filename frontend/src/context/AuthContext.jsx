import React, { createContext,
  useContext, useState,
  useEffect } from 'react'
import { login as apiLogin,
         getMe } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(
      'cfi_user')
    return stored
      ? JSON.parse(stored)
      : null
  })
  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    const token = localStorage.getItem(
      'cfi_token')
    if (token) {
      getMe()
        .then(res => {
          setUser(res.data)
          localStorage.setItem(
            'cfi_user',
            JSON.stringify(res.data))
        })
        .catch(() => {
          localStorage.removeItem(
            'cfi_token')
          localStorage.removeItem(
            'cfi_user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const signIn = async (username, password, totp_code = null) => {
    const res = await apiLogin(username, password, totp_code)
    
    // Check if 2FA is required before attempting to extract token
    if (res.data.requires_2fa || res.data.detail === "2FA_REQUIRED") {
      return { requires2FA: true }
    }

    const { access_token, user: userData } = res.data
    localStorage.setItem('cfi_token', access_token)
    localStorage.setItem('cfi_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const signOut = () => {
    localStorage.removeItem('cfi_token')
    localStorage.removeItem('cfi_user')
    setUser(null)
  }

  // Role checks
  const isAdmin = user?.role === 'Admin'
  const isInvestigator = [
    'Admin', 'Investigator'
  ].includes(user?.role)
  const isAnalyst = [
    'Admin', 'Investigator', 'Analyst'
  ].includes(user?.role)

  return (
    <AuthContext.Provider value={{
      user, loading, signIn, signOut,
      isAdmin, isInvestigator, isAnalyst
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () =>
  useContext(AuthContext)
