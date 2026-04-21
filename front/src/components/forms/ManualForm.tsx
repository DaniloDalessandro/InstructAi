'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

export default function ManualForm({ open, handleClose, initialData, onSubmit }: ManualFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ name: '', sectors: [] as string[], tags: [] as string[] });

  useEffect(() => {
    if (open) loadFormData();
  }, [open]);

  useEffect(() => {
    if (initialData && open) {
      setFormData({ name: initialData.name || '', sectors: initialData.sectors || [], tags: initialData.tags || [] });
      setSelectedFile(null);
    } else if (!open) {
      setFormData({ name: '', sectors: [], tags: [] });
      setSelectedFile(null);
    }
  }, [initialData, open]);

  const loadFormData = async () => {
    setLoadingData(true);
    try {
      const [s, t] = await Promise.all([
        getSectors({ page_size: 100, is_active: 'true' }),
        getTags({ page_size: 100, is_active: 'true' }),
      ]);
      setSectors(s.results);
      setTags(t.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    const el = document.getElementById('pdf_file') as HTMLInputElement;
    if (el) el.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Nome do manual é obrigatório', variant: 'destructive' });
      return;
    }
    if (formData.sectors.length === 0) {
      toast({ title: 'Selecione pelo menos um setor', variant: 'destructive' });
      return;
    }
    if (formData.tags.length === 0) {
      toast({ title: 'Selecione pelo menos uma tag', variant: 'destructive' });
      return;
    }
    if (!initialData && !selectedFile) {
      toast({ title: 'Arquivo PDF é obrigatório', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({ name: formData.name.trim(), sectors: formData.sectors, tags: formData.tags, pdf_file: selectedFile });
      setFormData({ name: '', sectors: [], tags: [] });
      setSelectedFile(null);
      handleClose();
    } catch {
      // erro tratado na página
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!initialData;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[620px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                {isEditing ? 'Editar Manual' : 'Novo Manual'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isEditing ? 'Atualize os dados do manual' : 'Preencha as informações e envie o arquivo PDF'}
              </p>
            </DialogHeader>
          </div>

          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-5">

              {/* Nome */}
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Nome do Manual <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Manual de Procedimentos Administrativos"
                  className="h-11"
                />
              </div>

              {/* Upload PDF */}
              <div className="space-y-1.5">
                <Label>
                  Arquivo PDF {!isEditing && <span className="text-destructive">*</span>}
                  {isEditing && <span className="text-muted-foreground font-normal"> (opcional — deixe em branco para manter o atual)</span>}
                </Label>

                {selectedFile ? (
                  /* Arquivo selecionado */
                  <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary bg-primary/5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="w-7 h-7 grid place-items-center rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : isEditing && initialData?.pdf_file ? (
                  /* Arquivo existente + opção de trocar */
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                      <div className="w-8 h-8 rounded-lg bg-muted grid place-items-center shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{initialData.pdf_file.split('/').pop()}</p>
                        <p className="text-xs text-muted-foreground">Arquivo atual</p>
                      </div>
                    </div>
                    <label
                      htmlFor="pdf_file"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-primary"
                    >
                      <Upload className="h-4 w-4" />
                      Substituir arquivo PDF
                      <input id="pdf_file" type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                ) : (
                  /* Drop zone vazia */
                  <label
                    htmlFor="pdf_file"
                    className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted grid place-items-center group-hover:bg-primary/10 transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Clique para enviar o arquivo PDF</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Apenas arquivos .pdf</p>
                    </div>
                    <input id="pdf_file" type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
                  </label>
                )}
              </div>

              {/* Setores */}
              <div className="space-y-1.5">
                <Label>
                  Setores <span className="text-destructive">*</span>
                </Label>
                <SectorMultiSelect
                  sectors={sectors}
                  selectedSectorIds={formData.sectors}
                  onSelectionChange={(ids) => setFormData((p) => ({ ...p, sectors: ids }))}
                  placeholder="Selecione os setores..."
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label>
                  Tags <span className="text-destructive">*</span>
                </Label>
                <TagMultiSelect
                  tags={tags}
                  selectedTagIds={formData.tags}
                  onSelectionChange={(ids) => setFormData((p) => ({ ...p, tags: ids }))}
                  placeholder="Selecione as tags..."
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 flex justify-end gap-2 border-t mt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || loadingData}
              className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 transition-opacity text-white border-0"
            >
              {isLoading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Salvando...</>
              ) : isEditing ? 'Salvar Alterações' : 'Criar Manual'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
