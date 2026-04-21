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
import type { Tag } from '@/types/tag.types';

interface TagMultiSelectProps {
  tags: Tag[];
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  placeholder?: string;
}

export function TagMultiSelect({
  tags,
  selectedTagIds,
  onSelectionChange,
  placeholder = 'Selecione tags...',
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const toggleTag = (tagId: string) => {
    const newSelection = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    onSelectionChange(newSelection);
  };

  const removeTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedTagIds.filter((id) => id !== tagId));
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
            {selectedTags.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  style={{
                    backgroundColor: tag.color,
                    color: '#ffffff',
                  }}
                  className="gap-1"
                >
                  {tag.name}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => removeTag(tag.id, e)}
                    onKeyDown={(e) => e.key === 'Enter' && removeTag(tag.id, e as any)}
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {selectedTags.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={clearAll}
                onKeyDown={(e) => e.key === 'Enter' && clearAll(e as any)}
                className="ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
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
          <CommandInput placeholder="Buscar tags..." />
          <CommandList>
            <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
            <CommandGroup>
              {tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => toggleTag(tag.id)}
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
                    <Badge
                      style={{
                        backgroundColor: tag.color,
                        color: '#ffffff',
                      }}
                    >
                      {tag.name}
                    </Badge>
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
