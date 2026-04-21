'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCourses } from '@/lib/api/courses';
import { getTags } from '@/lib/api/tags';
import { getSectors } from '@/lib/api/sectors';
import { toast } from '@/hooks/use-toast';
import type { CourseListItem } from '@/types/course.types';
import type { Tag } from '@/types/tag.types';
import type { Sector } from '@/types/sector.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { TagMultiSelect } from '@/components/manual/TagMultiSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CourseStepperForm from '@/components/forms/CourseStepperForm';
import {
  Plus, Grid3x3, List, Search, BookOpen, Clock, Eye,
  SortAsc, CheckCircle2, PlayCircle, BookMarked,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'gallery' | 'list';
type SortMode = 'recent' | 'alpha' | 'progress';
type CourseStatus = 'all' | 'not_started' | 'in_progress' | 'completed';

const SECTOR_COLORS = [
  'bg-violet-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-fuchsia-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-red-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-orange-500',
];

function sectorColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % SECTOR_COLORS.length;
}

function getCourseStatus(course: CourseListItem): Exclude<CourseStatus, 'all'> {
  if (!course.user_progress || course.user_progress.completion_percentage === 0) return 'not_started';
  if (course.user_progress.completed_at) return 'completed';
  return 'in_progress';
}

const STATUS_CONFIG = {
  not_started: { label: 'Não iniciado', className: 'bg-muted text-muted-foreground' },
  in_progress:  { label: 'Em andamento', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  completed:    { label: 'Concluído',    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
};

// ─── Page ────────────────────────────────────────────────────
export default function CursosPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState('all');
  const [statusFilter, setStatusFilter] = useState<CourseStatus>('all');
  const [view, setView] = useState<ViewMode>('gallery');
  const [sort, setSort] = useState<SortMode>('recent');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [coursesRes, tagsRes, sectorsRes] = await Promise.all([
        getCourses({ is_active: 'true' }),
        getTags({ is_active: 'true', page_size: 100 }),
        getSectors({ is_active: 'true', page_size: 100 }),
      ]);
      setCourses(coursesRes.results);
      setTags(tagsRes.results);
      setSectors(sectorsRes.results);
    } catch {
      toast({ title: 'Erro ao carregar cursos', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
      }
      if (selectedTags.length > 0 && !selectedTags.some((id) => c.tags.includes(id))) return false;
      if (selectedSector !== 'all' && c.sector !== selectedSector) return false;
      if (statusFilter !== 'all' && getCourseStatus(c) !== statusFilter) return false;
      return true;
    });
  }, [courses, search, selectedTags, selectedSector, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === 'alpha') return a.name.localeCompare(b.name);
      if (sort === 'progress') {
        return (b.user_progress?.completion_percentage ?? 0) - (a.user_progress?.completion_percentage ?? 0);
      }
      return 0;
    });
  }, [filtered, sort]);

  const hasFilters = !!search || selectedTags.length > 0 || selectedSector !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setSelectedTags([]);
    setSelectedSector('all');
    setStatusFilter('all');
  };

  return (
    <div className="-mx-4 -my-6 md:-mx-6 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

      {/* ── Header + Toolbar ───────────────────────────────── */}
      <div className="px-4 pt-6 pb-3 md:px-6 space-y-4 shrink-0 animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cursos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Explore os cursos e acompanhe seu progresso</p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsFormOpen(true)}
            className="h-9 shrink-0 bg-gradient-to-r from-primary to-purple-500 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Curso
          </Button>
        </div>

        {/* Toolbar */}
        <div className="rounded-xl border bg-card/80 backdrop-blur shadow-sm px-3 py-2.5 flex flex-col gap-2">

          {/* Linha 1: filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar curso..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm bg-background/60"
              />
            </div>

            {/* Status */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CourseStatus)}>
              <SelectTrigger className="h-9 text-sm bg-background/60">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="not_started">Não iniciado</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>

            {/* Sector */}
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="h-9 text-sm bg-background/60">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tags */}
            <TagMultiSelect
              tags={tags}
              selectedTagIds={selectedTags}
              onSelectionChange={setSelectedTags}
              placeholder="Tags..."
            />
          </div>

          {/* Separador */}
          <div className="h-px bg-border/60" />

          {/* Linha 2: sort + view + contador */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="inline-flex items-center rounded-lg border bg-background/60 p-0.5">
                {(['recent', 'alpha', 'progress'] as SortMode[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all',
                      sort === s
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                    )}
                  >
                    {s === 'recent'   && <><Clock className="w-3 h-3" /> Recentes</>}
                    {s === 'alpha'    && <><SortAsc className="w-3 h-3" /> A–Z</>}
                    {s === 'progress' && <><CheckCircle2 className="w-3 h-3" /> Progresso</>}
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div className="inline-flex items-center rounded-lg border bg-background/60 p-0.5">
                <button
                  onClick={() => setView('gallery')}
                  className={cn('p-1.5 rounded-md transition-all', view === 'gallery' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                  title="Galeria"
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={cn('p-1.5 rounded-md transition-all', view === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                  title="Lista"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Limpar filtros */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {!isLoading && courses.length > 0 && (
              <p className="text-xs text-muted-foreground animate-in fade-in duration-200">
                <span className="font-semibold text-foreground tabular-nums">{sorted.length}</span>{' '}
                {sorted.length === 1 ? 'curso' : 'cursos'}
                {hasFilters && <span className="ml-1 text-primary/70">· filtros ativos</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Área scrollável ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-6">
        {isLoading ? (
          <SkeletonGrid />
        ) : sorted.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onNew={() => setIsFormOpen(true)} onClear={clearFilters} />
        ) : view === 'gallery' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map((c) => (
              <CourseGalleryCard
                key={c.id}
                course={c}
                hovered={hoveredId === c.id}
                onHover={setHoveredId}
                onView={() => router.push(`/cursos/${c.id}`)}
              />
            ))}
          </div>
        ) : (
          <CourseListView
            courses={sorted}
            onView={(c) => router.push(`/cursos/${c.id}`)}
          />
        )}
      </div>

      {/* Form modal */}
      <CourseStepperForm
        open={isFormOpen}
        handleClose={() => setIsFormOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}

// ─── Gallery Card ─────────────────────────────────────────────
function CourseGalleryCard({
  course: c, hovered, onHover, onView,
}: {
  course: CourseListItem;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onView: () => void;
}) {
  const status = getCourseStatus(c);
  const statusInfo = STATUS_CONFIG[status];
  const progress = c.user_progress?.completion_percentage ?? 0;
  const gradientClass = SECTOR_COLORS[sectorColorIndex(c.sector_detail?.name ?? '')];

  return (
    <article
      onMouseEnter={() => onHover(c.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-card overflow-hidden transition-all duration-300',
        'hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5',
      )}
    >
      {/* Thumbnail */}
      <button
        onClick={onView}
        className={cn(
          'relative w-full flex items-center justify-center px-5 py-6 overflow-hidden shrink-0 text-left',
          gradientClass,
        )}
        tabIndex={-1}
        aria-hidden
      >
        <span className="relative z-10 text-sm font-semibold text-white leading-snug line-clamp-3">
          {c.name}
        </span>
        {/* Status badge overlay */}
        <span className={cn(
          'absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-medium border-0',
          status === 'completed'   && 'bg-emerald-500/90 text-white',
          status === 'in_progress' && 'bg-blue-500/90 text-white',
          status === 'not_started' && 'bg-black/30 text-white/80',
        )}>
          {statusInfo.label}
        </span>
      </button>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {/* Sector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="h-5 text-[10px] font-normal gap-1 px-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
            {c.sector_detail?.name ?? '—'}
          </Badge>
        </div>

        {/* Tags */}
        {(c.tags_detail?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {c.tags_detail?.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-medium text-white leading-none"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {(c.tags_detail?.length ?? 0) > 3 && (
              <span className="text-[10px] text-muted-foreground">+{(c.tags_detail?.length ?? 0) - 3}</span>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="space-y-1.5 mt-auto">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Progresso</span>
            <span className={cn(
              'font-semibold tabular-nums',
              status === 'completed'   && 'text-emerald-600 dark:text-emerald-400',
              status === 'in_progress' && 'text-blue-600 dark:text-blue-400',
              status === 'not_started' && 'text-muted-foreground',
            )}>
              {Math.round(progress)}%
            </span>
          </div>
          <Progress
            value={progress}
            className={cn(
              'h-1.5',
              status === 'completed'   && '[&>div]:bg-emerald-500',
              status === 'in_progress' && '[&>div]:bg-blue-500',
            )}
          />
        </div>

        {/* Footer */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <PlayCircle className="w-3 h-3 shrink-0" />
            <span>{c.total_lessons} {c.total_lessons === 1 ? 'aula' : 'aulas'}</span>
            <span className="mx-0.5 opacity-40">•</span>
            <Clock className="w-3 h-3 shrink-0" />
            <span>{c.workload_hours}h</span>
          </div>
        </div>
      </div>

      {/* Hover action */}
      <div
        className={cn(
          'absolute top-2.5 right-2.5 flex items-center gap-1 transition-all duration-200',
          hovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none',
        )}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="w-7 h-7 grid place-items-center rounded-md bg-background/90 backdrop-blur border shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
          title="Ver curso"
        >
          <Eye className="w-3 h-3" />
        </button>
      </div>
    </article>
  );
}

// ─── List View ────────────────────────────────────────────────
function CourseListView({
  courses, onView,
}: {
  courses: CourseListItem[];
  onView: (c: CourseListItem) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card/80 backdrop-blur overflow-hidden shadow-sm">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2.5 bg-muted/50 text-[10.5px] uppercase tracking-widest font-semibold text-muted-foreground border-b">
        <span>Curso</span>
        <span className="hidden md:block w-32">Setor</span>
        <span className="hidden md:block w-28 text-center">Progresso</span>
        <span className="hidden md:block w-24">Status</span>
        <span className="w-10" />
      </div>

      {courses.map((c) => {
        const status = getCourseStatus(c);
        const statusInfo = STATUS_CONFIG[status];
        const progress = c.user_progress?.completion_percentage ?? 0;
        const gradientClass = SECTOR_COLORS[sectorColorIndex(c.sector_detail?.name ?? '')];

        return (
          <div
            key={c.id}
            className="group grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => onView(c)}
          >
            {/* Name + tags */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn('w-9 h-9 rounded-xl shrink-0 grid place-items-center', gradientClass)}>
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium truncate group-hover:text-primary transition-colors block">
                  {c.name}
                </span>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {c.tags_detail?.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sector */}
            <span className="hidden md:inline-flex w-32 text-xs text-muted-foreground truncate">
              {c.sector_detail?.name ?? '—'}
            </span>

            {/* Progress */}
            <div className="hidden md:flex w-28 flex-col gap-1">
              <span className="text-xs font-semibold tabular-nums text-right">{Math.round(progress)}%</span>
              <Progress
                value={progress}
                className={cn(
                  'h-1',
                  status === 'completed'   && '[&>div]:bg-emerald-500',
                  status === 'in_progress' && '[&>div]:bg-blue-500',
                )}
              />
            </div>

            {/* Status */}
            <span className="hidden md:inline-flex w-24">
              <Badge className={cn('text-[10px] font-medium border-0', statusInfo.className)}>
                {statusInfo.label}
              </Badge>
            </span>

            {/* Actions */}
            <div className="w-10 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onView(c); }}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Ver"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card overflow-hidden">
          <div className="h-[88px] bg-muted/70" />
          <div className="p-4 space-y-2.5">
            <div className="flex gap-1.5">
              <div className="h-5 bg-muted rounded-full w-20" />
            </div>
            <div className="flex gap-1 pt-1">
              <div className="h-4 bg-muted rounded-md w-12" />
              <div className="h-4 bg-muted rounded-md w-14" />
            </div>
            <div className="h-1.5 bg-muted rounded-full w-full mt-3" />
            <div className="h-px bg-muted rounded mt-2" />
            <div className="h-3 bg-muted rounded w-24 mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────
function EmptyState({
  hasFilters, onNew, onClear,
}: {
  hasFilters: boolean;
  onNew: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-card/40 backdrop-blur text-center gap-5 animate-in fade-in duration-300">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/10 grid place-items-center shadow-inner">
        {hasFilters ? (
          <Search className="w-8 h-8 text-primary/50" />
        ) : (
          <BookMarked className="w-8 h-8 text-primary/50" />
        )}
      </div>
      <div className="max-w-xs">
        <h3 className="font-semibold text-foreground mb-1.5 text-base">
          {hasFilters ? 'Nenhum curso encontrado' : 'Comece sua jornada de aprendizado'}
        </h3>
        <p className="text-sm text-muted-foreground text-balance leading-relaxed">
          {hasFilters
            ? 'Tente ajustar ou limpar os filtros para ver mais resultados.'
            : 'Crie cursos com aulas em vídeo, exercícios e certificados para sua equipe.'}
        </p>
      </div>
      {hasFilters ? (
        <Button variant="outline" size="sm" onClick={onClear}>
          Limpar filtros
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={onNew}
          className="bg-gradient-to-r from-primary to-purple-500 shadow-md shadow-primary/20"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Criar curso
        </Button>
      )}
    </div>
  );
}
