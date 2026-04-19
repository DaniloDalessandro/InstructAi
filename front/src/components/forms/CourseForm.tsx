'use client';

import { useState, useEffect } from 'react';
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
import { SectorMultiSelect } from '@/components/manual/SectorMultiSelect';
import { TagMultiSelect } from '@/components/manual/TagMultiSelect';
import type { Sector } from '@/types/sector.types';
import type { Tag } from '@/types/tag.types';
import type { Course, CourseFormData } from '@/types/course.types';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LessonInput {
  name: string;
  youtube_url: string;
}

interface CourseFormProps {
  open: boolean;
  handleClose: () => void;
  initialData: Course | null;
  onSubmit: (data: CourseFormData, lessons: LessonInput[]) => Promise<void>;
}

export default function CourseForm({
  open,
  handleClose,
  initialData,
  onSubmit,
}: CourseFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [lessons, setLessons] = useState<LessonInput[]>([]);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    sector: string;
    tags: string[];
    has_final_exam: boolean;
    passing_score: number;
    workload_hours: number;
    exam_duration_minutes: number;
    is_active: boolean;
  }>({
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

  // Carrega setores e tags ao abrir o formulário
  useEffect(() => {
    if (open) {
      loadFormData();
    }
  }, [open]);

  // Reseta ou preenche o formulário conforme initialData ou fechamento do diálogo
  useEffect(() => {
    if (initialData && open) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        sector: initialData.sector || '',
        tags: initialData.tags || [],
        has_final_exam: initialData.has_final_exam || false,
        passing_score: initialData.passing_score || 70,
        workload_hours: initialData.workload_hours || 0,
        exam_duration_minutes: initialData.exam_duration_minutes || 60,
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
      });
    } else if (!open) {
      setFormData({
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
      setLessons([]);
    }
  }, [initialData, open]);

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

  const addLesson = () => {
    setLessons([...lessons, { name: '', youtube_url: '' }]);
  };

  const removeLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  const updateLesson = (index: number, field: keyof LessonInput, value: string) => {
    const updatedLessons = [...lessons];
    updatedLessons[index][field] = value;
    setLessons(updatedLessons);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
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
      const submitData: CourseFormData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sector: formData.sector,
        tags: formData.tags,
        has_final_exam: formData.has_final_exam,
        passing_score: formData.passing_score,
        workload_hours: formData.workload_hours,
        exam_duration_minutes: formData.exam_duration_minutes,
        is_active: formData.is_active,
      };

      await onSubmit(submitData, lessons);

      // Resetar formulário
      setFormData({
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
      setLessons([]);

      handleClose();
    } catch (error) {
      console.error('Erro ao salvar curso:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-primary">
              {initialData ? 'Editar Curso' : 'Novo Curso'}
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

              {/* Setor */}
              <div className="grid gap-2">
                <Label htmlFor="sector">Setor *</Label>
                <Select
                  value={formData.sector}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, sector: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um setor" />
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

              {/* Carga Horária */}
              <div className="grid gap-2">
                <Label htmlFor="workload_hours">Carga Horária (horas) *</Label>
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
                />
              </div>

              {/* Prova Final */}
              <div className="flex items-center space-x-2">
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
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Este curso possui prova final
                </Label>
              </div>

              {/* Nota Mínima (só aparece se tiver prova) */}
              {formData.has_final_exam && (
                <div className="grid gap-2">
                  <Label htmlFor="passing_score">
                    Nota Mínima para Aprovação (%)
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
                  />
                </div>
              )}

              {/* Aulas */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label>Aulas *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLesson}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Aula
                  </Button>
                </div>

                {lessons.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma aula adicionada. Clique em "Adicionar Aula" para começar.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lessons.map((lesson, index) => (
                      <div
                        key={index}
                        className="grid gap-3 p-4 border rounded-lg bg-muted/20"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Aula {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLesson(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`lesson-name-${index}`}>
                            Nome da Aula
                          </Label>
                          <Input
                            id={`lesson-name-${index}`}
                            type="text"
                            value={lesson.name}
                            onChange={(e) =>
                              updateLesson(index, 'name', e.target.value)
                            }
                            placeholder="Ex: Introdução ao tema"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`lesson-url-${index}`}>
                            URL do YouTube
                          </Label>
                          <Input
                            id={`lesson-url-${index}`}
                            type="url"
                            value={lesson.youtube_url}
                            onChange={(e) =>
                              updateLesson(index, 'youtube_url', e.target.value)
                            }
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || loadingData}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
