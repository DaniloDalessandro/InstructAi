'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { getSectors } from '@/lib/api/sectors';
import { getTags } from '@/lib/api/tags';
import { TagMultiSelect } from './TagMultiSelect';
import { SectorMultiSelect } from './SectorMultiSelect';
import type { Sector } from '@/types/sector.types';
import type { Tag } from '@/types/tag.types';

export interface ManualFiltersState {
  search: string;
  sectors: string[];
  tags: string[];
}

interface ManualFiltersProps {
  filters: ManualFiltersState;
  onFiltersChange: (filters: ManualFiltersState) => void;
}

export function ManualFilters({ filters, onFiltersChange }: ManualFiltersProps) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    Promise.all([
      getSectors({ page_size: 100, is_active: 'true' }),
      getTags({ page_size: 100, is_active: 'true' }),
    ]).then(([s, t]) => {
      setSectors(s.results);
      setTags(t.results);
    }).catch(console.error);
  }, []);

  const hasActive = !!filters.search || filters.sectors.length > 0 || filters.tags.length > 0;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Buscar manual..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-8 h-8 text-sm bg-background/60"
        />
      </div>

      {/* Setores */}
      <div className="w-full sm:w-44">
        <SectorMultiSelect
          sectors={sectors}
          selectedSectorIds={filters.sectors}
          onSelectionChange={(ids) => onFiltersChange({ ...filters, sectors: ids })}
          placeholder="Setores..."
        />
      </div>

      {/* Tags */}
      <div className="w-full sm:w-44">
        <TagMultiSelect
          tags={tags}
          selectedTagIds={filters.tags}
          onSelectionChange={(ids) => onFiltersChange({ ...filters, tags: ids })}
          placeholder="Tags..."
        />
      </div>

      {/* Limpar */}
      {hasActive && (
        <button
          onClick={() => onFiltersChange({ search: '', sectors: [], tags: [] })}
          className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
          Limpar
        </button>
      )}
    </div>
  );
}
