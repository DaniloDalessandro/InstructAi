import { authFetch } from './authFetch';
import { API_URL } from '../config/config';

export async function getProfile() {
  const response = await authFetch(`${API_URL}/api/v1/accounts/me/`);
  if (!response.ok) throw new Error('Erro ao buscar perfil');
  return response.json();
}

export async function updateProfile(data: { name?: string; phone?: string; position?: string; avatar?: File | null }) {
  const formData = new FormData();
  if (data.name) formData.append('name', data.name);
  if (data.phone !== undefined) formData.append('phone', data.phone);
  if (data.position !== undefined) formData.append('position', data.position);
  if (data.avatar instanceof File) formData.append('avatar', data.avatar);

  const response = await authFetch(`${API_URL}/api/v1/accounts/me/`, {
    method: 'PATCH',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao atualizar perfil');
  }
  return response.json();
}
