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
    selectedSectorIds.includes(sector.id)
  );

  const toggleSector = (sectorId: string) => {
    const newSelection = selectedSectorIds.includes(sectorId)
      ? selectedSectorIds.filter((id) => id !== sectorId)
      : [...selectedSectorIds, sectorId];
    onSelectionChange(newSelection);
  };

  const removeSector = (sectorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedSectorIds.filter((id) => id !== sectorId));
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
                  <button
                    onClick={(e) => removeSector(sector.id, e)}
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {selectedSectors.length > 0 && (
              <button
                onClick={clearAll}
                className="ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4 opacity-50 hover:opacity-100" />
              </button>
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
                const isSelected = selectedSectorIds.includes(sector.id);
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
