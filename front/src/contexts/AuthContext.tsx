"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser, logout } from '@/lib/api/auth'

interface User {
  id: string
  name: string
  email: string
  role?: string
  is_superuser?: boolean
  avatar?: string
  phone?: string
  position?: string
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Lê de cookie (novo) com fallback para localStorage (sessões antigas)
    const token = getCookie('access') || localStorage.getItem('access_token') || localStorage.getItem('access')
    const userRaw = getCookie('user') || localStorage.getItem('user')

    if (token && userRaw) {
      setAccessToken(token)
      try {
        setUser(JSON.parse(userRaw))
      } catch {
        // dado corrompido — ignora
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const response = await loginUser({ email, password })

    if (response.access && response.user) {
      setAccessToken(response.access)
      setUser(response.user)

      setCookie('access', response.access, 60 * 60)             // 1 hora
      setCookie('user', JSON.stringify(response.user), 60 * 60)

      if (response.refresh) {
        setCookie('refresh', response.refresh, 60 * 60 * 24 * 7) // 7 dias
      }

      router.push('/dashboard')
    }
  }

  const updateUser = (data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...data }
      setCookie('user', JSON.stringify(updated), 60 * 60)
      return updated
    })
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // silencia erro de rede no logout
    } finally {
      setUser(null)
      setAccessToken(null)
      deleteCookie('access')
      deleteCookie('refresh')
      deleteCookie('user')
      router.push('/login')
    }
  }

  const isAuthenticated = !!accessToken && !!user

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated,
        isLoading,
        login,
        logout: handleLogout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
