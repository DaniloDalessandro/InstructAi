'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSectors } from '@/lib/api/sectors';
import { getTags } from '@/lib/api/tags';
import { TagMultiSelect } from '@/components/manual/TagMultiSelect';
import type { Sector } from '@/types/sector.types';
import type { Tag } from '@/types/tag.types';
import type { Course, CourseFormData } from '@/types/course.types';
import { Loader2, Plus, Trash2, Check, ArrowLeft, ArrowRight, Edit2, X } from 'lucide-react';
import { createCourse, createLesson, createQuestion } from '@/lib/api/courses';
import { toast } from '@/hooks/use-toast';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';

interface LessonInput {
  name: string;
  youtube_url: string;
}

interface QuestionInput {
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
}

interface CourseStepperFormProps {
  open: boolean;
  handleClose: () => void;
  onSuccess: () => void;
}

export default function CourseStepperForm({
  open,
  handleClose,
  onSuccess,
}: CourseStepperFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonInput[]>([]);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  // Estado para gerenciamento de aulas (Step 2)
  const [editingLessonIndex, setEditingLessonIndex] = useState<number | null>(null);
  const [currentLesson, setCurrentLesson] = useState<LessonInput>({
    name: '',
    youtube_url: '',
  });

  // Estado para gerenciamento de questões (Step 3)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionInput>({
    text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A',
  });
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    sector: string;
    tags: string[];
    has_final_exam: boolean;
    passing_score: number;
    workload_hours: number;
    exam_duration_minutes: number;
  }>({
    name: '',
    description: '',
    sector: '',
    tags: [],
    has_final_exam: false,
    passing_score: 70,
    workload_hours: 0,
    exam_duration_minutes: 60,
  });

  // Load sectors and tags
  useEffect(() => {
    if (open) {
      loadFormData();
    }
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setCreatedCourseId(null);
      setFormData({
        name: '',
        description: '',
        sector: '',
        tags: [],
        has_final_exam: false,
        passing_score: 70,
        workload_hours: 0,
        exam_duration_minutes: 60,
      });
      setLessons([]);
      setQuestions([]);
      setEditingLessonIndex(null);
      setCurrentLesson({ name: '', youtube_url: '' });
      setEditingQuestionIndex(null);
      setCurrentQuestion({
        text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
      });
    }
  }, [open]);

  const loadFormData = async () => {
    setLoadingData(true);
    try {
      const [sectorsData, tagsData] = await Promise.all([
        getSectors({ page_size: 100, is_active: 'true' }),
        getTags({ page_size: 100, is_active: 'true' }),
      ]);

      setSectors(sectorsData.results);
      setTags(tagsData.results);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  // Funções de gerenciamento de aulas (Step 2)
  const handleAddLesson = () => {
    if (!currentLesson.name.trim() || !currentLesson.youtube_url.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o título e o link do vídeo',
        variant: 'destructive',
      });
      return;
    }
    setLessons([...lessons, currentLesson]);
    setCurrentLesson({ name: '', youtube_url: '' });
    toast({
      title: 'Sucesso',
      description: 'Aula adicionada com sucesso',
    });
  };

  const handleEditLesson = (index: number) => {
    setEditingLessonIndex(index);
    setCurrentLesson(lessons[index]);
  };

  const handleUpdateLesson = () => {
    if (!currentLesson.name.trim() || !currentLesson.youtube_url.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o título e o link do vídeo',
        variant: 'destructive',
      });
      return;
    }
    const updatedLessons = [...lessons];
    updatedLessons[editingLessonIndex!] = currentLesson;
    setLessons(updatedLessons);
    setEditingLessonIndex(null);
    setCurrentLesson({ name: '', youtube_url: '' });
    toast({
      title: 'Sucesso',
      description: 'Aula atualizada com sucesso',
    });
  };

  const handleCancelEdit = () => {
    setEditingLessonIndex(null);
    setCurrentLesson({ name: '', youtube_url: '' });
  };

  const handleDeleteLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
    if (editingLessonIndex === index) {
      handleCancelEdit();
    }
    toast({
      title: 'Sucesso',
      description: 'Aula excluída com sucesso',
    });
  };

  // Funções de gerenciamento de questões (Step 3)
  const handleAddQuestion = () => {
    if (!currentQuestion.text.trim() ||
        !currentQuestion.option_a.trim() ||
        !currentQuestion.option_b.trim() ||
        !currentQuestion.option_c.trim() ||
        !currentQuestion.option_d.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o enunciado e todas as alternativas',
        variant: 'destructive',
      });
      return;
    }
    setQuestions([...questions, currentQuestion]);
    setCurrentQuestion({
      text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'A',
    });
    toast({
      title: 'Sucesso',
      description: 'Questão adicionada com sucesso',
    });
  };

  const handleEditQuestion = (index: number) => {
    setEditingQuestionIndex(index);
    setCurrentQuestion(questions[index]);
  };

  const handleUpdateQuestion = () => {
    if (!currentQuestion.text.trim() ||
        !currentQuestion.option_a.trim() ||
        !currentQuestion.option_b.trim() ||
        !currentQuestion.option_c.trim() ||
        !currentQuestion.option_d.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o enunciado e todas as alternativas',
        variant: 'destructive',
      });
      return;
    }
    const updatedQuestions = [...questions];
    updatedQuestions[editingQuestionIndex!] = currentQuestion;
    setQuestions(updatedQuestions);
    setEditingQuestionIndex(null);
    setCurrentQuestion({
      text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'A',
    });
    toast({
      title: 'Sucesso',
      description: 'Questão atualizada com sucesso',
    });
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionIndex(null);
    setCurrentQuestion({
      text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'A',
    });
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
    if (editingQuestionIndex === index) {
      handleCancelEditQuestion();
    }
    toast({
      title: 'Sucesso',
      description: 'Questão excluída com sucesso',
    });
  };

  const handleSaveStep1 = async () => {
    // Se já existe um curso criado, apenas avançar para o Step 2
    if (createdCourseId) {
      setCurrentStep(2);
      return;
    }

    // Validações básicas
    if (!formData.name.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Nome do curso é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Descrição é obrigatória',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.sector) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione um setor',
        variant: 'destructive',
      });
      return;
    }

    if (formData.tags.length === 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione pelo menos uma tag',
        variant: 'destructive',
      });
      return;
    }

    if (formData.workload_hours <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Carga horária deve ser maior que zero',
        variant: 'destructive',
      });
      return;
    }

    // Validações condicionais - Só validar se o curso tiver prova
    if (formData.has_final_exam) {
      if (formData.passing_score < 0 || formData.passing_score > 100) {
        toast({
          title: 'Valor inválido',
          description: 'Nota mínima deve estar entre 0 e 100',
          variant: 'destructive',
        });
        return;
      }

      if (formData.exam_duration_minutes <= 0 || formData.exam_duration_minutes > 300) {
        toast({
          title: 'Valor inválido',
          description: 'Duração da prova deve estar entre 1 e 300 minutos',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const submitData: CourseFormData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sector: formData.sector,
        tags: formData.tags,
        has_final_exam: formData.has_final_exam,
        passing_score: formData.has_final_exam ? formData.passing_score : 70,
        workload_hours: formData.workload_hours,
        exam_duration_minutes: formData.has_final_exam ? formData.exam_duration_minutes : 60,
        is_active: true,
      };

      const course = await createCourse(submitData);
      setCreatedCourseId(course.id);

      toast({
        title: 'Sucesso',
        description: 'Informações do curso salvas com sucesso',
      });

      // Avançar automaticamente para o Step 2
      setCurrentStep(2);
    } catch (error: any) {
      console.error('Erro ao salvar curso:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao salvar curso',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToStep2 = () => {
    if (!createdCourseId) {
      toast({
        title: 'Atenção',
        description: 'É necessário salvar o curso antes de cadastrar aulas',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep(2);
  };

  const handleSaveStep2 = async () => {
    // Validar aulas
    if (lessons.length === 0) {
      toast({
        title: 'Validação',
        description: 'Adicione pelo menos uma aula',
        variant: 'destructive',
      });
      return;
    }

    for (let i = 0; i < lessons.length; i++) {
      if (!lessons[i].name.trim()) {
        toast({
          title: 'Validação',
          description: `Nome da aula ${i + 1} é obrigatório`,
          variant: 'destructive',
        });
        return;
      }
      if (!lessons[i].youtube_url.trim()) {
        toast({
          title: 'Validação',
          description: `URL do YouTube da aula ${i + 1} é obrigatório`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Criar as aulas
      const lessonPromises = lessons.map((lesson, index) =>
        createLesson({
          course: createdCourseId!,
          name: lesson.name,
          youtube_url: lesson.youtube_url,
          order: index + 1,
          is_active: true,
        })
      );

      await Promise.all(lessonPromises);

      toast({
        title: 'Sucesso',
        description: 'Aulas cadastradas com sucesso',
      });

      // Se o curso tem prova final, ir para step 3
      if (formData.has_final_exam) {
        setCurrentStep(3);
      } else {
        // Caso contrário, finalizar
        onSuccess();
        handleClose();
      }
    } catch (error: any) {
      console.error('Erro ao salvar aulas:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao salvar aulas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStep3 = async () => {
    // Validar questões
    if (questions.length === 0) {
      toast({
        title: 'Validação',
        description: 'Adicione pelo menos uma questão para a prova',
        variant: 'destructive',
      });
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        toast({
          title: 'Validação',
          description: `Texto da questão ${i + 1} é obrigatório`,
          variant: 'destructive',
        });
        return;
      }
      if (!q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) {
        toast({
          title: 'Validação',
          description: `Todas as opções da questão ${i + 1} são obrigatórias`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Criar as questões
      const questionPromises = questions.map((question, index) =>
        createQuestion({
          course: createdCourseId!,
          text: question.text,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          correct_option: question.correct_option,
          order: index + 1,
        })
      );

      await Promise.all(questionPromises);

      toast({
        title: 'Sucesso',
        description: 'Questões da prova cadastradas com sucesso',
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Erro ao salvar questões:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao salvar questões',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const canGoToStep = (step: number) => {
      // Pode ir para qualquer etapa já visitada ou a atual
      if (step === 1) return true; // Sempre pode voltar para step 1
      if (step === 2) return createdCourseId !== null; // Só pode ir para step 2 se já criou o curso
      if (step === 3) return formData.has_final_exam && lessons.length > 0; // Só pode ir para step 3 se tiver prova e aulas
      return false;
    };

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {/* Step 1 */}
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => canGoToStep(1) && setCurrentStep(1)}
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
              currentStep === 1
                ? 'bg-primary text-primary-foreground'
                : 'bg-green-500 text-white group-hover:scale-110'
            }`}
          >
            {currentStep > 1 ? <Check className="h-4 w-4" /> : '1'}
          </div>
          <span className="text-sm font-medium group-hover:text-primary transition-colors">
            Informações do Curso
          </span>
        </div>

        <div className="w-12 h-0.5 bg-border" />

        {/* Step 2 */}
        <div
          className={`flex items-center gap-2 ${
            canGoToStep(2) ? 'cursor-pointer group' : 'cursor-not-allowed opacity-50'
          }`}
          onClick={() => canGoToStep(2) && setCurrentStep(2)}
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
              currentStep === 2
                ? 'bg-primary text-primary-foreground'
                : currentStep > 2
                ? 'bg-green-500 text-white group-hover:scale-110'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {currentStep > 2 ? <Check className="h-4 w-4" /> : '2'}
          </div>
          <span className={`text-sm font-medium ${
            canGoToStep(2) ? 'group-hover:text-primary transition-colors' : ''
          }`}>
            Cadastro de Aulas
          </span>
        </div>

        {formData.has_final_exam && (
          <>
            <div className="w-12 h-0.5 bg-border" />

            {/* Step 3 */}
            <div
              className={`flex items-center gap-2 ${
                canGoToStep(3) ? 'cursor-pointer group' : 'cursor-not-allowed opacity-50'
              }`}
              onClick={() => canGoToStep(3) && setCurrentStep(3)}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                  currentStep === 3
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground group-hover:bg-primary/80 group-hover:text-white'
                }`}
              >
                3
              </div>
              <span className={`text-sm font-medium ${
                canGoToStep(3) ? 'group-hover:text-primary transition-colors' : ''
              }`}>
                Questões da Prova
              </span>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="grid gap-6 py-6">
      {/* Nome */}
      <div className="grid gap-2">
        <Label htmlFor="name">Nome do Curso *</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
          placeholder="Digite o nome do curso"
          className="h-10"
        />
      </div>

      {/* Descrição */}
      <div className="grid gap-2">
        <Label htmlFor="description">Descrição *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
          required
          placeholder="Descreva o conteúdo do curso"
          rows={4}
        />
      </div>

      {/* Tags */}
      <div className="grid gap-2">
        <Label htmlFor="tags">Tags *</Label>
        <TagMultiSelect
          tags={tags}
          selectedTagIds={formData.tags}
          onSelectionChange={(tagIds) =>
            setFormData((prev) => ({ ...prev, tags: tagIds }))
          }
          placeholder="Selecione pelo menos uma tag..."
        />
      </div>

      {/* Checkbox Prova Final */}
      <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/30">
        <Checkbox
          id="has_final_exam"
          checked={formData.has_final_exam}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({
              ...prev,
              has_final_exam: checked as boolean,
            }))
          }
        />
        <Label
          htmlFor="has_final_exam"
          className="text-sm font-medium leading-none cursor-pointer"
        >
          Este curso possui prova final
        </Label>
      </div>

      {/* Linha com 4 campos: Setor, Carga Horária, Nota Mínima, Duração da Prova */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Setor */}
        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="sector">Setor *</Label>
          <Select
            value={formData.sector}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, sector: value }))
            }
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((sector) => (
                <SelectItem key={sector.id} value={sector.id}>
                  {sector.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Carga Horária */}
        <div className="grid gap-2">
          <Label htmlFor="workload_hours">Carga Horária (h) *</Label>
          <Input
            id="workload_hours"
            type="number"
            min="1"
            value={formData.workload_hours}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                workload_hours: parseInt(e.target.value) || 0,
              }))
            }
            required
            placeholder="Ex: 40"
            className="h-10"
          />
        </div>

        {/* Nota Mínima - Condicional */}
        <div className="grid gap-2">
          <Label
            htmlFor="passing_score"
            className={!formData.has_final_exam ? 'text-muted-foreground' : ''}
          >
            Nota Mínima (%) {formData.has_final_exam && '*'}
          </Label>
          <Input
            id="passing_score"
            type="number"
            min="0"
            max="100"
            value={formData.passing_score}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                passing_score: parseInt(e.target.value) || 70,
              }))
            }
            placeholder="Ex: 70"
            disabled={!formData.has_final_exam}
            className="h-10"
          />
        </div>

        {/* Duração da Prova - Condicional */}
        <div className="grid gap-2">
          <Label
            htmlFor="exam_duration_minutes"
            className={!formData.has_final_exam ? 'text-muted-foreground' : ''}
          >
            Duração (min) {formData.has_final_exam && '*'}
          </Label>
          <Input
            id="exam_duration_minutes"
            type="number"
            min="1"
            max="300"
            value={formData.exam_duration_minutes}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                exam_duration_minutes: parseInt(e.target.value) || 60,
              }))
            }
            placeholder="Ex: 60"
            disabled={!formData.has_final_exam}
            className="h-10"
          />
        </div>
      </div>

      {/* Texto de ajuda para campos de prova */}
      {formData.has_final_exam && (
        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
          <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
            ℹ️ Configuração da Avaliação
          </p>
          <p className="text-blue-800 dark:text-blue-200">
            A <strong>nota mínima</strong> define o percentual necessário para aprovação.
            A <strong>duração da prova</strong> será exibida como cronômetro regressivo durante a avaliação.
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => {
    const currentVideoId = extractYouTubeVideoId(currentLesson.youtube_url);
    const currentThumbnailUrl = currentVideoId
      ? `https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg`
      : null;

    return (
      <div className="flex-1 min-h-0 py-4 overflow-hidden flex flex-col">
        {/* Layout de 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0 overflow-hidden">
          {/* COLUNA ESQUERDA (40%) - Formulário + Preview */}
          <div className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 mb-4">
              <h3 className="text-lg font-medium">
                {editingLessonIndex !== null ? 'Editar Aula' : 'Nova Aula'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {editingLessonIndex !== null
                  ? `Editando: Aula ${editingLessonIndex + 1}`
                  : 'Preencha os dados da aula'}
              </p>
            </div>

            {/* Formulário */}
            <div className="flex-shrink-0 space-y-4 mb-4">
              <div className="grid gap-2">
                <Label htmlFor="current-lesson-name">Título da Aula *</Label>
                <Input
                  id="current-lesson-name"
                  type="text"
                  value={currentLesson.name}
                  onChange={(e) =>
                    setCurrentLesson({ ...currentLesson, name: e.target.value })
                  }
                  placeholder="Ex: Introdução ao tema"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="current-lesson-url">
                  Link do Vídeo YouTube *
                </Label>
                <Input
                  id="current-lesson-url"
                  type="url"
                  value={currentLesson.youtube_url}
                  onChange={(e) =>
                    setCurrentLesson({
                      ...currentLesson,
                      youtube_url: e.target.value,
                    })
                  }
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            </div>

            {/* Preview do Vídeo */}
            <div className="flex-shrink-0 space-y-2 mb-4">
              <Label>Preview</Label>
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center border">
                {currentThumbnailUrl ? (
                  <Image
                    src={currentThumbnailUrl}
                    alt={currentLesson.name || 'Preview da aula'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground text-center px-4">
                    {currentLesson.youtube_url
                      ? 'URL de vídeo inválida'
                      : 'Adicione uma URL do YouTube para ver o preview'}
                  </div>
                )}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex-shrink-0 flex gap-2">
              {editingLessonIndex !== null ? (
                <>
                  <Button
                    type="button"
                    onClick={handleUpdateLesson}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Atualizar Aula
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={handleAddLesson}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Aula
                </Button>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA (60%) - Lista de Aulas */}
          <div className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
            {/* Header da Lista - Fixo */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-medium">
                  Aulas Cadastradas ({lessons.length})
                </h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie as aulas do curso
                </p>
              </div>
            </div>

            {/* Lista de Aulas - Scrollável */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              {lessons.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/30">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-8 w-8 text-primary/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Nenhuma aula cadastrada
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Adicione a primeira aula usando o formulário ao lado
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const videoId = extractYouTubeVideoId(lesson.youtube_url);
                  const thumbnailUrl = videoId
                    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                    : null;
                  const isEditing = editingLessonIndex === index;

                  return (
                    <div
                      key={index}
                      className={`flex gap-4 p-4 border rounded-lg bg-card hover:bg-accent/30 transition-all ${
                        isEditing ? 'ring-2 ring-primary shadow-md' : ''
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        <div className="relative w-32 h-20 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                          {thumbnailUrl ? (
                            <Image
                              src={thumbnailUrl}
                              alt={lesson.name || `Aula ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="128px"
                            />
                          ) : (
                            <div className="text-xs text-muted-foreground text-center px-2">
                              Sem preview
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Informações da Aula */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-primary mb-1">
                              Aula {index + 1}
                            </p>
                            <h4 className="text-sm font-semibold truncate">
                              {lesson.name || 'Sem título'}
                            </h4>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {lesson.youtube_url}
                        </p>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLesson(index)}
                          disabled={isEditing}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteLesson(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const getOptionLabel = (option: 'A' | 'B' | 'C' | 'D') => {
      switch (option) {
        case 'A': return currentQuestion.option_a;
        case 'B': return currentQuestion.option_b;
        case 'C': return currentQuestion.option_c;
        case 'D': return currentQuestion.option_d;
      }
    };

    return (
      <div className="py-6">
        {/* Layout de 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* COLUNA ESQUERDA (40%) - Formulário + Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <h3 className="text-lg font-medium">
                {editingQuestionIndex !== null ? 'Editar Questão' : 'Nova Questão'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {editingQuestionIndex !== null
                  ? `Editando: Questão ${editingQuestionIndex + 1}`
                  : 'Preencha os dados da questão'}
              </p>
            </div>

            {/* Formulário */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-question-text">Enunciado da Questão *</Label>
                <Textarea
                  id="current-question-text"
                  value={currentQuestion.text}
                  onChange={(e) =>
                    setCurrentQuestion({ ...currentQuestion, text: e.target.value })
                  }
                  placeholder="Digite o enunciado da questão..."
                  rows={4}
                />
              </div>

              <div className="grid gap-3">
                <Label>Alternativas *</Label>

                <div className="grid gap-2">
                  <Label htmlFor="current-option-a" className="text-sm">Opção A</Label>
                  <Input
                    id="current-option-a"
                    type="text"
                    value={currentQuestion.option_a}
                    onChange={(e) =>
                      setCurrentQuestion({ ...currentQuestion, option_a: e.target.value })
                    }
                    placeholder="Digite a opção A"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="current-option-b" className="text-sm">Opção B</Label>
                  <Input
                    id="current-option-b"
                    type="text"
                    value={currentQuestion.option_b}
                    onChange={(e) =>
                      setCurrentQuestion({ ...currentQuestion, option_b: e.target.value })
                    }
                    placeholder="Digite a opção B"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="current-option-c" className="text-sm">Opção C</Label>
                  <Input
                    id="current-option-c"
                    type="text"
                    value={currentQuestion.option_c}
                    onChange={(e) =>
                      setCurrentQuestion({ ...currentQuestion, option_c: e.target.value })
                    }
                    placeholder="Digite a opção C"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="current-option-d" className="text-sm">Opção D</Label>
                  <Input
                    id="current-option-d"
                    type="text"
                    value={currentQuestion.option_d}
                    onChange={(e) =>
                      setCurrentQuestion({ ...currentQuestion, option_d: e.target.value })
                    }
                    placeholder="Digite a opção D"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Resposta Correta *</Label>
                <RadioGroup
                  value={currentQuestion.correct_option}
                  onValueChange={(value) =>
                    setCurrentQuestion({ ...currentQuestion, correct_option: value as 'A' | 'B' | 'C' | 'D' })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="A" id="current-correct-a" />
                    <Label htmlFor="current-correct-a">A</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="B" id="current-correct-b" />
                    <Label htmlFor="current-correct-b">B</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="C" id="current-correct-c" />
                    <Label htmlFor="current-correct-c">C</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="D" id="current-correct-d" />
                    <Label htmlFor="current-correct-d">D</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Preview da Questão */}
            {currentQuestion.text && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="font-medium text-sm mb-3">{currentQuestion.text}</p>
                  <div className="space-y-2">
                    {(['A', 'B', 'C', 'D'] as const).map((option) => {
                      const optionText = getOptionLabel(option);
                      const isCorrect = currentQuestion.correct_option === option;

                      return (
                        <div
                          key={option}
                          className={`flex items-start gap-2 p-2 rounded ${
                            isCorrect ? 'bg-green-100 dark:bg-green-900/30' : ''
                          }`}
                        >
                          <span className="font-medium text-xs">{option})</span>
                          <span className="text-xs flex-1">
                            {optionText || `Opção ${option} não preenchida`}
                          </span>
                          {isCorrect && (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-200 dark:bg-green-900/50 px-2 py-0.5 rounded">
                              Correta
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-2">
              {editingQuestionIndex !== null ? (
                <>
                  <Button
                    type="button"
                    onClick={handleUpdateQuestion}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Atualizar Questão
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEditQuestion}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Questão
                </Button>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA (60%) - Lista de Questões */}
          <div className="lg:col-span-3 space-y-4">
            {/* Header da Lista */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">
                  Questões Cadastradas ({questions.length})
                </h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie as questões da prova
                </p>
              </div>
            </div>

            {/* Lista de Questões */}
            {questions.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/30">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-8 w-8 text-primary/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Nenhuma questão cadastrada
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Adicione a primeira questão usando o formulário ao lado
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {questions.map((question, index) => {
                  const isEditing = editingQuestionIndex === index;

                  return (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg bg-card hover:bg-accent/30 transition-all ${
                        isEditing ? 'ring-2 ring-primary shadow-md' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Conteúdo da Questão */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-xs font-medium text-primary">
                              Questão {index + 1}
                            </p>
                            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                              Resposta: {question.correct_option}
                            </span>
                          </div>
                          <p className="text-sm font-medium line-clamp-2 mb-3">
                            {question.text || 'Sem enunciado'}
                          </p>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              <span className="font-medium">A)</span> {question.option_a || 'Não preenchida'}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              <span className="font-medium">B)</span> {question.option_b || 'Não preenchida'}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              <span className="font-medium">C)</span> {question.option_c || 'Não preenchida'}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              <span className="font-medium">D)</span> {question.option_d || 'Não preenchida'}
                            </p>
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditQuestion(index)}
                            disabled={isEditing}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuestion(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1000px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary">
            Novo Curso
          </DialogTitle>
          <hr className="mt-2 border-b border-gray-200" />
        </DialogHeader>

        {loadingData ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">
              Carregando formulário...
            </div>
          </div>
        ) : (
          <>
            {renderStepIndicator()}

            <div className={`flex-1 min-h-0 ${currentStep === 2 ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </div>

            <DialogFooter className="flex justify-between gap-2">
              {currentStep === 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <div className="flex gap-2">
                    {createdCourseId ? (
                      <Button
                        type="button"
                        onClick={handleGoToStep2}
                        disabled={isLoading}
                      >
                        Ir para Cadastro de Aulas
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleSaveStep1}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar e Continuar'
                        )}
                      </Button>
                    )}
                  </div>
                </>
              ) : currentStep === 2 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    disabled={isLoading}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveStep2}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : formData.has_final_exam ? (
                      <>
                        Salvar e Continuar
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Finalizar Cadastro
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    disabled={isLoading}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveStep3}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Finalizar Cadastro
                      </>
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
