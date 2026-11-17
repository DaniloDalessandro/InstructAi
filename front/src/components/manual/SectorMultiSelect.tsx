'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Sector } from '@/types/sector.types';

interface SectorMultiSelectProps {
  sectors: Sector[];
  selectedSectorIds: string[];
  onSelectionChange: (sectorIds: string[]) => void;
  placeholder?: string;
}

export function SectorMultiSelect({
  sectors,
  selectedSectorIds,
  onSelectionChange,
  placeholder = 'Selecione setores...',
}: SectorMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedSectors = sectors.filter((sector) =>
    selectedSectorIds.map(String).includes(String(sector.id))
  );

  const toggleSector = (sectorId: string) => {
    const newSelection = selectedSectorIds.map(String).includes(String(sectorId))
      ? selectedSectorIds.map(String).filter((id) => id !== String(sectorId))
      : [...selectedSectorIds.map(String), String(sectorId)];
    onSelectionChange(newSelection);
  };

  const removeSector = (sectorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedSectorIds.map(String).filter((id) => id !== String(sectorId)));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-10 h-auto"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedSectors.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedSectors.map((sector) => (
                <Badge key={sector.id} variant="secondary" className="gap-1">
                  {sector.name}
                  <span
                    role="button" tabIndex={0}
                    aria-label={`Remover setor ${sector.name}`}
                    onKeyDown={e => e.key === "Enter" && removeSector(sector.id, e as any)}
                    onClick={(e) => removeSector(sector.id, e)}
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {selectedSectors.length > 0 && (
              <span
                role="button" tabIndex={0} aria-label="Limpar setores"
                onKeyDown={e => e.key === "Enter" && clearAll(e as any)}
                onClick={clearAll}
                className="ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4 opacity-50 hover:opacity-100" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar setores..." />
          <CommandList>
            <CommandEmpty>Nenhum setor encontrado.</CommandEmpty>
            <CommandGroup>
              {sectors.map((sector) => {
                const isSelected = selectedSectorIds.map(String).includes(String(sector.id));
                return (
                  <CommandItem
                    key={sector.id}
                    value={sector.name}
                    onSelect={() => toggleSector(sector.id)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{sector.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
