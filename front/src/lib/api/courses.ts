import { authFetch } from './authFetch';
import { API_URL } from '../config/config';
import type {
  Course,
  CourseListResponse,
  CourseFormData,
  Lesson,
  LessonFormData,
  LessonProgress,
  Question,
  QuestionPublic,
  QuestionFormData,
  CourseProgress,
  ExamSubmission,
  ExamResult,
  Certificate,
  CourseParticipantsResponse,
  ParticipantsFilters,
} from '@/types/course.types';

/**
 * Courses API Client
 */

const BASE_URL = `${API_URL}/api/v1`;

// ==================== COURSES ====================

export async function getCourses(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  sector?: string;
  tags?: string[];
  is_active?: string;
}): Promise<CourseListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.sector) queryParams.append('sector', params.sector);
  if (params?.tags && params.tags.length > 0) {
    params.tags.forEach((tag) => queryParams.append('tags', tag));
  }
  if (params?.is_active) queryParams.append('is_active', params.is_active);

  const url = `${BASE_URL}/courses/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar cursos');
  }

  return response.json();
}

export async function getCourse(id: string): Promise<Course> {
  const url = `${BASE_URL}/courses/${id}/`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar curso');
  }

  return response.json();
}

export async function createCourse(data: CourseFormData): Promise<Course> {
  const url = `${BASE_URL}/courses/`;

  const response = await authFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao criar curso');
  }

  return response.json();
}

export async function updateCourse(id: string, data: CourseFormData): Promise<Course> {
  const url = `${BASE_URL}/courses/${id}/`;

  const response = await authFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao atualizar curso');
  }

  return response.json();
}

export async function deleteCourse(id: string): Promise<void> {
  const url = `${BASE_URL}/courses/${id}/`;

  const response = await authFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao deletar curso');
  }
}

// ==================== COURSE PROGRESS ====================

export async function getCourseProgress(courseId: string): Promise<CourseProgress> {
  const url = `${BASE_URL}/courses/${courseId}/progress/`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar progresso do curso');
  }

  return response.json();
}

export async function getLessonsProgress(courseId: string): Promise<LessonProgress[]> {
  const url = `${BASE_URL}/courses/${courseId}/lessons_progress/`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar progresso das aulas');
  }

  return response.json();
}

// ==================== LESSONS ====================

export async function createLesson(data: LessonFormData): Promise<Lesson> {
  const url = `${BASE_URL}/lessons/`;

  const response = await authFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao criar aula');
  }

  return response.json();
}

export async function updateLesson(id: string, data: LessonFormData): Promise<Lesson> {
  const url = `${BASE_URL}/lessons/${id}/`;

  const response = await authFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao atualizar aula');
  }

  return response.json();
}

export async function deleteLesson(id: string): Promise<void> {
  const url = `${BASE_URL}/lessons/${id}/`;

  const response = await authFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao deletar aula');
  }
}

export async function completeLesson(lessonId: string): Promise<void> {
  const url = `${BASE_URL}/lessons/${lessonId}/complete/`;

  const response = await authFetch(url, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao marcar aula como concluída');
  }

  return response.json();
}

// ==================== QUESTIONS ====================

export async function createQuestion(data: QuestionFormData): Promise<Question> {
  const url = `${BASE_URL}/questions/`;

  const response = await authFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao criar questão');
  }

  return response.json();
}

export async function updateQuestion(id: string, data: QuestionFormData): Promise<Question> {
  const url = `${BASE_URL}/questions/${id}/`;

  const response = await authFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao atualizar questão');
  }

  return response.json();
}

export async function deleteQuestion(id: string): Promise<void> {
  const url = `${BASE_URL}/questions/${id}/`;

  const response = await authFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao deletar questão');
  }
}

// ==================== EXAM ====================

export async function getExam(courseId: string): Promise<QuestionPublic[]> {
  const url = `${BASE_URL}/courses/${courseId}/exam/`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar prova');
  }

  return response.json();
}

// Alias para melhor clareza
export const getExamQuestions = getExam;

export async function submitExam(courseId: string, submission: ExamSubmission): Promise<ExamResult> {
  const url = `${BASE_URL}/courses/${courseId}/submit_exam/`;

  const response = await authFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao submeter prova');
  }

  return response.json();
}

// ==================== NOTIFICATIONS ====================

export async function sendCourseNotification(courseId: string): Promise<{
  detail: string;
  recipient_count: number;
  scheduled: boolean;
  scheduled_for: string | null;
}> {
  const response = await authFetch(`${BASE_URL}/courses/${courseId}/send_notification/`, {
    method: 'POST',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Erro ao enviar notificação');
  }
  return response.json();
}

// ==================== PARTICIPANTS ====================

export async function getCourseParticipants(
  courseId: string,
  filters: Partial<ParticipantsFilters> = {}
): Promise<CourseParticipantsResponse> {
  const queryParams = new URLSearchParams();

  if (filters.search) queryParams.append('search', filters.search);
  if (filters.cpf) queryParams.append('cpf', filters.cpf);
  if (filters.sector) queryParams.append('sector', filters.sector);
  if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
  if (filters.ordering) queryParams.append('ordering', filters.ordering);
  if (filters.page) queryParams.append('page', filters.page.toString());
  if (filters.page_size) queryParams.append('page_size', filters.page_size.toString());

  const qs = queryParams.toString();
  const url = `${BASE_URL}/courses/${courseId}/participants/${qs ? `?${qs}` : ''}`;

  const response = await authFetch(url, { method: 'GET' });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Erro ao buscar participantes');
  }

  return response.json();
}

// ==================== SHARE / ACCESS ====================

export async function getSharedAdminsCourse(id: string): Promise<{ id: number; email: string; name: string }[]> {
  const response = await authFetch(`${BASE_URL}/courses/${id}/share/`, { method: 'GET' });
  if (!response.ok) throw new Error('Erro ao buscar administradores');
  const data = await response.json();
  return data.shared_admins;
}

export async function updateSharedAdminsCourse(
  id: string,
  payload: { add?: string[]; remove?: string[] }
): Promise<{ shared_admins: { id: number; email: string; name: string }[]; errors?: string[] }> {
  const response = await authFetch(`${BASE_URL}/courses/${id}/share/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Erro ao atualizar acesso');
  }
  return response.json();
}

// ==================== CERTIFICATES ====================

export async function getCertificates(): Promise<Certificate[]> {
  const url = `${BASE_URL}/certificates/`;

  const response = await authFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar certificados');
  }

  const data = await response.json();
  return data.results || data;
}

export async function generateCertificate(courseId: string): Promise<Certificate> {
  const url = `${BASE_URL}/certificates/generate/`;

  const response = await authFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ course_id: courseId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao gerar certificado');
  }

  return response.json();
}
