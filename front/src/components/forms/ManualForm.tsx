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
import { getSectors } from '@/lib/api/sectors';
import { getTags } from '@/lib/api/tags';
import { TagMultiSelect } from '@/components/manual/TagMultiSelect';
import { SectorMultiSelect } from '@/components/manual/SectorMultiSelect';
import type { Sector } from '@/types/sector.types';
import type { Tag } from '@/types/tag.types';
import type { Manual, ManualFormData } from '@/types/manual.types';
import { FileText, Upload, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ManualFormProps {
  open: boolean;
  handleClose: () => void;
  initialData: Manual | null;
  onSubmit: (data: ManualFormData) => Promise<void>;
}

export default function ManualForm({
  open,
  handleClose,
  initialData,
  onSubmit,
}: ManualFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    sectors: string[];
    tags: string[];
  }>({
    name: '',
    sectors: [],
    tags: [],
  });

  // Load sectors and tags
  useEffect(() => {
    if (open) {
      loadFormData();
    }
  }, [open]);

  // Reset form when dialog closes or initialData changes
  useEffect(() => {
    if (initialData && open) {
      setFormData({
        name: initialData.name || '',
        sectors: initialData.sectors || [],
        tags: initialData.tags || [],
      });
      setSelectedFile(null);
    } else if (!open) {
      setFormData({
        name: '',
        sectors: [],
        tags: [],
      });
      setSelectedFile(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('pdf_file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.name.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Nome do manual é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    if (formData.sectors.length === 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione pelo menos um setor',
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

    if (!initialData && !selectedFile) {
      toast({
        title: 'Campo obrigatório',
        description: 'Arquivo PDF é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const submitData = {
        name: formData.name.trim(),
        sectors: formData.sectors,
        tags: formData.tags,
        pdf_file: selectedFile,
      };

      await onSubmit(submitData);

      // Resetar formulário
      setFormData({ name: '', sectors: [], tags: [] });
      setSelectedFile(null);

      handleClose();
    } catch (error) {
      console.error('Erro ao salvar manual:', error);
      // Não fazer nada aqui - erro já é tratado na página
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
              {initialData ? 'Editar Manual' : 'Novo Manual'}
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
                <Label htmlFor="name">Nome do Manual *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  placeholder="Digite o nome do manual"
                />
              </div>

              {/* Upload PDF */}
              <div className="grid gap-2">
                <Label htmlFor="pdf_file">
                  Arquivo PDF {!initialData && '*'}
                </Label>

                {selectedFile ? (
                  <div className="flex items-center gap-3 p-4 border-2 border-primary rounded-lg bg-primary/5">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                ) : initialData?.pdf_file ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 border-2 border-muted rounded-lg bg-muted/30">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {initialData.pdf_file.split('/').pop()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Arquivo atual
                        </p>
                      </div>
                    </div>
                    <label
                      htmlFor="pdf_file"
                      className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <Upload className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">
                        Escolher outro arquivo PDF
                      </span>
                      <input
                        id="pdf_file"
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="pdf_file"
                    className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Clique para selecionar o arquivo PDF
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Apenas 1 arquivo PDF
                      </p>
                    </div>
                    <input
                      id="pdf_file"
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>

              {/* Setores */}
              <div className="grid gap-2">
                <Label htmlFor="sectors">Setores *</Label>
                <SectorMultiSelect
                  sectors={sectors}
                  selectedSectorIds={formData.sectors}
                  onSelectionChange={(sectorIds) =>
                    setFormData((prev) => ({ ...prev, sectors: sectorIds }))
                  }
                  placeholder="Selecione pelo menos um setor..."
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
