// Tipos genéricos de resposta da API (padrão Django REST Framework)

// Resposta paginada padrão do DRF
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Erro de API
export interface ApiError {
  detail?: string;
  error?: string;
  [key: string]: string | string[] | undefined;
}

// Métodos HTTP suportados
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
