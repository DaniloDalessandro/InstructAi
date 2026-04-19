import { API_CONFIG } from '@/constants/config';

/**
 * Configuração base da API
 */
export const apiConfig = {
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Endpoints da API do InstructAI
 */
export const API_ENDPOINTS = {
  // Autenticação
  auth: {
    login: '/api/v1/accounts/token/',
    refresh: '/api/v1/accounts/token/refresh/',
    me: '/api/v1/accounts/me/',
  },

  // Setores
  sectors: {
    list: '/api/v1/sectors/',
    detail: (id: string) => `/api/v1/sectors/${id}/`,
    create: '/api/v1/sectors/',
    update: (id: string) => `/api/v1/sectors/${id}/`,
    delete: (id: string) => `/api/v1/sectors/${id}/`,
  },

  // Tags
  tags: {
    list: '/api/v1/tags/',
    detail: (id: string) => `/api/v1/tags/${id}/`,
    create: '/api/v1/tags/',
    update: (id: string) => `/api/v1/tags/${id}/`,
    delete: (id: string) => `/api/v1/tags/${id}/`,
  },

  // Tutoriais
  tutorials: {
    list: '/api/v1/tutorials/tutorials/',
    detail: (id: string) => `/api/v1/tutorials/tutorials/${id}/`,
    create: '/api/v1/tutorials/tutorials/',
    update: (id: string) => `/api/v1/tutorials/tutorials/${id}/`,
    delete: (id: string) => `/api/v1/tutorials/tutorials/${id}/`,
    steps: '/api/v1/tutorials/steps/',
    stepDetail: (id: string) => `/api/v1/tutorials/steps/${id}/`,
    media: '/api/v1/tutorials/media/',
    mediaDetail: (id: string) => `/api/v1/tutorials/media/${id}/`,
  },

  // Manuais
  manuals: {
    list: '/api/v1/manuals/',
    detail: (id: string) => `/api/v1/manuals/${id}/`,
    create: '/api/v1/manuals/',
    update: (id: string) => `/api/v1/manuals/${id}/`,
    delete: (id: string) => `/api/v1/manuals/${id}/`,
  },

  // Cursos
  courses: {
    list: '/api/v1/courses/',
    detail: (id: string) => `/api/v1/courses/${id}/`,
    create: '/api/v1/courses/',
    update: (id: string) => `/api/v1/courses/${id}/`,
    delete: (id: string) => `/api/v1/courses/${id}/`,
    progress: (id: string) => `/api/v1/courses/${id}/progress/`,
    lessonsProgress: (id: string) => `/api/v1/courses/${id}/lessons_progress/`,
    exam: (id: string) => `/api/v1/courses/${id}/exam/`,
    submitExam: (id: string) => `/api/v1/courses/${id}/submit_exam/`,
  },

  // Lições
  lessons: {
    list: '/api/v1/lessons/',
    detail: (id: string) => `/api/v1/lessons/${id}/`,
    complete: (id: string) => `/api/v1/lessons/${id}/complete/`,
  },

  // Certificados
  certificates: {
    list: '/api/v1/certificates/',
    generate: '/api/v1/certificates/generate/',
  },
} as const;
