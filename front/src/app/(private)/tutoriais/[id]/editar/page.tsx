'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getTutorial,
  updateTutorial,
  createTutorialStep,
  updateTutorialStep,
  deleteTutorialStep,
  createTutorialMedia,
  deleteTutorialMedia,
} from '@/lib/api/tutorials';
import { getSectors } from '@/lib/api/sectors';
import { getTags } from '@/lib/api/tags';
import type { Sector } from '@/types/sector.types';
import type { Tag } from '@/types/tag.types';
import type { TutorialStep } from '@/types/tutorial.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronLeft, Plus, Trash2, GripVertical, ArrowDown,
  Image as ImageIcon, Video, Upload, X, Edit3, Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ImageAnnotationEditor from '@/components/forms/ImageAnnotationEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StepDraft {
  id?: string;                  // undefined = novo passo
  order: number;
  title: string;
  content: string;
  // mídia nova a subir
  image?: File | null;
  imagePreview?: string;
  youtube_url?: string;
  // mídia já existente no banco
  existingMediaId?: string;
  existingImageUrl?: string;
  existingVideoUrl?: string;
  removeExistingMedia?: boolean;
}

export default function EditarTutorialPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sector: '',
    tags: [] as string[],
    is_active: true,
  });

  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [deletedStepIds, setDeletedStepIds] = useState<string[]>([]);

  // Image editor
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string>('');

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [tutorial, sectorsData, tagsData] = await Promise.all([
        getTutorial(id),
        getSectors({ page_size: 100, is_active: 'true' }),
        getTags({ page_size: 100, is_active: 'true' }),
      ]);

      setSectors(sectorsData.results);
      setTags(tagsData.results);

      setFormData({
        title: tutorial.title,
        description: tutorial.description,
        sector: tutorial.sector,
        tags: tutorial.tags,
        is_active: tutorial.is_active,
      });

      // Map existing steps to drafts
      const drafts: StepDraft[] = tutorial.steps.map((s: TutorialStep) => {
        const imgMedia = s.media.find((m) => m.media_type === 'image');
        const vidMedia = s.media.find((m) => m.media_type === 'video_embed');
        return {
          id: s.id,
          order: s.order,
          title: s.title,
          content: s.content,
          existingMediaId: imgMedia?.id ?? vidMedia?.id,
          existingImageUrl: imgMedia?.file_url ?? undefined,
          existingVideoUrl: vidMedia?.embed_url ?? undefined,
          removeExistingMedia: false,
        };
      });

      setSteps(drafts.length > 0 ? drafts : [{ order: 0, title: '', content: '' }]);
    } catch {
      toast({ title: 'Erro ao carregar tutorial', variant: 'destructive' });
      router.push('/tutoriais');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step helpers ─────────────────────────────────────────────────────────

  const addStep = () => {
    setSteps((prev) => [...prev, { order: prev.length, title: '', content: '' }]);
  };

  const removeStep = (index: number) => {
    const step = steps[index];
    if (step.id) setDeletedStepIds((prev) => [...prev, step.id!]);
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
      return next;
    });
  };

  const updateStep = (index: number, field: keyof StepDraft, value: any) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleImageUpload = (index: number, file: File | null) => {
    if (!file) {
      updateStep(index, 'image', null);
      updateStep(index, 'imagePreview', '');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setSteps((prev) =>
        prev.map((s, i) =>
          i === index ? { ...s, image: file, imagePreview: reader.result as string } : s
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const openImageEditor = (index: number) => {
    const step = steps[index];
    const url = step.imagePreview || step.existingImageUrl || '';
    if (!url) return;
    setEditingImageIndex(index);
    setEditingImageUrl(url);
  };

  const handleSaveAnnotatedImage = (blob: Blob) => {
    if (editingImageIndex === null) return;
    const file = new File([blob], 'annotated-image.jpg', { type: 'image/jpeg' });
    setSteps((prev) =>
      prev.map((s, i) =>
        i === editingImageIndex
          ? { ...s, image: file, imagePreview: URL.createObjectURL(blob), removeExistingMedia: true }
          : s
      )
    );
    setEditingImageIndex(null);
    setEditingImageUrl('');
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.sector) {
      toast({ title: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update tutorial metadata
      await updateTutorial(id, formData);

      // 2. Delete removed steps
      for (const stepId of deletedStepIds) {
        await deleteTutorialStep(stepId);
      }

      // 3. Create or update steps
      for (const step of steps) {
        if (!step.title && !step.content) continue;

        let stepId = step.id;

        if (stepId) {
          // Update existing step
          await updateTutorialStep(stepId, {
            order: step.order,
            title: step.title,
            content: step.content,
          });
        } else {
          // Create new step
          const created = await createTutorialStep({
            tutorial: id,
            order: step.order,
            title: step.title,
            content: step.content,
          });
          stepId = created.id;
        }

        // 4. Handle media for this step
        if (step.removeExistingMedia && step.existingMediaId) {
          await deleteTutorialMedia(step.existingMediaId);
        }

        if (step.image && stepId) {
          await createTutorialMedia({
            step: stepId,
            media_type: 'image',
            file: step.image,
            order: 1,
          });
        } else if (step.youtube_url && stepId && step.youtube_url !== step.existingVideoUrl) {
          if (step.existingMediaId && !step.removeExistingMedia) {
            await deleteTutorialMedia(step.existingMediaId);
          }
          await createTutorialMedia({
            step: stepId,
            media_type: 'video_embed',
            embed_url: step.youtube_url,
            order: 1,
          });
        }
      }

      toast({ title: 'Tutorial atualizado com sucesso!' });
      router.push(`/tutoriais/${id}`);
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao salvar tutorial', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          <div className="h-5 w-px bg-border" />
          <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="border rounded-xl p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push(`/tutoriais/${id}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Tutoriais
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Editar Tutorial</h1>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => router.push(`/tutoriais/${id}`)}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-tutorial-form" size="sm" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Salvando...</>
            ) : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      <form id="edit-tutorial-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Tutorial *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Como configurar o sistema"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o que será ensinado neste tutorial"
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Setor *</Label>
                <Select
                  value={formData.sector}
                  onValueChange={(v) => setFormData({ ...formData, sector: v })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tags (opcional)</Label>
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (!formData.tags.includes(v))
                      setFormData({ ...formData, tags: [...formData.tags, v] });
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Adicionar tags" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.tags.map((tagId) => {
                      const tag = tags.find((t) => t.id.toString() === tagId);
                      return tag ? (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tagId) })
                            }
                            className="hover:opacity-70 ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passos */}
        <Card>
          <CardHeader>
            <CardTitle>Passos do Tutorial</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione, edite ou remova os passos deste tutorial
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.id ?? index}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0" />
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Passo {index + 1}
                            {!step.id && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                Novo
                              </span>
                            )}
                          </span>
                          {steps.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStep(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Título do Passo</Label>
                          <Input
                            value={step.title}
                            onChange={(e) => updateStep(index, 'title', e.target.value)}
                            placeholder="Ex: Acessar o painel de controle"
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Descrição do Passo</Label>
                          <Textarea
                            value={step.content}
                            onChange={(e) => updateStep(index, 'content', e.target.value)}
                            placeholder="Descreva em detalhes o que deve ser feito neste passo..."
                            rows={5}
                            className="resize-none"
                          />
                        </div>

                        {/* Mídia */}
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                            Recursos Multimídia (Opcional)
                          </h4>

                          <Tabs
                            defaultValue={
                              step.existingImageUrl ? 'image'
                              : step.existingVideoUrl ? 'video'
                              : 'none'
                            }
                            className="w-full"
                          >
                            <TabsList className="grid w-full grid-cols-3 h-11">
                              <TabsTrigger value="none" className="gap-2">
                                <X className="h-4 w-4" /> Nenhum
                              </TabsTrigger>
                              <TabsTrigger value="image" className="gap-2">
                                <ImageIcon className="h-4 w-4" /> Imagem
                              </TabsTrigger>
                              <TabsTrigger value="video" className="gap-2">
                                <Video className="h-4 w-4" /> Vídeo
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="none" className="mt-4">
                              <div className="text-center py-8 text-sm text-muted-foreground">
                                Nenhum recurso multimídia neste passo
                              </div>
                            </TabsContent>

                            <TabsContent value="image" className="mt-4 space-y-3">
                              {/* Imagem existente (sem nova imagem carregada) */}
                              {step.existingImageUrl && !step.imagePreview && !step.removeExistingMedia && (
                                <div className="relative border rounded-lg overflow-hidden bg-muted/30">
                                  <img
                                    src={step.existingImageUrl}
                                    alt="Imagem atual"
                                    className="w-full max-h-64 object-contain"
                                  />
                                  <div className="absolute top-3 right-3 flex gap-2">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      className="bg-background/90 hover:bg-background shadow-lg"
                                      onClick={() => openImageEditor(index)}
                                    >
                                      <Edit3 className="h-4 w-4 mr-2" /> Anotar
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        updateStep(index, 'removeExistingMedia', true);
                                        updateStep(index, 'existingImageUrl', undefined);
                                      }}
                                    >
                                      <X className="h-4 w-4 mr-2" /> Remover
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Nova imagem carregada */}
                              {step.imagePreview && (
                                <div className="relative border rounded-lg overflow-hidden bg-muted/30">
                                  <img
                                    src={step.imagePreview}
                                    alt="Preview"
                                    className="w-full max-h-64 object-contain"
                                  />
                                  <div className="absolute top-3 right-3 flex gap-2">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      className="bg-background/90 hover:bg-background shadow-lg"
                                      onClick={() => openImageEditor(index)}
                                    >
                                      <Edit3 className="h-4 w-4 mr-2" /> Anotar
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        updateStep(index, 'image', null);
                                        updateStep(index, 'imagePreview', '');
                                      }}
                                    >
                                      <X className="h-4 w-4 mr-2" /> Remover
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Upload zone (quando não tem imagem) */}
                              {!step.imagePreview && (!step.existingImageUrl || step.removeExistingMedia) && (
                                <div className="relative">
                                  <input
                                    id={`image-${index}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(index, e.target.files?.[0] ?? null)}
                                  />
                                  <label
                                    htmlFor={`image-${index}`}
                                    className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all"
                                  >
                                    <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                                    <span className="text-base font-medium">Clique para adicionar imagem</span>
                                    <span className="text-sm text-muted-foreground">PNG, JPG, GIF até 5MB</span>
                                  </label>
                                </div>
                              )}
                            </TabsContent>

                            <TabsContent value="video" className="mt-4 space-y-3">
                              <div className="space-y-2">
                                <Label>URL do YouTube</Label>
                                <Input
                                  value={step.youtube_url ?? step.existingVideoUrl ?? ''}
                                  onChange={(e) => updateStep(index, 'youtube_url', e.target.value)}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="h-11"
                                />
                              </div>
                              {(step.youtube_url || step.existingVideoUrl) && (
                                <div className="border rounded-lg p-4 bg-muted/30 text-center">
                                  <Video className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                  <p className="text-sm text-muted-foreground">Vídeo será exibido aqui</p>
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {index < steps.length - 1 && (
                  <div className="flex justify-center py-4">
                    <ArrowDown className="h-6 w-6 text-muted-foreground animate-bounce" />
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4">
              <Button
                type="button"
                onClick={addStep}
                variant="outline"
                className="w-full border-dashed border-2 h-12 hover:bg-primary/5 hover:border-primary"
              >
                <Plus className="mr-2 h-5 w-5" />
                Adicionar Novo Passo
              </Button>
            </div>
          </CardContent>
        </Card>

      </form>

      <ImageAnnotationEditor
        isOpen={editingImageIndex !== null}
        imageUrl={editingImageUrl}
        onClose={() => { setEditingImageIndex(null); setEditingImageUrl(''); }}
        onSave={handleSaveAnnotatedImage}
      />
    </div>
  );
}
