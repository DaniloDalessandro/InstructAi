import { authFetch } from './authFetch';
import { API_ENDPOINTS } from '../config/api.config';
import { API_URL } from '../config/config';
import type { Sector, SectorFormData, SectorListResponse } from '@/types/sector.types';

/**
 * Cliente de API para setores
 */

// Busca todos os setores com paginação e filtros
export async function getSectors(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  is_active?: string;
}): Promise<SectorListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  if (params?.is_active) queryParams.append('is_active', params.is_active);

  const url = `${API_URL}${API_ENDPOINTS.sectors.list}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar setores');
  }

  return response.json();
}

// Busca um setor pelo ID
export async function getSector(id: string): Promise<Sector> {
  const url = `${API_URL}${API_ENDPOINTS.sectors.detail(id)}`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar setor');
  }

  return response.json();
}

// Cria um novo setor
export async function createSector(data: SectorFormData): Promise<Sector> {
  const url = `${API_URL}${API_ENDPOINTS.sectors.create}`;

  const response = await authFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao criar setor');
  }

  return response.json();
}

// Atualiza um setor existente
export async function updateSector(id: string, data: SectorFormData): Promise<Sector> {
  const url = `${API_URL}${API_ENDPOINTS.sectors.update(id)}`;

  const response = await authFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao atualizar setor');
  }

  return response.json();
}

// Exclui um setor (soft delete — inativa)
export async function deleteSector(id: string): Promise<void> {
  const url = `${API_URL}${API_ENDPOINTS.sectors.delete(id)}`;

  const response = await authFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao inativar setor');
  }
}
