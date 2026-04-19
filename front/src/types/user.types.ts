// Tipos relacionados ao usuário

export interface User {
  id: string;
  name: string;
  email: string;
  is_superuser?: boolean;
  avatar?: string;
  phone?: string;
  position?: string;
  date_joined?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
