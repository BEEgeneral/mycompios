'use client'
import { cookies } from 'next/headers'

export interface User {
  id: string
  email: string
  name: string
  companyId?: string
  rol?: string
  idioma?: string
  profile?: {
    name?: string
    nombreEmpresa?: string
    avatar_url?: string
  }
}

export interface LoginResponse {
  user: User
  accessToken: string
  appUser?: { id: string; nombre: string; rol: string; idioma: string; clienteId: string }
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  company: string
  sector?: string
  vision?: string
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Error al iniciar sesión')
  }

  const user: User = {
    id: data.user?.id,
    email: data.user?.email || email,
    name: data.user?.name || '',
    companyId: data.companyId,
    profile: { name: data.user?.name },
  }

  return {
    user,
    accessToken: data.token,
    appUser: data.appUser,
  }
}

export async function register(req: RegisterRequest): Promise<{ success: boolean }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Error en el registro')
  }
  return { success: true }
}

// ── Session helpers (cookie-based) ────────────────────────────────────────────

export function getSession(): { token: string; user: User } | null {
  if (typeof document === 'undefined') return null
  const token = document.cookie.split('; ').find(r => r.startsWith('auth_token='))?.split('=')[1]
  const userStr = sessionStorage.getItem('mc_user')
  if (!token || !userStr) return null
  try {
    return { token, user: JSON.parse(userStr) as User }
  } catch {
    return null
  }
}

export function saveSession(token: string, user: User) {
  sessionStorage.setItem('mc_token', token)
  sessionStorage.setItem('mc_user', JSON.stringify(user))
}

export function clearSession() {
  sessionStorage.removeItem('mc_token')
  sessionStorage.removeItem('mc_user')
  document.cookie = 'auth_token=; Max-Age=0; path=/'
}
