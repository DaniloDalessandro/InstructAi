'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
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
    <div className="flex flex-wrap items-center gap-2">
      {/* Busca */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="search"
          type="text"
          placeholder="Buscar tutorial..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 h-9 w-full"
        />
      </div>

      {/* Setores */}
      <div className="flex-1 min-w-[160px]">
        <SectorMultiSelect
          sectors={sectors}
          selectedSectorIds={filters.sectors}
          onSelectionChange={handleSectorsChange}
          placeholder="Setor..."
        />
      </div>

      {/* Tags */}
      <div className="flex-1 min-w-[160px]">
        <TagMultiSelect
          tags={tags}
          selectedTagIds={filters.tags}
          onSelectionChange={handleTagsChange}
          placeholder="Tag..."
        />
      </div>

      {/* Limpar */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
