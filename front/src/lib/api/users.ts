import { authFetch } from './authFetch';
import { API_URL } from '../config/config';
import type { UserAdmin, UserInvitation } from '@/types/user.types';

const BASE = `${API_URL}/api/v1/accounts`;

// ==================== USERS ====================

export async function getUsers(params?: { search?: string; sectors?: string[] }): Promise<UserAdmin[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  params?.sectors?.forEach((s) => qs.append('sector', s));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await authFetch(`${BASE}/users/${query}`);
  if (!res.ok) throw new Error('Erro ao buscar usuários');
  const data = await res.json();
  return data.results ?? data;
}

export async function getUser(id: number): Promise<UserAdmin> {
  const res = await authFetch(`${BASE}/users/${id}/`);
  if (!res.ok) throw new Error('Erro ao buscar usuário');
  return res.json();
}

export async function updateUser(id: number, data: Partial<UserAdmin>): Promise<UserAdmin> {
  const res = await authFetch(`${BASE}/users/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erro ao atualizar usuário');
  }
  return res.json();
}

export async function deleteUser(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/users/${id}/`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erro ao remover usuário');
  }
}

export interface ManualUserPayload {
  email: string;
  name: string;
  cpf?: string;
  phone?: string;
  position?: string;
  sector?: number | null;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_active?: boolean;
}

export async function createUserManually(data: ManualUserPayload): Promise<UserAdmin> {
  const res = await authFetch(`${BASE}/users/create/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || Object.values(err).flat().join(' ') || 'Erro ao criar usuário');
  }
  return res.json();
}

// ==================== INVITATIONS ====================

export async function getInvitations(status?: string): Promise<UserInvitation[]> {
  const qs = status ? `?status=${status}` : '';
  const res = await authFetch(`${BASE}/invitations/${qs}`);
  if (!res.ok) throw new Error('Erro ao buscar convites');
  return res.json();
}

export async function createInvitation(email: string): Promise<UserInvitation> {
  const res = await authFetch(`${BASE}/invitations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.email?.[0] || err.detail || 'Erro ao criar convite');
  }
  return res.json();
}

export async function resendInvitation(id: number): Promise<UserInvitation> {
  const res = await authFetch(`${BASE}/invitations/${id}/`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erro ao reenviar convite');
  }
  return res.json();
}

export async function cancelInvitation(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/invitations/${id}/`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao cancelar convite');
}

// ==================== PUBLIC ====================

export async function validateInvitationToken(token: string): Promise<{ email: string; expires_at: string }> {
  const res = await fetch(`${API_URL}/api/v1/accounts/invitations/validate/${token}/`);
  if (!res.ok) throw new Error('Convite inválido ou expirado.');
  return res.json();
}

export interface CompleteRegistrationPayload {
  token: string;
  name: string;
  cpf?: string;
  phone?: string;
  position?: string;
  sector?: number | null;
  password: string;
  confirm_password: string;
}

export async function completeRegistration(data: CompleteRegistrationPayload): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/accounts/register/complete/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.token?.[0] || err.password?.[0] || err.detail || 'Erro ao completar cadastro';
    throw new Error(msg);
  }
}
