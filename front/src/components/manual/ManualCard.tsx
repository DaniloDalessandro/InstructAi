'use client';

import type { CSSProperties } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Calendar, User, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Manual } from '@/types/manual.types';

interface ManualCardProps {
  manual: Manual;
  onView: (manual: Manual) => void;
  onEdit: (manual: Manual) => void;
  onDelete: (manual: Manual) => void;
}

const clamp2: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',
};

export function ManualCard({ manual, onView, onEdit, onDelete }: ManualCardProps) {
  const { user } = useAuthContext();

  const canManage =
    user?.email === manual.created_by || user?.is_superuser;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <div
      style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}
      className="bg-card text-card-foreground rounded-xl border shadow-sm hover:shadow-lg transition-shadow duration-200 flex flex-col"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex flex-col gap-2 cursor-pointer" style={{ minWidth: 0 }} onClick={() => onView(manual)}>

        {/* Título + badge + menu */}
        <div className="flex items-start gap-2" style={{ minWidth: 0 }}>
          <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <h3
            className="font-semibold text-base leading-snug flex-1"
            style={clamp2}
            title={manual.name}
          >
            {manual.name}
          </h3>

          <div className="flex items-center gap-1 shrink-0">
            <Badge
              variant={manual.is_active ? 'default' : 'secondary'}
              className={manual.is_active ? 'bg-green-500' : 'bg-gray-500'}
            >
              {manual.is_active ? 'Ativo' : 'Inativo'}
            </Badge>

            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onEdit(manual); }}
                    className="gap-2 cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDelete(manual); }}
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Setores */}
        <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
          <span className="font-medium shrink-0">Setores:</span>
          {manual.sectors_detail.map((sector) => (
            <Badge key={sector.id} variant="outline" className="text-xs">
              {sector.name}
            </Badge>
          ))}
        </div>

        {/* Tags */}
        {manual.tags_detail && manual.tags_detail.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {manual.tags_detail.map((tag) => (
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
        onClick={() => onView(manual)}
      >
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 shrink-0" />
          <span className="truncate">Criado: {formatDate(manual.created_at)}</span>
        </div>
        {manual.created_by && (
          <div className="flex items-center gap-1" style={{ minWidth: 0 }}>
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate" title={manual.created_by}>
              Por: {manual.created_by}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
