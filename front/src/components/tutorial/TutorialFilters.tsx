'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { getSectors } from '@/lib/api/sectors';
import { getTags } from '@/lib/api/tags';
import { TagMultiSelect } from '@/components/manual/TagMultiSelect';
import { SectorMultiSelect } from '@/components/manual/SectorMultiSelect';
import type { Sector } from '@/types/sector.types';
import type { Tag } from '@/types/tag.types';

export interface TutorialFiltersState {
  search: string;
  sectors: string[];
  tags: string[];
}

interface TutorialFiltersProps {
  filters: TutorialFiltersState;
  onFiltersChange: (filters: TutorialFiltersState) => void;
}

export function TutorialFilters({ filters, onFiltersChange }: TutorialFiltersProps) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function loadData() {
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
    }

    loadData();
  }, []);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleSectorsChange = (sectorIds: string[]) => {
    onFiltersChange({ ...filters, sectors: sectorIds });
  };

  const handleTagsChange = (tagIds: string[]) => {
    onFiltersChange({ ...filters, tags: tagIds });
  };

  const clearFilters = () => {
    onFiltersChange({ search: '', sectors: [], tags: [] });
  };

  const hasActiveFilters =
    filters.search || filters.sectors.length > 0 || filters.tags.length > 0;

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">
          Carregando filtros...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtros</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* GRID DOS FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Buscar por nome - MAIOR */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="search">Buscar por nome</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Digite o nome do tutorial..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        {/* Filtrar por setores - MENOR */}
        <div className="space-y-2">
          <Label htmlFor="sectors">Filtrar por setores</Label>
          <SectorMultiSelect
            sectors={sectors}
            selectedSectorIds={filters.sectors}
            onSelectionChange={handleSectorsChange}
            placeholder="Selecione setores..."
          />
        </div>

        {/* Filtrar por tags - largura total */}
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="tags">Filtrar por tags</Label>
          <TagMultiSelect
            tags={tags}
            selectedTagIds={filters.tags}
            onSelectionChange={handleTagsChange}
            placeholder="Selecione tags..."
          />
        </div>
      </div>
    </div>
  );
}
