'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getCourse, getLessonsProgress, completeLesson, updateCourse, deleteCourse, createLesson, updateLesson, deleteLesson } from '@/lib/api/courses';
import { getSectors } from '@/lib/api/sectors';
import { getTags } from '@/lib/api/tags';
import type { Course, Lesson, LessonProgress, CourseFormData } from '@/types/course.types';
import type { Sector } from '@/types/sector.types';
import type { Tag } from '@/types/tag.types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  PlayCircle,
  Clock,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Settings,
  Users,
  BarChart2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { canEdit, canDelete, canManageAccess } from '@/lib/permissions';
import { ShareAccessDialog } from '@/components/shared/ShareAccessDialog';
import { getSharedAdminsCourse, updateSharedAdminsCourse } from '@/lib/api/courses';

interface CourseViewState {
  course: Course | null;
  lessonsProgress: LessonProgress[];
  isLoading: boolean;
  isCompletingLesson: boolean;
}

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.id as string;

  const [state, setState] = useState<CourseViewState>({
    course: null,
    lessonsProgress: [],
    isLoading: true,
    isCompletingLesson: false,
  });

  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [editForm, setEditForm] = useState<CourseFormData>({
    name: '',
    description: '',
    sector: '',
    tags: [],
    has_final_exam: false,
    passing_score: 70,
    workload_hours: 0,
    exam_duration_minutes: 60,
    is_active: true,
  });

  // Estados para gestão de aulas
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [showDeleteLessonDialog, setShowDeleteLessonDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    course: '',
    name: '',
    youtube_url: '',
    order: 0,
    is_active: true,
  });

  // Buscar dados do curso
  useEffect(() => {
    const fetchData = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        const [courseData, progressData] = await Promise.all([
          getCourse(courseId),
          getLessonsProgress(courseId),
        ]);

        setState((prev) => ({
          ...prev,
          course: courseData,
          lessonsProgress: progressData,
          isLoading: false,
        }));

        // Definir aula inicial a partir da URL ou primeira não concluída
        const lessonParam = searchParams.get('lesson');
        if (lessonParam) {
          setCurrentLessonIndex(parseInt(lessonParam, 10));
        } else {
          // Encontrar primeira aula não concluída
          const firstIncompleteIndex = progressData.findIndex((lp) => !lp.is_completed);
          setCurrentLessonIndex(firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0);
        }
      } catch (error) {
        console.error('Erro ao carregar curso:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o curso.',
          variant: 'destructive',
        });
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchData();
  }, [courseId]);

  // Atualizar URL quando mudar de aula
  useEffect(() => {
    if (!state.isLoading && state.course) {
      const url = new URL(window.location.href);
      url.searchParams.set('lesson', currentLessonIndex.toString());
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [currentLessonIndex, state.isLoading, state.course, router]);

  // Carregar setores e tags para edição
  useEffect(() => {
    const loadData = async () => {
      try {
        const [sectorsData, tagsData] = await Promise.all([
          getSectors({ page_size: 100, is_active: 'true' }),
          getTags({ page_size: 100, is_active: 'true' }),
        ]);
        setSectors(sectorsData.results);
        setTags(tagsData.results);
      } catch (error) {
        console.error('Erro ao carregar setores/tags:', error);
      }
    };
    loadData();
  }, []);

  const currentLesson = state.course?.lessons[currentLessonIndex] || null;
  const currentProgress = state.lessonsProgress[currentLessonIndex];

  const completedLessons = state.lessonsProgress.filter((lp) => lp.is_completed).length;
  const totalLessons = state.course?.lessons.length || 0;
  const courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  const handleLessonSelect = (index: number) => {
    setCurrentLessonIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousLesson = () => {
    if (currentLessonIndex > 0) {
      handleLessonSelect(currentLessonIndex - 1);
    }
  };

  const handleNextLesson = () => {
    if (currentLessonIndex < totalLessons - 1) {
      handleLessonSelect(currentLessonIndex + 1);
    }
  };

  const handleCompleteLesson = async () => {
    if (!currentLesson || !currentProgress) return;

    try {
      setState((prev) => ({ ...prev, isCompletingLesson: true }));

      await completeLesson(currentLesson.id);

      // Atualizar progresso local
      setState((prev) => ({
        ...prev,
        lessonsProgress: prev.lessonsProgress.map((lp) =>
          lp.lesson_id === currentLesson.id
            ? { ...lp, is_completed: true, completed_at: new Date().toISOString() }
            : lp
        ),
        isCompletingLesson: false,
      }));

      toast({
        title: 'Aula concluída!',
        description: 'Seu progresso foi salvo com sucesso.',
        variant: 'default',
      });

      // Avançar para próxima aula (se não for a última)
      if (currentLessonIndex < totalLessons - 1) {
        setTimeout(() => handleNextLesson(), 500);
      }
    } catch (error) {
      console.error('Erro ao marcar aula como concluída:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar a aula como concluída.',
        variant: 'destructive',
      });
      setState((prev) => ({ ...prev, isCompletingLesson: false }));
    }
  };

  // Funções de gerenciamento do curso
  const handleOpenEditDialog = () => {
    if (state.course) {
      setEditForm({
        name: state.course.name,
        description: state.course.description,
        sector: state.course.sector_detail.id.toString(),
        tags: state.course.tags_detail.map((t) => t.id.toString()),
        has_final_exam: state.course.has_final_exam,
        passing_score: state.course.passing_score,
        workload_hours: state.course.workload_hours,
        exam_duration_minutes: state.course.exam_duration_minutes,
        is_active: state.course.is_active,
      });
      setShowEditDialog(true);
    }
  };

  const handleSaveCourse = async () => {
    if (!state.course) return;

    try {
      setIsSubmitting(true);

      const updated = await updateCourse(state.course.id.toString(), editForm);

      setState((prev) => ({
        ...prev,
        course: updated,
      }));

      toast({
        title: 'Sucesso!',
        description: 'Curso atualizado com sucesso.',
      });

      setShowEditDialog(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o curso.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!state.course) return;

    try {
      setIsSubmitting(true);

      await deleteCourse(state.course.id.toString());

      toast({
        title: 'Curso excluído',
        description: 'O curso foi excluído com sucesso.',
      });

      router.push('/cursos');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o curso.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  // Funções de gerenciamento de aulas
  const handleOpenLessonDialog = (lesson?: Lesson) => {
    if (lesson) {
      // Editar aula existente
      setEditingLesson(lesson);
      setLessonForm({
        course: state.course!.id.toString(),
        name: lesson.name,
        youtube_url: lesson.youtube_url,
        order: lesson.order,
        is_active: lesson.is_active,
      });
    } else {
      // Nova aula
      setEditingLesson(null);
      const nextOrder = state.course?.lessons.length || 0;
      setLessonForm({
        course: state.course!.id.toString(),
        name: '',
        youtube_url: '',
        order: nextOrder,
        is_active: true,
      });
    }
    setShowLessonDialog(true);
  };

  const handleSaveLesson = async () => {
    if (!state.course) return;

    try {
      setIsSubmitting(true);

      if (editingLesson) {
        // Atualizar aula
        await updateLesson(editingLesson.id.toString(), lessonForm);
        toast({
          title: 'Sucesso!',
          description: 'Aula atualizada com sucesso.',
        });
      } else {
        // Criar nova aula
        await createLesson(lessonForm);
        toast({
          title: 'Sucesso!',
          description: 'Aula criada com sucesso.',
        });
      }

      // Recarregar dados do curso
      const updatedCourse = await getCourse(courseId);
      setState((prev) => ({ ...prev, course: updatedCourse }));

      setShowLessonDialog(false);
      setEditingLesson(null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar a aula.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!editingLesson) return;

    try {
      setIsSubmitting(true);

      await deleteLesson(editingLesson.id.toString());

      toast({
        title: 'Aula excluída',
        description: 'A aula foi excluída com sucesso.',
      });

      // Recarregar dados do curso
      const updatedCourse = await getCourse(courseId);
      setState((prev) => ({ ...prev, course: updatedCourse }));

      setShowDeleteLessonDialog(false);
      setEditingLesson(null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir a aula.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  if (state.isLoading) {
    return <CoursePageSkeleton />;
  }

  if (!state.course) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Curso não encontrado</h2>
          <p className="mt-2 text-muted-foreground">
            O curso que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={() => router.push('/cursos')} className="mt-4">
            Voltar para Cursos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 animate-fade-in">
        {/* Header do Curso */}
        <div>
          <button
            onClick={() => router.push('/cursos')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Cursos
          </button>

          {/* Informações do Curso - Completas */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold flex-1">{state.course.name}</h1>

              {/* Botões de Gerenciamento */}
              {(canEdit(state.course) || canDelete(state.course) || canManageAccess(state.course)) && (
                <div className="flex gap-2">
                  {canManageAccess(state.course) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/cursos/${state.course!.id}/participantes`)}
                  >
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Participantes
                  </Button>
                  )}
                  {canManageAccess(state.course) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShareDialog(true)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Acesso
                  </Button>
                  )}
                  {canEdit(state.course) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenEditDialog}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  )}
                  {canDelete(state.course) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                  )}
                </div>
              )}
            </div>

            {/* Descrição */}
            <p className="text-muted-foreground leading-relaxed">
              {state.course.description}
            </p>

            {/* Setor e Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{state.course.sector_detail.name}</Badge>
              {state.course.tags_detail.map((tag) => (
                <Badge
                  key={tag.id}
                  style={{
                    backgroundColor: tag.color,
                    color: '#ffffff',
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>

            {/* Informações Adicionais */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{state.course.workload_hours}h de carga horária</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                <span>{totalLessons} aulas</span>
              </div>
              {state.course.has_final_exam && (
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4" />
                  <span>Prova final</span>
                </div>
              )}
            </div>

            {/* Progresso Geral */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progresso do Curso</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {completedLessons} de {totalLessons} aulas
                  </span>
                  <span className={cn(
                    'text-base font-bold tabular-nums',
                    courseProgress === 100 && 'text-green-600',
                    courseProgress > 0 && courseProgress < 100 && 'text-blue-600',
                    courseProgress === 0 && 'text-muted-foreground',
                  )}>
                    {Math.round(courseProgress)}%
                  </span>
                </div>
              </div>
              <Progress
                value={courseProgress}
                className={cn(
                  'h-3',
                  courseProgress === 100 && '[&>div]:bg-green-600',
                  courseProgress > 0 && courseProgress < 100 && '[&>div]:bg-blue-600',
                )}
              />
            </div>
          </div>
        </div>

        {/* Layout Principal */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
          {/* Área Principal - Player e Detalhes */}
          <div className="space-y-6">
            {/* Player de Vídeo */}
            <VideoPlayer
              videoId={currentLesson?.youtube_video_id || ''}
              title={currentLesson?.name || ''}
            />

            {/* Informações da Aula */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{currentLesson?.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aula {currentLessonIndex + 1} de {totalLessons}
                  </p>
                </div>
                {currentProgress?.is_completed && (
                  <Badge variant="default" className="bg-green-600">
                    <Check className="mr-1 h-3 w-3" />
                    Concluída
                  </Badge>
                )}
              </div>

              {/* Navegação entre Aulas */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handlePreviousLesson}
                  disabled={currentLessonIndex === 0}
                  variant="outline"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Aula Anterior
                </Button>

                {currentLesson && (!currentProgress || !currentProgress.is_completed) && (
                  <Button
                    onClick={handleCompleteLesson}
                    disabled={state.isCompletingLesson}
                    className="flex-1"
                  >
                    {state.isCompletingLesson ? (
                      'Salvando...'
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Marcar como Concluída
                      </>
                    )}
                  </Button>
                )}

                <Button
                  onClick={handleNextLesson}
                  disabled={currentLessonIndex === totalLessons - 1}
                  variant={currentProgress?.is_completed ? 'default' : 'outline'}
                >
                  Próxima Aula
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>

                {/* Botão de Prova Final - Só aparece se curso tem prova */}
                {state.course.has_final_exam && (
                  <Button
                    onClick={() => router.push(`/cursos/${state.course!.id}/prova`)}
                    disabled={completedLessons < totalLessons}
                    variant={completedLessons === totalLessons ? 'default' : 'outline'}
                    className={cn(
                      completedLessons === totalLessons && 'bg-green-600 hover:bg-green-700'
                    )}
                    title={completedLessons < totalLessons ? `Complete ${totalLessons - completedLessons} aula(s) restante(s)` : 'Clique para fazer a prova'}
                  >
                    <Award className="mr-2 h-4 w-4" />
                    Fazer Prova
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Lista de Aulas */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <LessonsSidebar
              lessons={state.course.lessons}
              lessonsProgress={state.lessonsProgress}
              currentLessonIndex={currentLessonIndex}
              onLessonSelect={handleLessonSelect}
              canManage={canEdit(state.course)}
              onAddLesson={() => handleOpenLessonDialog()}
              onEditLesson={handleOpenLessonDialog}
              onDeleteLesson={(lesson) => {
                setEditingLesson(lesson);
                setShowDeleteLessonDialog(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* Dialog de Edição do Curso */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Curso</DialogTitle>
            <DialogDescription>
              Atualize as informações do curso. Todos os campos são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Curso *</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Ex: Introdução ao Python"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descrição detalhada do curso"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sector">Setor *</Label>
                <Select
                  value={editForm.sector}
                  onValueChange={(value) => setEditForm({ ...editForm, sector: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id.toString()}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workload">Carga Horária (horas) *</Label>
                <Input
                  id="workload"
                  type="number"
                  value={editForm.workload_hours}
                  onChange={(e) => setEditForm({ ...editForm, workload_hours: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="has-exam">Possui Prova Final</Label>
                <p className="text-sm text-muted-foreground">
                  Ativar prova obrigatória para conclusão
                </p>
              </div>
              <Switch
                id="has-exam"
                checked={editForm.has_final_exam}
                onCheckedChange={(checked) => setEditForm({ ...editForm, has_final_exam: checked })}
              />
            </div>

            {editForm.has_final_exam && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passing-score">Nota Mínima (%)</Label>
                  <Input
                    id="passing-score"
                    type="number"
                    value={editForm.passing_score}
                    onChange={(e) => setEditForm({ ...editForm, passing_score: parseInt(e.target.value) || 70 })}
                    min="0"
                    max="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exam-duration">Duração da Prova (min)</Label>
                  <Input
                    id="exam-duration"
                    type="number"
                    value={editForm.exam_duration_minutes}
                    onChange={(e) => setEditForm({ ...editForm, exam_duration_minutes: parseInt(e.target.value) || 60 })}
                    min="1"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="is-active">Curso Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Desative para ocultar o curso dos usuários
                </p>
              </div>
              <Switch
                id="is-active"
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCourse} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Gerenciamento de Acesso */}
      <ShareAccessDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        resourceId={state.course?.id?.toString() ?? ""}
        resourceTitle={state.course?.name ?? ""}
        getAdmins={getSharedAdminsCourse}
        updateAdmins={updateSharedAdminsCourse}
      />

      {/* Dialog de Confirmação de Exclusão do Curso */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O curso "{state.course?.name}" e todas as suas aulas, questões e progressos dos alunos serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Excluindo...' : 'Excluir Curso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Edição/Criação de Aula */}
      <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingLesson ? 'Editar Aula' : 'Nova Aula'}
            </DialogTitle>
            <DialogDescription>
              {editingLesson
                ? 'Atualize as informações da aula.'
                : 'Adicione uma nova aula ao curso.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-name">Nome da Aula *</Label>
              <Input
                id="lesson-name"
                value={lessonForm.name}
                onChange={(e) => setLessonForm({ ...lessonForm, name: e.target.value })}
                placeholder="Ex: Introdução aos conceitos básicos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube-url">URL do YouTube *</Label>
              <Input
                id="youtube-url"
                value={lessonForm.youtube_url}
                onChange={(e) => setLessonForm({ ...lessonForm, youtube_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-muted-foreground">
                Cole o link completo do vídeo do YouTube
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lesson-order">Ordem da Aula *</Label>
              <Input
                id="lesson-order"
                type="number"
                value={lessonForm.order}
                onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 0 })}
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Posição da aula na sequência do curso (0 = primeira)
              </p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="lesson-active">Aula Ativa</Label>
                <p className="text-sm text-muted-foreground">
                  Desative para ocultar a aula dos alunos
                </p>
              </div>
              <Switch
                id="lesson-active"
                checked={lessonForm.is_active}
                onCheckedChange={(checked) => setLessonForm({ ...lessonForm, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLessonDialog(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLesson} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : editingLesson ? 'Salvar Alterações' : 'Criar Aula'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão da Aula */}
      <AlertDialog open={showDeleteLessonDialog} onOpenChange={setShowDeleteLessonDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Aula?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A aula "{editingLesson?.name}" e o progresso dos alunos nesta aula serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLesson}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Excluindo...' : 'Excluir Aula'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Componente: Player de Vídeo
function VideoPlayer({ videoId, title }: { videoId: string; title: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!videoId) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-muted border">
        <div className="text-center">
          <PlayCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <p className="mt-2 text-sm text-muted-foreground">Vídeo não disponível</p>
          <p className="mt-1 text-xs text-muted-foreground">O ID do vídeo não foi encontrado</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-muted border">
        <div className="text-center px-4">
          <PlayCircle className="mx-auto h-12 w-12 text-destructive opacity-50" />
          <p className="mt-2 text-sm font-medium text-destructive">Erro ao carregar vídeo</p>
          <p className="mt-1 text-xs text-muted-foreground">
            O vídeo pode estar privado, indisponível ou foi removido do YouTube
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            ID do vídeo: {videoId}
          </p>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-primary hover:underline"
          >
            Tentar abrir no YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg bg-black shadow-lg">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-2 text-sm text-muted-foreground">Carregando vídeo...</p>
          </div>
        </div>
      )}
      <iframe
        width="100%"
        height="auto"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        className="aspect-video w-full"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}

// Componente: Sidebar de Aulas
function LessonsSidebar({
  lessons,
  lessonsProgress,
  currentLessonIndex,
  onLessonSelect,
  canManage = false,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}: {
  lessons: Lesson[];
  lessonsProgress: LessonProgress[];
  currentLessonIndex: number;
  onLessonSelect: (index: number) => void;
  canManage?: boolean;
  onAddLesson?: () => void;
  onEditLesson?: (lesson: Lesson) => void;
  onDeleteLesson?: (lesson: Lesson) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const completedCount = lessonsProgress.filter((lp) => lp.is_completed).length;

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between border-b p-4 text-left transition-colors hover:bg-muted/50 lg:cursor-default"
      >
        <div>
          <h3 className="font-semibold">Aulas do Curso</h3>
          <p className="text-sm text-muted-foreground">
            {completedCount} de {lessons.length} concluídas
          </p>
        </div>
        <div className="lg:hidden">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Botão Adicionar Aula - Apenas para criador */}
      {canManage && onAddLesson && (
        <div className="p-3 border-b">
          <Button
            onClick={onAddLesson}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Adicionar Aula
          </Button>
        </div>
      )}

      <div className={cn('lg:block', !isExpanded && 'hidden')}>
        <ScrollArea className="h-auto max-h-[500px] lg:h-[600px]">
          <div className="p-2">
            {lessons.map((lesson, index) => {
              const progress = lessonsProgress[index];
              const isCurrent = index === currentLessonIndex;
              const isCompleted = progress?.is_completed || false;

              return (
                <LessonListItem
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  isCurrent={isCurrent}
                  isCompleted={isCompleted}
                  onClick={() => {
                    onLessonSelect(index);
                    // Fechar sidebar em mobile após selecionar aula
                    if (window.innerWidth < 1024) {
                      setIsExpanded(false);
                    }
                  }}
                  canManage={canManage}
                  onEdit={onEditLesson}
                  onDelete={onDeleteLesson}
                />
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Componente: Item da Lista de Aulas
function LessonListItem({
  lesson,
  index,
  isCurrent,
  isCompleted,
  onClick,
  canManage = false,
  onEdit,
  onDelete,
}: {
  lesson: Lesson;
  index: number;
  isCurrent: boolean;
  isCompleted: boolean;
  onClick: () => void;
  canManage?: boolean;
  onEdit?: (lesson: Lesson) => void;
  onDelete?: (lesson: Lesson) => void;
}) {
  const thumbnailUrl = lesson.youtube_video_id
    ? `https://img.youtube.com/vi/${lesson.youtube_video_id}/mqdefault.jpg`
    : `https://via.placeholder.com/320x180/1f2937/9ca3af?text=${encodeURIComponent('Sem vídeo')}`;

  return (
    <div
      className={cn(
        'group relative w-full rounded-lg p-3 transition-all duration-200 hover:bg-muted',
        isCurrent && 'bg-primary/10 ring-2 ring-primary shadow-md'
      )}
    >
      <button
        onClick={onClick}
        className="flex gap-3 w-full text-left"
      >
        {/* Thumbnail */}
        <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded">
          <img
            src={thumbnailUrl}
            alt={lesson.name}
            className="h-full w-full object-cover"
          />
          {isCurrent && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <PlayCircle className="h-6 w-6 text-white" />
            </div>
          )}
          {isCompleted && !isCurrent && (
            <div className="absolute right-1 top-1 rounded-full bg-green-600 p-1">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Aula {index + 1}
            </span>
            {isCompleted && (
              <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
            )}
          </div>
          <h4
            className={cn(
              'mt-1 line-clamp-2 text-sm font-medium',
              isCurrent && 'text-primary'
            )}
          >
            {lesson.name}
          </h4>
        </div>
      </button>

      {/* Botões de Gestão - Apenas para criador */}
      {canManage && onEdit && onDelete && (
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(lesson);
            }}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(lesson);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Componente: Skeleton de Loading
function CoursePageSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-24" />

      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="border-b p-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
          <div className="p-2 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
