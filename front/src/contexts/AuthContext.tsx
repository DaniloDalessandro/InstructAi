"use client"

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser, logout } from '@/lib/api/auth'
import { getProfile } from '@/lib/api/account'
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm'

interface User {
  id: string
  name: string
  email: string
  must_change_password?: boolean
  role?: string
  is_staff?: boolean
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
  const sessionVersion = useRef(0)

  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;
    const token = getCookie('access') || localStorage.getItem('access_token') || localStorage.getItem('access');
    if (!getCookie('access') && token) setCookie('access',token,3600);
    if (!token && !getCookie('refresh')) {setIsLoading(false);return;}
    getProfile().then(profile => {
      if (!active || version !== sessionVersion.current) return;
      const restored = {...profile, id:String(profile.id), avatar:profile.avatar_url || undefined};
      setAccessToken(getCookie('access'));
      setUser(restored);
      setCookie('user',JSON.stringify(restored),60*60*24*7);
    }).catch(() => {
      if (active && version === sessionVersion.current) {setUser(null);setAccessToken(null);}
    }).finally(() => {if (active) setIsLoading(false);});
    return () => {active = false;};
  }, [])

  const login = async (email: string, password: string) => {
    sessionVersion.current++;
    const response = await loginUser({ email, password })

    if (response.access && response.user) {
      setAccessToken(response.access)
      setUser(response.user)

      setCookie('access', response.access, 60 * 60)             // 1 hora
      setCookie('user', JSON.stringify(response.user), 60 * 60 * 24 * 7)

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
      setCookie('user', JSON.stringify(updated), 60 * 60 * 24 * 7)
      return updated
    })
  }

  const handleLogout = async () => {
    sessionVersion.current++;
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
      <ChangePasswordForm isOpen={!!user?.must_change_password} mandatory onClose={() => updateUser({must_change_password:false})}/>
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
