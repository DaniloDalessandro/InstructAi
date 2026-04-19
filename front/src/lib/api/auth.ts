import { API_URL } from '../config/config'
import { authFetch } from './authFetch'

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  access: string
  refresh?: string
  user: {
    id: string
    name: string
    email: string
    is_superuser?: boolean
  }
}

// Realiza login e retorna tokens + dados básicos do usuário
export async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/v1/accounts/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.detail || errorData.error || 'Erro ao fazer login')
  }

  return response.json()
}

export interface ChangePasswordData {
  old_password: string
  new_password: string
}

// Altera a senha do usuário autenticado
export async function changePassword(data: ChangePasswordData): Promise<void> {
  const response = await authFetch(`${API_URL}/api/v1/accounts/change-password/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    const message =
      errorData.old_password?.[0] ||
      errorData.new_password?.[0] ||
      errorData.detail ||
      'Erro ao alterar senha'
    throw new Error(message)
  }
}

// Realiza logout limpando dados locais
export async function logout(): Promise<void> {
  // O backend não possui endpoint de logout (tokens JWT são stateless)
  // Apenas limpamos os dados locais
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
  localStorage.removeItem('user_id')
  localStorage.removeItem('user_email')
  localStorage.removeItem('user_name')

  // Remover cookies de autenticação
  document.cookie = 'access=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
  document.cookie = 'refresh=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
}
