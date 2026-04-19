/**
 * Sector Type Definitions
 */

export interface Sector {
  id: string;
  name: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface SectorFormData {
  name: string;
}

export interface SectorListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Sector[];
}
