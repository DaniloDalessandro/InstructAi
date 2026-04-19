'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TutorialCard } from '@/components/tutorial/TutorialCard';
import { TutorialFilters, TutorialFiltersState } from '@/components/tutorial/TutorialFilters';
import { getTutorials, deleteTutorial } from '@/lib/api/tutorials';
import { toast } from '@/hooks/use-toast';
import type { TutorialListItem } from '@/types/tutorial.types';
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

export default function TutoriaisPage() {
  const router = useRouter();
  const [tutorials, setTutorials] = useState<TutorialListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<TutorialFiltersState>({
    search: '',
    sectors: [],
    tags: [],
  });

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tutorialToDelete, setTutorialToDelete] = useState<TutorialListItem | null>(null);

  // Fetch tutorials
  const fetchTutorials = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getTutorials({
        search: filters.search || undefined,
        sector: filters.sectors.length > 0 ? filters.sectors.join(',') : undefined,
        tags: filters.tags.length > 0 ? filters.tags.join(',') : undefined,
        is_active: 'true',
        page_size: 100,
      });
      setTutorials(response.results);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar tutoriais',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchTutorials();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchTutorials]);

  // Handle delete
  const handleDelete = async () => {
    if (!tutorialToDelete) return;

    try {
      await deleteTutorial(tutorialToDelete.id);
      toast({
        title: 'Sucesso',
        description: 'Tutorial excluído com sucesso!',
      });
      fetchTutorials();
      setIsDeleteDialogOpen(false);
      setTutorialToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir tutorial',
        variant: 'destructive',
      });
    }
  };

  // Handle view
  const handleView = (tutorial: TutorialListItem) => {
    router.push(`/tutoriais/${tutorial.id}`);
  };

  // Handle edit
  const handleEdit = (tutorial: TutorialListItem) => {
    router.push(`/tutoriais/${tutorial.id}/editar`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header padronizado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tutoriais</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tutoriais passo a passo para facilitar seu aprendizado
          </p>
        </div>
        <Link href="/tutoriais/novo" target="_blank">
          <Button size="sm" className="h-9 shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Tutorial
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <TutorialFilters filters={filters} onFiltersChange={setFilters} />

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
      ) : tutorials.length === 0 ? (
        /* Empty state amigável */
        <div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-muted/20 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
            <Plus className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="font-medium text-foreground">Nenhum tutorial encontrado</p>
            {(filters.search || filters.sectors.length > 0 || filters.tags.length > 0) ? (
              <p className="text-sm text-muted-foreground mt-1">
                Tente ajustar os filtros para encontrar mais resultados
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Crie o primeiro tutorial para começar
              </p>
            )}
          </div>
          {!filters.search && filters.sectors.length === 0 && filters.tags.length === 0 && (
            <Link href="/tutoriais/novo" target="_blank">
              <Button size="sm" variant="outline">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Criar Tutorial
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
          {tutorials.map((tutorial) => (
            <TutorialCard
              key={tutorial.id}
              tutorial={tutorial}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={(tutorial) => {
                setTutorialToDelete(tutorial);
                setIsDeleteDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o tutorial "{tutorialToDelete?.title}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTutorialToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
