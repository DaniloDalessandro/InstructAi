import { authFetch } from './authFetch';
import { API_URL } from '../config/config';
import type {
  Tutorial,
  TutorialListItem,
  TutorialListResponse,
  TutorialFormData,
  TutorialStep,
  TutorialStepFormData,
  TutorialStepListResponse,
  TutorialMedia,
  TutorialMediaFormData,
  TutorialMediaListResponse,
} from '@/types/tutorial.types';

const API_BASE_URL = `${API_URL}/api/v1/tutorials`;

// Operações CRUD de tutoriais
export async function getTutorials(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  sector?: string;
  tags?: string;
  is_active?: string;
}): Promise<TutorialListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.sector) queryParams.append('sector', params.sector);
  if (params?.tags) queryParams.append('tags', params.tags);
  if (params?.is_active) queryParams.append('is_active', params.is_active);

  const url = `${API_BASE_URL}/tutorials/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await authFetch(url);

  if (!response.ok) {
    throw new Error('Erro ao buscar tutoriais');
  }

  return response.json();
}

export async function getTutorial(id: string): Promise<Tutorial> {
  const response = await authFetch(`${API_BASE_URL}/tutorials/${id}/`);

  if (!response.ok) {
    throw new Error('Erro ao buscar tutorial');
  }

  return response.json();
}

export async function createTutorial(data: TutorialFormData): Promise<Tutorial> {
  const response = await authFetch(`${API_BASE_URL}/tutorials/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao criar tutorial');
  }

  return response.json();
}

export async function updateTutorial(id: string, data: Partial<TutorialFormData>): Promise<Tutorial> {
  const response = await authFetch(`${API_BASE_URL}/tutorials/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao atualizar tutorial');
  }

  return response.json();
}

export async function deleteTutorial(id: string): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/tutorials/${id}/`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Erro ao excluir tutorial');
  }
}

// Operações CRUD de passos de tutoriais
export async function getTutorialSteps(params?: {
  tutorial?: string;
  page?: number;
  page_size?: number;
}): Promise<TutorialStepListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.tutorial) queryParams.append('tutorial', params.tutorial);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

  const url = `${API_BASE_URL}/steps/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await authFetch(url);

  if (!response.ok) {
    throw new Error('Erro ao buscar passos do tutorial');
  }

  return response.json();
}

export async function getTutorialStep(id: string): Promise<TutorialStep> {
  const response = await authFetch(`${API_BASE_URL}/steps/${id}/`);

  if (!response.ok) {
    throw new Error('Erro ao buscar passo do tutorial');
  }

  return response.json();
}

export async function createTutorialStep(data: TutorialStepFormData): Promise<TutorialStep> {
  const response = await authFetch(`${API_BASE_URL}/steps/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao criar passo do tutorial');
  }

  return response.json();
}

export async function updateTutorialStep(id: string, data: Partial<TutorialStepFormData>): Promise<TutorialStep> {
  const response = await authFetch(`${API_BASE_URL}/steps/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao atualizar passo do tutorial');
  }

  return response.json();
}

export async function deleteTutorialStep(id: string): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/steps/${id}/`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Erro ao excluir passo do tutorial');
  }
}

export async function reorderTutorialSteps(steps: { id: string; order: number }[]): Promise<TutorialStep[]> {
  const response = await authFetch(`${API_BASE_URL}/steps/reorder/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ steps }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao reordenar passos do tutorial');
  }

  return response.json();
}

// Operações CRUD de mídias de tutoriais
export async function getTutorialMedia(params?: {
  step?: string;
  page?: number;
  page_size?: number;
}): Promise<TutorialMediaListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.step) queryParams.append('step', params.step);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

  const url = `${API_BASE_URL}/media/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await authFetch(url);

  if (!response.ok) {
    throw new Error('Erro ao buscar mídias do tutorial');
  }

  return response.json();
}

export async function createTutorialMedia(data: TutorialMediaFormData): Promise<TutorialMedia> {
  const formData = new FormData();

  formData.append('step', data.step);
  formData.append('media_type', data.media_type);
  formData.append('order', data.order.toString());

  if (data.file) {
    formData.append('file', data.file);
  }

  if (data.embed_url) {
    formData.append('embed_url', data.embed_url);
  }

  if (data.caption) {
    formData.append('caption', data.caption);
  }

  if (data.annotations) {
    formData.append('annotations', JSON.stringify(data.annotations));
  }

  const response = await authFetch(`${API_BASE_URL}/media/`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao criar mídia do tutorial');
  }

  return response.json();
}

export async function updateTutorialMedia(id: string, data: Partial<TutorialMediaFormData>): Promise<TutorialMedia> {
  const formData = new FormData();

  if (data.media_type) formData.append('media_type', data.media_type);
  if (data.order !== undefined) formData.append('order', data.order.toString());
  if (data.file) formData.append('file', data.file);
  if (data.embed_url) formData.append('embed_url', data.embed_url);
  if (data.caption) formData.append('caption', data.caption);
  if (data.annotations) formData.append('annotations', JSON.stringify(data.annotations));

  const response = await authFetch(`${API_BASE_URL}/media/${id}/`, {
    method: 'PATCH',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao atualizar mídia do tutorial');
  }

  return response.json();
}

export async function deleteTutorialMedia(id: string): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/media/${id}/`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Erro ao excluir mídia do tutorial');
  }
}
