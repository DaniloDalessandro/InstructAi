'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createTutorial,
  createTutorialStep,
  updateTutorialStep,
  deleteTutorialStep,
} from '@/lib/api/tutorials';
import { getSectors } from '@/lib/api/sectors';
import { getTags } from '@/lib/api/tags';
import type { Sector } from '@/types/sector.types';
import type { Tag } from '@/types/tag.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Image as ImageIcon,
  Video,
  Upload,
  X,
  Edit3,
  Loader2,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ImageAnnotationEditor from '@/components/forms/ImageAnnotationEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Step {
  id?: string;
  order: number;
  title: string;
  content: string;
  image?: File | null;
  imagePreview?: string;
  youtube_url?: string;
}

export default function NovoTutorialPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sector: '',
    tags: [] as string[],
    is_active: true,
  });

  const [steps, setSteps] = useState<Step[]>([
    { order: 0, title: '', content: '', image: null, imagePreview: '', youtube_url: '' },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sectorsData, tagsData] = await Promise.all([
        getSectors({ page_size: 100, is_active: 'true' }),
        getTags({ page_size: 100, is_active: 'true' }),
      ]);
      setSectors(sectorsData.results);
      setTags(tagsData.results);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleAddStep = () => {
    setSteps([...steps, { order: steps.length, title: '', content: '', image: null, imagePreview: '', youtube_url: '' }]);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    newSteps.forEach((step, i) => {
      step.order = i;
    });
    setSteps(newSteps);
  };

  const handleStepChange = (index: number, field: 'title' | 'content' | 'youtube_url', value: string) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const handleImageUpload = (index: number, file: File | null) => {
    const newSteps = [...steps];
    if (file) {
      newSteps[index].image = file;
      const reader = new FileReader();
      reader.onloadend = () => {
        newSteps[index].imagePreview = reader.result as string;
        setSteps([...newSteps]);
      };
      reader.readAsDataURL(file);
    } else {
      newSteps[index].image = null;
      newSteps[index].imagePreview = '';
      setSteps(newSteps);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newSteps = [...steps];
    newSteps[index].image = null;
    newSteps[index].imagePreview = '';
    setSteps(newSteps);
  };

  const openImageEditor = (index: number) => {
    const step = steps[index];
    if (!step.imagePreview) return;
    setEditingImageIndex(index);
    setEditingImageUrl(step.imagePreview);
  };

  const handleSaveAnnotatedImage = (blob: Blob) => {
    if (editingImageIndex === null) return;
    const newSteps = [...steps];
    newSteps[editingImageIndex].imagePreview = URL.createObjectURL(blob);
    newSteps[editingImageIndex].image = new File([blob], 'annotated-image.jpg', { type: 'image/jpeg' });
    setSteps(newSteps);
    setEditingImageIndex(null);
    setEditingImageUrl('');
  };

  const handleCloseEditor = () => {
    setEditingImageIndex(null);
    setEditingImageUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.sector) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const tutorial = await createTutorial(formData);

      for (const step of steps) {
        if (step.title && step.content) {
          await createTutorialStep({
            tutorial: tutorial.id,
            order: step.order,
            title: step.title,
            content: step.content,
          });
        }
      }

      toast({
        title: 'Sucesso!',
        description: 'Tutorial criado com sucesso.',
      });

      router.push(`/tutoriais/${tutorial.id}`);
    } catch (error: any) {
      console.error('Erro ao criar tutorial:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o tutorial.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derived data for preview
  const selectedSector = sectors.find((s) => s.id.toString() === formData.sector);
  const selectedTags = tags.filter((t) => formData.tags.includes(t.id.toString()));
  const stepsWithTitle = steps.filter((s) => s.title).length;

  const checks = [
    { label: 'Título preenchido', done: !!formData.title },
    { label: 'Descrição adicionada', done: !!formData.description },
    { label: 'Setor selecionado', done: !!formData.sector },
    {
      label: `${stepsWithTitle} de ${steps.length} passos com título`,
      done: steps.length > 0 && steps.every((s) => s.title),
    },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push('/tutoriais')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1.5"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Tutoriais
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Novo Tutorial</h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── Left column: form ── */}
        <div className="animate-in slide-in-from-left-4 duration-500">
          <form id="novo-tutorial-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Seção 01 — Informações do Tutorial */}
            <div className="rounded-2xl border bg-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold grid place-items-center shrink-0">
                  01
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight">Informações do Tutorial</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Dados principais que identificam o tutorial</p>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Título */}
              <div className="space-y-1.5">
                <Label htmlFor="title">
                  Título do Tutorial <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Como configurar o sistema"
                  className="h-11"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <Label htmlFor="description">
                  Descrição <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o que será ensinado neste tutorial"
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Setor + Tags em grid 2 colunas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="sector">
                    Setor <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.sector}
                    onValueChange={(value) => setFormData({ ...formData, sector: value })}
                  >
                    <SelectTrigger className="h-11">
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

                <div className="space-y-1.5">
                  <Label>
                    Tags <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (!formData.tags.includes(value)) {
                        setFormData({ ...formData, tags: [...formData.tags, value] });
                      }
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Adicionar tags" />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id.toString()}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {formData.tags.map((tagId) => {
                        const tag = tags.find((t) => t.id.toString() === tagId);
                        return tag ? (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tagId) })
                              }
                              className="hover:opacity-70 ml-0.5 leading-none"
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
            </div>

            {/* Seção 02 — Passos do Tutorial */}
            <div className="space-y-4">
              <div className="rounded-2xl border bg-card p-6 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold grid place-items-center shrink-0">
                    02
                  </div>
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">Passos do Tutorial</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Crie um guia passo a passo com texto, imagens e vídeos
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline de passos */}
              <div className="flex flex-col items-stretch">
                {steps.map((step, index) => (
                  <div key={index}>
                    {/* Conector entre passos */}
                    {index > 0 && (
                      <div className="flex flex-col items-center py-0.5 ml-[11px]">
                        <div className="w-px h-5 bg-border" />
                        <div className="w-2 h-2 rounded-full bg-primary/30" />
                        <div className="w-px h-5 bg-border" />
                      </div>
                    )}

                    {/* Card do passo */}
                    <div
                      className="rounded-2xl border bg-card hover:border-primary/40 transition-all animate-in slide-in-from-bottom-4 fade-in duration-300"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      {/* Header do passo */}
                      <div className="flex items-center gap-3 px-5 py-4 border-b">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold grid place-items-center shrink-0">
                          {index + 1}
                        </div>
                        <span className="flex-1 text-sm font-semibold">Passo {index + 1}</span>
                        {steps.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStep(index)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Conteúdo do passo */}
                      <div className="p-5 space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor={`step-title-${index}`}>Título do Passo</Label>
                          <Input
                            id={`step-title-${index}`}
                            value={step.title}
                            onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                            placeholder="Ex: Acessar o painel de controle"
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`step-content-${index}`}>Descrição do Passo</Label>
                          <Textarea
                            id={`step-content-${index}`}
                            value={step.content}
                            onChange={(e) => handleStepChange(index, 'content', e.target.value)}
                            placeholder="Descreva em detalhes o que deve ser feito neste passo..."
                            rows={4}
                            className="resize-none"
                          />
                        </div>

                        {/* Recursos Multimídia */}
                        <div className="space-y-2.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Recurso Multimídia
                          </p>

                          <Tabs defaultValue="none" className="w-full">
                            <TabsList className="h-9 w-full grid grid-cols-3">
                              <TabsTrigger value="none" className="gap-1.5 text-xs">
                                <X className="h-3.5 w-3.5" />
                                Nenhum
                              </TabsTrigger>
                              <TabsTrigger value="image" className="gap-1.5 text-xs">
                                <ImageIcon className="h-3.5 w-3.5" />
                                Imagem
                              </TabsTrigger>
                              <TabsTrigger value="video" className="gap-1.5 text-xs">
                                <Video className="h-3.5 w-3.5" />
                                Vídeo
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="none" className="mt-3">
                              <div className="flex items-center justify-center h-20 rounded-xl bg-muted/30 border border-dashed">
                                <p className="text-xs text-muted-foreground">
                                  Nenhum recurso adicionado a este passo
                                </p>
                              </div>
                            </TabsContent>

                            <TabsContent value="image" className="mt-3 space-y-3">
                              {step.imagePreview ? (
                                <div className="relative rounded-xl border overflow-hidden bg-muted/30">
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
                                      className="bg-background/90 hover:bg-background shadow-md text-xs h-8"
                                      onClick={() => openImageEditor(index)}
                                    >
                                      <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                                      Anotar
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="text-xs h-8"
                                      onClick={() => handleRemoveImage(index)}
                                    >
                                      <X className="h-3.5 w-3.5 mr-1.5" />
                                      Remover
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <input
                                    id={`image-${index}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      handleImageUpload(index, file);
                                    }}
                                  />
                                  <label
                                    htmlFor={`image-${index}`}
                                    className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                  >
                                    <div className="w-10 h-10 rounded-xl bg-muted grid place-items-center mb-2 group-hover:bg-primary/10 transition-colors">
                                      <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">
                                      Clique para enviar imagem
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-0.5">
                                      PNG, JPG, GIF — até 5 MB
                                    </span>
                                  </label>
                                </div>
                              )}
                            </TabsContent>

                            <TabsContent value="video" className="mt-3 space-y-3">
                              <div className="space-y-1.5">
                                <Label htmlFor={`youtube-${index}`}>URL do YouTube</Label>
                                <Input
                                  id={`youtube-${index}`}
                                  value={step.youtube_url || ''}
                                  onChange={(e) => handleStepChange(index, 'youtube_url', e.target.value)}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="h-11"
                                />
                              </div>
                              {step.youtube_url && (
                                <div className="rounded-xl border overflow-hidden bg-muted/30">
                                  <div className="flex items-center justify-center gap-3 py-6">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 grid place-items-center">
                                      <Video className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Vídeo do YouTube vinculado</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        Será exibido na visualização do tutorial
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Conector antes do botão */}
                <div className="flex flex-col items-center py-0.5 ml-[11px]">
                  <div className="w-px h-5 bg-border" />
                  <div className="w-2 h-2 rounded-full bg-primary/30" />
                  <div className="w-px h-5 bg-border" />
                </div>

                {/* Botão Adicionar Passo */}
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="w-full rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 py-4 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-all hover:scale-[1.01]"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 grid place-items-center">
                    <Plus className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Adicionar Passo
                </button>
              </div>
            </div>

            {/* Ações — rodapé do form */}
            <div className="flex gap-2 justify-end pt-2 pb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push('/tutoriais')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 transition-opacity text-white border-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Tutorial'
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* ── Right column: live preview (hidden on mobile/tablet) ── */}
        <div className="hidden lg:block animate-in slide-in-from-right-4 duration-500 delay-150">
          <div className="sticky top-6 space-y-4">

            {/* Preview card */}
            <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
              {/* Thumbnail */}
              <div className="h-28 bg-gradient-to-br from-primary/80 to-purple-500/80 relative flex flex-col justify-between p-4">
                {/* Sector badge — top left */}
                {selectedSector && (
                  <span className="self-start inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white backdrop-blur-sm border border-white/20">
                    {selectedSector.name}
                  </span>
                )}

                {/* Title — bottom left */}
                <h3
                  className="text-white font-semibold text-sm leading-snug line-clamp-2 transition-all duration-200"
                >
                  {formData.title || (
                    <span className="opacity-60">Título do tutorial...</span>
                  )}
                </h3>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                {/* Tags */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white animate-in fade-in duration-200"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                {formData.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-3 transition-all duration-200">
                    {formData.description}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/40 italic">
                    Descrição aparecerá aqui...
                  </p>
                )}

                {/* Divider */}
                {steps.length > 0 && <div className="h-px bg-border" />}

                {/* Steps list */}
                <div className="space-y-1.5">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 animate-in fade-in duration-200"
                    >
                      <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold grid place-items-center mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-xs text-foreground leading-snug line-clamp-1">
                        {step.title || (
                          <span className="text-muted-foreground/50 italic">
                            Passo {index + 1} — sem título
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress checklist */}
            <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Progresso
              </p>
              <div className="space-y-2">
                {checks.map((check, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 transition-all duration-200"
                  >
                    {check.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 transition-all duration-200" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 transition-all duration-200" />
                    )}
                    <span
                      className={`text-xs transition-all duration-200 ${
                        check.done ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="pt-1">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
                    style={{
                      width: `${(checks.filter((c) => c.done).length / checks.length) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
                  {checks.filter((c) => c.done).length} de {checks.length} concluídos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImageAnnotationEditor
        isOpen={editingImageIndex !== null}
        imageUrl={editingImageUrl}
        onClose={handleCloseEditor}
        onSave={handleSaveAnnotatedImage}
      />
    </div>
  );
}
