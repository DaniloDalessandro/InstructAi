import { authFetch } from './authFetch';
import { API_ENDPOINTS } from '../config/api.config';
import { API_URL } from '../config/config';
import type { Tag, TagFormData, TagListResponse } from '@/types/tag.types';

/**
 * Cliente de API para tags
 */

// Busca todas as tags com paginação e filtros
export async function getTags(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  is_active?: string;
}): Promise<TagListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  if (params?.is_active) queryParams.append('is_active', params.is_active);

  const url = `${API_URL}${API_ENDPOINTS.tags.list}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar tags');
  }

  return response.json();
}

// Busca uma tag pelo ID
export async function getTag(id: string): Promise<Tag> {
  const url = `${API_URL}${API_ENDPOINTS.tags.detail(id)}`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar tag');
  }

  return response.json();
}

// Cria uma nova tag
export async function createTag(data: TagFormData): Promise<Tag> {
  const url = `${API_URL}${API_ENDPOINTS.tags.create}`;

  const response = await authFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao criar tag');
  }

  return response.json();
}

// Atualiza uma tag existente
export async function updateTag(id: string, data: TagFormData): Promise<Tag> {
  const url = `${API_URL}${API_ENDPOINTS.tags.update(id)}`;

  const response = await authFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao atualizar tag');
  }

  return response.json();
}

// Exclui uma tag
export async function deleteTag(id: string): Promise<void> {
  const url = `${API_URL}${API_ENDPOINTS.tags.delete(id)}`;

  const response = await authFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao deletar tag');
  }
}
