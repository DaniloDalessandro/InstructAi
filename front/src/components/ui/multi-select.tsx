'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';

export interface MultiSelectOption {
  id: string;
  name: string;
  color?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Selecione...',
  emptyText = 'Nenhuma opção encontrada',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (id: string) => {
    onChange(selected.filter((s) => s !== id));
  };

  const handleSelect = (id: string) => {
    if (selected.includes(id)) {
      handleUnselect(id);
    } else {
      onChange([...selected, id]);
    }
  };

  const selectedOptions = options.filter((option) => selected.includes(option.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-start min-h-10 h-auto', className)}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedOptions.map((option) => (
                <Badge
                  key={option.id}
                  variant="secondary"
                  style={option.color ? { backgroundColor: option.color, color: '#ffffff' } : undefined}
                  className="mr-1"
                >
                  {option.name}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUnselect(option.id);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnselect(option.id);
                    }}
                  >
                    <X className="h-3 w-3 text-white hover:opacity-80" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option.id}
                onSelect={() => handleSelect(option.id)}
                className="cursor-pointer"
              >
                <div
                  className={cn(
                    'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                    selected.includes(option.id) ? 'bg-primary text-primary-foreground' : 'opacity-50'
                  )}
                >
                  {selected.includes(option.id) && (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {option.color && (
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span>{option.name}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
