// Tipos relacionados ao usuário

export interface User {
  id: string;
  name: string;
  email: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  avatar?: string;
  phone?: string;
  position?: string;
  date_joined?: string;
  must_change_password?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserAdmin {
  id: number;
  email: string;
  name: string;
  phone: string;
  position: string;
  cpf: string;
  sector: number | null;
  sector_name: string | null;
  avatar_url: string | null;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  must_change_password: boolean;
  date_joined: string;
}

export type InvitationStatus = 'pending' | 'used' | 'expired' | 'cancelled';

export interface UserInvitation {
  id: number;
  email: string;
  token: string;
  status: InvitationStatus;
  is_valid: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}
