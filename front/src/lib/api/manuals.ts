import { authFetch } from './authFetch';
import { API_ENDPOINTS } from '../config/api.config';
import { API_URL } from '../config/config';
import type { Manual, ManualFormData, ManualListResponse } from '@/types/manual.types';

/**
 * Cliente de API para manuais
 */

// authFetch personalizado para multipart/form-data (upload de arquivos)
async function authFetchMultipart(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const access = document.cookie
    .split('; ')
    .find((row) => row.startsWith('access='))
    ?.split('=')[1];

  if (!access) {
    throw new Error('Token de acesso não encontrado');
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${access}`,
    // NÃO definir Content-Type para multipart/form-data — o browser define com o boundary
  };

  // Remove Content-Type caso exista
  const { 'Content-Type': _, ...restHeaders } = headers as any;

  return fetch(url, {
    ...options,
    headers: restHeaders,
  });
}

// Busca todos os manuais com paginação e filtros
export async function getManuals(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  sectors?: string[];
  tags?: string[];
  ordering?: string;
  is_active?: string;
}): Promise<ManualListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.sectors && params.sectors.length > 0) {
    params.sectors.forEach((sector) => queryParams.append('sectors', sector));
  }
  if (params?.tags && params.tags.length > 0) {
    params.tags.forEach((tag) => queryParams.append('tags', tag));
  }
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  if (params?.is_active) queryParams.append('is_active', params.is_active);

  const url = `${API_URL}${API_ENDPOINTS.manuals.list}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar manuais');
  }

  return response.json();
}

// Busca um manual pelo ID
export async function getManual(id: string): Promise<Manual> {
  const url = `${API_URL}${API_ENDPOINTS.manuals.detail(id)}`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar manual');
  }

  return response.json();
}

// Cria um novo manual com upload de arquivo
export async function createManual(data: ManualFormData): Promise<Manual> {
  const url = `${API_URL}${API_ENDPOINTS.manuals.create}`;

  const formData = new FormData();
  formData.append('name', data.name);

  if (data.pdf_file) {
    formData.append('pdf_file', data.pdf_file);
  }

  // Adiciona array de setores
  data.sectors.forEach((sector) => {
    formData.append('sectors', sector);
  });

  // Adiciona array de tags
  data.tags.forEach((tag) => {
    formData.append('tags', tag);
  });

  const response = await authFetchMultipart(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao criar manual');
  }

  return response.json();
}

// Atualiza um manual existente
export async function updateManual(id: string, data: ManualFormData): Promise<Manual> {
  const url = `${API_URL}${API_ENDPOINTS.manuals.update(id)}`;

  const formData = new FormData();
  formData.append('name', data.name);

  // Adiciona pdf_file apenas se um novo arquivo foi selecionado
  if (data.pdf_file) {
    formData.append('pdf_file', data.pdf_file);
  }

  // Adiciona array de setores
  data.sectors.forEach((sector) => {
    formData.append('sectors', sector);
  });

  // Adiciona array de tags
  data.tags.forEach((tag) => {
    formData.append('tags', tag);
  });

  const response = await authFetchMultipart(url, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao atualizar manual');
  }

  return response.json();
}

// Exclui um manual (soft delete — inativa)
export async function deleteManual(id: string): Promise<void> {
  const url = `${API_URL}${API_ENDPOINTS.manuals.delete(id)}`;

  const response = await authFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao inativar manual');
  }
}

// ==================== SHARE / ACCESS ====================

export async function getSharedAdminsManual(id: string): Promise<{ id: number; email: string; name: string }[]> {
  const response = await authFetch(`${API_URL}/api/v1/manuals/${id}/share/`, { method: 'GET' });
  if (!response.ok) throw new Error('Erro ao buscar administradores');
  const data = await response.json();
  return data.shared_admins;
}

export async function updateSharedAdminsManual(
  id: string,
  payload: { add?: string[]; remove?: string[] }
): Promise<{ shared_admins: { id: number; email: string; name: string }[]; errors?: string[] }> {
  const response = await authFetch(`${API_URL}/api/v1/manuals/${id}/share/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Erro ao atualizar acesso');
  }
  return response.json();
}
