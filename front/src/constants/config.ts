// Application Configuration
export const APP_CONFIG = {
  name: 'InstructAI',
  version: '1.0.0',
  description: 'Sistema de Gerenciamento',
} as const;

// API Configuration
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
  retries: 3,
} as const;

// Pagination
export const PAGINATION = {
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
} as const;

// Date Formats
export const DATE_FORMATS = {
  display: 'DD/MM/YYYY',
  displayWithTime: 'DD/MM/YYYY HH:mm',
  api: 'YYYY-MM-DD',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  auth: {
    token: 'auth_token',
    refreshToken: 'refresh_token',
    user: 'user_data',
  },
  preferences: {
    theme: 'theme',
    language: 'language',
  },
} as const;
