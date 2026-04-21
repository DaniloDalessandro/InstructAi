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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Plus, Trash2, GripVertical, ArrowDown, Image as ImageIcon, Video, Upload, X, Edit3, Loader2 } from 'lucide-react';
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

  // Image editor state
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string>('');

  // Form data
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
    // Reorder remaining steps
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

      // Create tutorial
      const tutorial = await createTutorial(formData);

      // Create steps
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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push('/tutoriais')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Tutoriais
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Novo Tutorial</h1>
        </div>
      </div>

      <form id="novo-tutorial-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título do Tutorial *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Como configurar o sistema"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Descrição *
              </Label>
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
                <Label htmlFor="sector">
                  Setor *
                </Label>
                <Select value={formData.sector} onValueChange={(value) => setFormData({ ...formData, sector: value })}>
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

              <div className="space-y-2">
                <Label>Tags (opcional)</Label>
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

        {/* Passos do Tutorial */}
        <Card>
          <CardHeader>
            <CardTitle>Passos do Tutorial</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Crie um guia passo a passo completo com texto, imagens e vídeos
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {steps.map((step, index) => (
              <div key={index}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 pt-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Passo {index + 1}</span>
                          {steps.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveStep(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`title-${index}`}>
                            Título do Passo
                          </Label>
                          <Input
                            id={`title-${index}`}
                            value={step.title}
                            onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                            placeholder="Ex: Acessar o painel de controle"
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`content-${index}`}>
                            Descrição do Passo
                          </Label>
                          <Textarea
                            id={`content-${index}`}
                            value={step.content}
                            onChange={(e) => handleStepChange(index, 'content', e.target.value)}
                            placeholder="Descreva em detalhes o que deve ser feito neste passo..."
                            rows={5}
                            className="resize-none"
                          />
                        </div>

                        {/* Recursos Multimídia */}
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                            Recursos Multimídia (Opcional)
                          </h4>

                          <Tabs defaultValue="none" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 h-11">
                              <TabsTrigger value="none" className="gap-2">
                                <X className="h-4 w-4" />
                                Nenhum
                              </TabsTrigger>
                              <TabsTrigger value="image" className="gap-2">
                                <ImageIcon className="h-4 w-4" />
                                Imagem
                              </TabsTrigger>
                              <TabsTrigger value="video" className="gap-2">
                                <Video className="h-4 w-4" />
                                Vídeo
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="none" className="mt-4">
                              <div className="text-center py-8 text-sm text-muted-foreground">
                                Nenhum recurso multimídia adicionado a este passo
                              </div>
                            </TabsContent>

                            <TabsContent value="image" className="mt-4 space-y-3">
                              {step.imagePreview ? (
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
                                      <Edit3 className="h-4 w-4 mr-2" />
                                      Anotar Imagem
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleRemoveImage(index)}
                                    >
                                      <X className="h-4 w-4 mr-2" />
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
                                    className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all"
                                  >
                                    <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                                    <span className="text-base font-medium text-foreground mb-1">Clique para adicionar imagem</span>
                                    <span className="text-sm text-muted-foreground">PNG, JPG, GIF até 5MB</span>
                                  </label>
                                </div>
                              )}
                            </TabsContent>

                            <TabsContent value="video" className="mt-4 space-y-3">
                              <div className="space-y-2">
                                <Label htmlFor={`youtube-${index}`}>
                                  URL do YouTube
                                </Label>
                                <Input
                                  id={`youtube-${index}`}
                                  value={step.youtube_url || ''}
                                  onChange={(e) => handleStepChange(index, 'youtube_url', e.target.value)}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="h-11"
                                />
                              </div>
                              {step.youtube_url && (
                                <div className="border rounded-lg overflow-hidden bg-muted/30">
                                  <div className="aspect-video flex items-center justify-center">
                                    <div className="text-center">
                                      <Video className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                      <p className="text-sm text-muted-foreground font-medium">Vídeo do YouTube</p>
                                      <p className="text-xs text-muted-foreground mt-1">Será exibido aqui na visualização</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Seta indicando próximo passo */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-4">
                    <ArrowDown className="h-6 w-6 text-muted-foreground animate-bounce" />
                  </div>
                )}
              </div>
            ))}

            {/* Botão Adicionar Passo */}
            <div className="pt-4">
              <Button
                type="button"
                onClick={handleAddStep}
                variant="outline"
                className="w-full border-dashed border-2 h-10 hover:bg-primary/5 hover:border-primary"
              >
                <Plus className="mr-2 h-5 w-5" />
                Adicionar Novo Passo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex gap-2 justify-end pb-4">
          <Button type="button" variant="outline" size="sm" onClick={() => router.push('/tutoriais')}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Criando...</>
            ) : 'Criar Tutorial'}
          </Button>
        </div>

      </form>

      {/* Image Editor */}
      <ImageAnnotationEditor
        isOpen={editingImageIndex !== null}
        imageUrl={editingImageUrl}
        onClose={handleCloseEditor}
        onSave={handleSaveAnnotatedImage}
      />
    </div>
  );
}
