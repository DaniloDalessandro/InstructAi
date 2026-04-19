'use client';

import { useState, useEffect, useCallback } from 'react';
import { ManualCard } from '@/components/manual/ManualCard';
import { ManualFilters, ManualFiltersState } from '@/components/manual/ManualFilters';
import ManualForm from '@/components/forms/ManualForm';
import { getManuals, createManual, updateManual, deleteManual } from '@/lib/api/manuals';
import { toast } from '@/hooks/use-toast';
import type { Manual, ManualFormData } from '@/types/manual.types';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
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

export default function ManuaisPage() {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<ManualFiltersState>({
    search: '',
    sectors: [],
    tags: [],
  });

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [selectedManual, setSelectedManual] = useState<Manual | null>(null);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [manualToDelete, setManualToDelete] = useState<Manual | null>(null);

  // Fetch manuals
  const fetchManuals = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getManuals({
        search: filters.search || undefined,
        sectors: filters.sectors.length > 0 ? filters.sectors : undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
        is_active: 'true',
      });
      setManuals(response.results);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar manuais',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchManuals();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchManuals]);

  // Handle create/update
  const handleSubmit = async (data: ManualFormData) => {
    setIsFormLoading(true);
    try {
      if (selectedManual) {
        await updateManual(selectedManual.id, data);
        toast({
          title: 'Sucesso',
          description: 'Manual atualizado com sucesso!',
        });
      } else {
        await createManual(data);
        toast({
          title: 'Sucesso',
          description: 'Manual criado com sucesso!',
        });
      }

      await fetchManuals();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar manual',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsFormLoading(false);
    }
  };

  // Handle delete (soft delete)
  const handleDelete = async () => {
    if (!manualToDelete) return;

    try {
      await deleteManual(manualToDelete.id);
      toast({
        title: 'Sucesso',
        description: 'Manual inativado com sucesso!',
      });
      fetchManuals();
      setIsDeleteDialogOpen(false);
      setManualToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao inativar manual',
        variant: 'destructive',
      });
    }
  };

  // Handle view PDF
  const handleView = (manual: Manual) => {
    if (manual.pdf_url) {
      window.open(manual.pdf_url, '_blank');
    } else {
      toast({
        title: 'Erro',
        description: 'URL do PDF não disponível',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header padronizado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manuais</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os manuais do sistema
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedManual(null);
            setIsFormOpen(true);
          }}
          size="sm"
          className="h-9 shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Manual
        </Button>
      </div>

      {/* Filters */}
      <ManualFilters filters={filters} onFiltersChange={setFilters} />

      {/* Content */}
      {isLoading ? (
        /* Skeleton grid durante carregamento */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border rounded-xl bg-card p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="flex gap-2 pt-2">
                <div className="h-5 bg-muted rounded-full w-14" />
                <div className="h-5 bg-muted rounded-full w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : manuals.length === 0 ? (
        /* Empty state amigável */
        <div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-muted/20 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
            <Plus className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="font-medium text-foreground">Nenhum manual encontrado</p>
            {(filters.search || filters.sectors.length > 0 || filters.tags.length > 0) ? (
              <p className="text-sm text-muted-foreground mt-1">
                Tente ajustar os filtros para encontrar mais resultados
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Adicione o primeiro manual para começar
              </p>
            )}
          </div>
          {!filters.search && filters.sectors.length === 0 && filters.tags.length === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setSelectedManual(null); setIsFormOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo Manual
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
          {manuals.map((manual) => (
            <ManualCard
              key={manual.id}
              manual={manual}
              onView={handleView}
              onEdit={(manual) => {
                setSelectedManual(manual);
                setIsFormOpen(true);
              }}
              onDelete={(manual) => {
                setManualToDelete(manual);
                setIsDeleteDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <ManualForm
        open={isFormOpen}
        handleClose={() => {
          setIsFormOpen(false);
          setSelectedManual(null);
        }}
        initialData={selectedManual}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Inativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar o manual "{manualToDelete?.name}"?
              O manual ficará invisível mas poderá ser reativado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setManualToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
