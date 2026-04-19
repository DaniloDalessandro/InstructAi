import type { Sector } from './sector.types';
import type { Tag } from './tag.types';

/**
 * Tutorial Type Definitions
 */

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  sector: string;
  sector_detail: Sector;
  tags: string[];
  tags_detail: Tag[];
  created_by: string;
  created_by_name: string;
  created_by_email: string;
  updated_by: string | null;
  is_active: boolean;
  steps: TutorialStep[];
  step_count: number;
  created_at: string;
  updated_at: string;
}

export interface TutorialListItem {
  id: string;
  title: string;
  description: string;
  sector: string;
  sector_detail: Sector;
  tags: string[];
  tags_detail: Tag[];
  created_by: string;
  created_by_name: string;
  step_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TutorialStep {
  id: string;
  tutorial: string;
  order: number;
  title: string;
  content: string;
  media: TutorialMedia[];
  media_count: number;
  created_at: string;
  updated_at: string;
}

export interface TutorialMedia {
  id: string;
  step: string;
  media_type: 'image' | 'video_upload' | 'video_embed';
  file: string | null;
  file_url: string | null;
  embed_url: string | null;
  caption: string | null;
  annotations: any | null; // JSON annotations from image editor
  order: number;
  created_at: string;
  updated_at: string;
}

export interface TutorialFormData {
  title: string;
  description: string;
  sector: string;
  tags: string[];
  is_active: boolean;
}

export interface TutorialStepFormData {
  tutorial: string;
  order: number;
  title: string;
  content: string;
}

export interface TutorialMediaFormData {
  step: string;
  media_type: 'image' | 'video_upload' | 'video_embed';
  file?: File | null;
  embed_url?: string;
  caption?: string;
  annotations?: any;
  order: number;
}

export interface TutorialListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TutorialListItem[];
}

export interface TutorialStepListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TutorialStep[];
}

export interface TutorialMediaListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TutorialMedia[];
}
