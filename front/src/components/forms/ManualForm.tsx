'use client';

import { useState, useEffect } from 'react';
import { formatDateTimeLocal } from '@/lib/utils/datetime';
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
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/multi-select';
import { FileText, Upload, X, Loader2, Globe, Lock, CalendarRange } from 'lucide-react';
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
  const [hasPeriodEnabled, setHasPeriodEnabled] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sectors: [] as string[],
    tags: [] as string[],
    available_for_all_sectors: true,
    allowed_sectors: [] as string[],
    available_from: null as string | null,
    available_until: null as string | null,
  });

  useEffect(() => {
    if (open) loadFormData();
  }, [open]);

  useEffect(() => {
    if (initialData && open) {
      setFormData({
        name: initialData.name || '',
        sectors: (initialData.sectors || []).map(String),
        tags: (initialData.tags || []).map(String),
        available_for_all_sectors: initialData.available_for_all_sectors ?? true,
        allowed_sectors: (initialData.allowed_sectors || []).map(String),
        available_from: initialData.available_from || null,
        available_until: initialData.available_until || null,
      });
      setHasPeriodEnabled(!!(initialData.available_from || initialData.available_until));
      setSelectedFile(null);
    } else if (!open) {
      setFormData({ name: '', sectors: [], tags: [], available_for_all_sectors: true, allowed_sectors: [], available_from: null, available_until: null });
      setHasPeriodEnabled(false);
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
      await onSubmit({
        name: formData.name.trim(),
        sectors: formData.sectors,
        tags: formData.tags,
        pdf_file: selectedFile,
        available_for_all_sectors: formData.available_for_all_sectors,
        allowed_sectors: formData.available_for_all_sectors ? [] : formData.allowed_sectors,
        available_from: formData.available_from,
        available_until: formData.available_until,
      });
      setFormData({ name: '', sectors: [], tags: [], available_for_all_sectors: true, allowed_sectors: [], available_from: null, available_until: null });
      setHasPeriodEnabled(false);
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
      <DialogContent className="sm:max-w-[620px] max-w-[95vw] p-0 flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b shrink-0">
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
            <div className="flex flex-col items-center justify-center py-16 gap-3 flex-1">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

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

              {/* Disponibilidade */}
              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Disponibilidade</p>

                {/* Setores */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label className="text-sm">Todos os setores</Label>
                      <p className="text-xs text-muted-foreground">
                        {formData.available_for_all_sectors ? 'Visível para todos os usuários' : 'Apenas setores selecionados'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.available_for_all_sectors}
                    onCheckedChange={(checked) =>
                      setFormData((p) => ({ ...p, available_for_all_sectors: checked, allowed_sectors: [] }))
                    }
                  />
                </div>
                {!formData.available_for_all_sectors && (
                  <div className="space-y-1.5 pl-1">
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-xs text-muted-foreground">Setores com acesso</Label>
                    </div>
                    <MultiSelect
                      options={sectors.map((s) => ({ id: s.id.toString(), name: s.name }))}
                      selected={formData.allowed_sectors}
                      onChange={(vals) => setFormData((p) => ({ ...p, allowed_sectors: vals }))}
                      placeholder="Selecione os setores..."
                      emptyText="Nenhum setor encontrado"
                    />
                  </div>
                )}

                {/* Período */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label className="text-sm">Definir período</Label>
                      <p className="text-xs text-muted-foreground">
                        {hasPeriodEnabled ? 'Período definido' : 'Sem limite de tempo'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={hasPeriodEnabled}
                    onCheckedChange={(checked) => {
                      setHasPeriodEnabled(checked);
                      if (!checked) setFormData((p) => ({ ...p, available_from: null, available_until: null }));
                    }}
                  />
                </div>
                {hasPeriodEnabled && (
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Início</Label>
                      <Input
                        type="datetime-local"
                        value={formatDateTimeLocal(formData.available_from)}
                        onChange={(e) => setFormData((p) => ({ ...p, available_from: e.target.value || null }))}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Término</Label>
                      <Input
                        type="datetime-local"
                        value={formatDateTimeLocal(formData.available_until)}
                        onChange={(e) => setFormData((p) => ({ ...p, available_until: e.target.value || null }))}
                        min={formatDateTimeLocal(formData.available_from) || undefined}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 pb-6 pt-4 flex justify-end gap-2 border-t shrink-0">
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
