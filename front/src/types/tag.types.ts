/**
 * Tag Type Definitions
 */

export interface Tag {
  id: string;
  name: string;
  color?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface TagFormData {
  name: string;
  color?: string;
}

export interface TagListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Tag[];
}
