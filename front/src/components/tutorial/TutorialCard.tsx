'use client';

import type { CSSProperties } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, Calendar, User, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { TutorialListItem } from '@/types/tutorial.types';

interface TutorialCardProps {
  tutorial: TutorialListItem;
  onView: (tutorial: TutorialListItem) => void;
  onEdit: (tutorial: TutorialListItem) => void;
  onDelete: (tutorial: TutorialListItem) => void;
}

const clamp2: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',
};

export function TutorialCard({ tutorial, onView, onEdit, onDelete }: TutorialCardProps) {
  const canManage = tutorial.user_permissions?.can_edit ?? false;
  const canRemove = tutorial.user_permissions?.can_delete ?? false;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <div
      style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}
      className="bg-card text-card-foreground rounded-xl border hover:border-white/15 transition-all duration-150 flex flex-col"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex flex-col gap-2 cursor-pointer" style={{ minWidth: 0 }} onClick={() => onView(tutorial)}>

        {/* Título + badge + menu */}
        <div className="flex items-start gap-2" style={{ minWidth: 0 }}>
          <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <h3
            className="font-semibold text-base leading-snug flex-1"
            style={clamp2}
            title={tutorial.title}
          >
            {tutorial.title}
          </h3>

          <div className="flex items-center gap-1 shrink-0">
            <Badge
              variant={tutorial.is_active ? 'default' : 'secondary'}
              className={tutorial.is_active ? 'bg-emerald-500/90 border-0' : ''}
            >
              {tutorial.is_active ? 'Ativo' : 'Inativo'}
            </Badge>

            {(canManage || canRemove) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {canManage && (
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onEdit(tutorial); }}
                      className="gap-2 cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canRemove && (
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onDelete(tutorial); }}
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Setor */}
        <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
          <span className="font-medium shrink-0">Setor:</span>
          <Badge variant="outline" className="text-xs">
            {tutorial.sector_detail?.name}
          </Badge>
        </div>

        {/* Tags */}
        {tutorial.tags_detail && tutorial.tags_detail.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tutorial.tags_detail.map((tag) => (
              <Badge
                key={tag.id}
                style={{ backgroundColor: tag.color, color: '#fff' }}
                className="text-xs"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-5 pb-4 mt-auto space-y-1 text-xs text-muted-foreground cursor-pointer"
        style={{ minWidth: 0 }}
        onClick={() => onView(tutorial)}
      >
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 shrink-0" />
          <span className="truncate">Criado: {formatDate(tutorial.created_at)}</span>
        </div>
        {tutorial.created_by_name && (
          <div className="flex items-center gap-1" style={{ minWidth: 0 }}>
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate" title={tutorial.created_by_name}>
              Por: {tutorial.created_by_name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
