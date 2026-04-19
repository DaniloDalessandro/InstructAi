/**
 * Manual Type Definitions
 */

export interface Manual {
  id: string;
  name: string;
  pdf_file: string;
  pdf_url: string;
  sectors: string[];
  sectors_detail: Array<{ id: string; name: string }>;
  tags: string[];
  tags_detail: Array<{ id: string; name: string; color: string }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface ManualFormData {
  name: string;
  pdf_file: File | null;
  sectors: string[];
  tags: string[];
}

export interface ManualListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Manual[];
}
