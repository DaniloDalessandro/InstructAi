// Rotas da aplicação InstructAI

export const ROUTES = {
  // Rotas públicas
  PUBLIC: {
    HOME: '/',
  },

  // Rotas de autenticação
  AUTH: {
    LOGIN: '/login',
  },

  // Rotas privadas (requerem autenticação)
  PRIVATE: {
    DASHBOARD: '/dashboard',

    // Tutoriais
    TUTORIALS: '/tutoriais',
    TUTORIAL_DETAIL: (id: string) => `/tutoriais/${id}`,
    TUTORIAL_NEW: '/tutoriais/novo',
    TUTORIAL_EDIT: (id: string) => `/tutoriais/${id}/editar`,

    // Manuais
    MANUALS: '/manuais',

    // Cursos
    COURSES: '/cursos',
    COURSE_DETAIL: (id: string) => `/cursos/${id}`,
    COURSE_EXAM: (id: string) => `/cursos/${id}/prova`,

    // Certificados
    CERTIFICATES: '/certificados',

    // Configurações
    SECTORS: '/setores',
    TAGS: '/tags',

    // Assistente IA
    ALICE: '/alice',

    // Ajuda
    HELP: '/ajuda',
  },
} as const;

export const PUBLIC_ROUTES = Object.values(ROUTES.PUBLIC);
export const AUTH_ROUTES = Object.values(ROUTES.AUTH);
