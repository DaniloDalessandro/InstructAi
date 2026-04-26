import type { Sector } from './sector.types';
import type { Tag } from './tag.types';

/**
 * Course Type Definitions
 */

export interface UserPermissions {
  can_edit: boolean;
  can_delete: boolean;
  can_manage_access: boolean;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  sector: string;
  sector_detail: Sector;
  tags: string[];
  tags_detail: Tag[];
  has_final_exam: boolean;
  passing_score: number;
  workload_hours: number;
  exam_duration_minutes: number;
  is_active: boolean;
  total_lessons: number;
  lessons: Lesson[];
  questions: Question[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  user_permissions: UserPermissions;
}

export interface CourseListItem {
  id: string;
  name: string;
  description: string;
  sector: string;
  sector_detail: Sector;
  tags: string[];
  tags_detail: Tag[];
  total_lessons: number;
  first_lesson_video_id: string | null;
  user_progress: UserCourseProgress | null;
  workload_hours: number;
  is_active: boolean;
}

export interface Lesson {
  id: string;
  course: string;
  name: string;
  youtube_url: string;
  youtube_video_id: string | null;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface LessonProgress {
  lesson_id: string;
  lesson_name: string;
  lesson_order: number;
  youtube_url: string;
  youtube_video_id: string | null;
  is_completed: boolean;
  completed_at: string | null;
}

export interface Question {
  id: string;
  course: string;
  text: string;
  options: string[];
  correct_option: number;
  order: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface QuestionPublic {
  id: string;
  text: string;
  options: string[];
  order: number;
}

export interface CourseProgress {
  id: string;
  user: string;
  course: string;
  course_name: string;
  completion_percentage: number;
  exam_score: number | null;
  exam_passed: boolean;
  completed_at: string | null;
  can_generate_certificate: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCourseProgress {
  completion_percentage: number;
  exam_passed: boolean;
  completed_at: string | null;
}

export interface ExamSubmission {
  answers: Record<string, number>; // question_id: selected_option_index
}

export interface QuestionResult {
  correct: boolean;
  your_answer: string;
  correct_answer: string;
}

export interface ExamResult {
  score: number;
  passed: boolean;
  correct_count: number;
  total_questions: number;
  passing_score: number;
  question_results: Record<string, QuestionResult>;
}

export interface Certificate {
  id: string;
  user: string;
  user_name: string;
  course: string;
  course_name: string;
  validation_code: string;
  pdf_file: string | null;
  pdf_url: string | null;
  issued_at: string;
  created_at: string;
}

export interface CourseFormData {
  name: string;
  description: string;
  sector: string;
  tags: string[];
  has_final_exam: boolean;
  passing_score: number;
  workload_hours: number;
  exam_duration_minutes: number;
  is_active: boolean;
}

export interface LessonFormData {
  course: string;
  name: string;
  youtube_url: string;
  order: number;
  is_active: boolean;
}

export interface QuestionFormData {
  course: string;
  text: string;
  options: string[];
  correct_option: number;
  order: number;
}

export interface CourseListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CourseListItem[];
}

export interface LessonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Lesson[];
}
