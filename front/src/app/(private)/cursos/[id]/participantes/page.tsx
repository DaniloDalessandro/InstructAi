'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourse, getCourseParticipants } from '@/lib/api/courses';
import { getSectors } from '@/lib/api/sectors';
import type { Course } from '@/types/course.types';
import type {
  CourseParticipant,
  CourseParticipantsResponse,
  ParticipantStatus,
  ParticipantsFilters,
} from '@/types/course.types';
import type { Sector } from '@/types/sector.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Trophy,
  TrendingUp,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ParticipantStatus, string> = {
  completed: 'Concluído',
  in_progress: 'Em Andamento',
  pending: 'Pendente',
};

const STATUS_COLOR: Record<ParticipantStatus, string> = {
  completed: 'bg-green-500/15 text-green-400 border-green-500/30',
  in_progress: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  pending: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

const STATUS_DOT: Record<ParticipantStatus, string> = {
  completed: 'bg-green-400',
  in_progress: 'bg-amber-400',
  pending: 'bg-zinc-500',
};

function StatusBadge({ status }: { status: ParticipantStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_COLOR[status]
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCPF(cpf: string | null) {
  if (!cpf) return '—';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf;
}

// ─── Summary Cards ───────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

function SummaryCard({ label, value, sub, icon, color }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <p className={cn('mt-1 text-3xl font-bold', color)}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
        </div>
        <div className={cn('rounded-lg p-2.5', color === 'text-white' ? 'bg-zinc-800' : 'bg-zinc-800')}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0 bg-zinc-800" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-48 bg-zinc-800" />
            <Skeleton className="h-3 w-32 bg-zinc-800" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full bg-zinc-800" />
          <Skeleton className="h-3.5 w-24 bg-zinc-800" />
          <Skeleton className="h-3.5 w-20 bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-zinc-800 p-4 mb-4">
        <Users className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-200">
        {filtered ? 'Nenhum resultado encontrado' : 'Nenhum participante ainda'}
      </h3>
      <p className="mt-1 text-sm text-zinc-500 max-w-xs">
        {filtered
          ? 'Tente ajustar os filtros para encontrar participantes.'
          : 'Quando usuários acessarem o curso, eles aparecerão aqui.'}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: ParticipantsFilters = {
  search: '',
  cpf: '',
  sector: '',
  status: 'all',
  ordering: 'name',
  page: 1,
  page_size: 20,
};

export default function CourseParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [data, setData] = useState<CourseParticipantsResponse | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [filters, setFilters] = useState<ParticipantsFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch course info once
  useEffect(() => {
    Promise.all([
      getCourse(courseId),
      getSectors({ page_size: 200, is_active: 'true' }),
    ])
      .then(([courseData, sectorsData]) => {
        setCourse(courseData);
        setSectors(sectorsData.results);
      })
      .catch(() => {
        toast({ title: 'Erro', description: 'Não foi possível carregar o curso.', variant: 'destructive' });
        router.push(`/cursos/${courseId}`);
      });
  }, [courseId, router]);

  // Fetch participants whenever filters change
  const fetchParticipants = useCallback(
    async (f: ParticipantsFilters, showTableLoader = true) => {
      if (showTableLoader) setIsTableLoading(true);
      try {
        const result = await getCourseParticipants(courseId, f);
        setData(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar participantes';
        if (message.includes('403') || message.toLowerCase().includes('permissão')) {
          toast({
            title: 'Sem permissão',
            description: 'Você não tem permissão para ver os participantes deste curso.',
            variant: 'destructive',
          });
          router.push(`/cursos/${courseId}`);
        } else {
          toast({ title: 'Erro', description: message, variant: 'destructive' });
        }
      } finally {
        setIsLoading(false);
        setIsTableLoading(false);
      }
    },
    [courseId, router]
  );

  useEffect(() => {
    fetchParticipants(filters, isLoading ? false : true);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleSearchChange = (value: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value, page: 1 }));
    }, 400);
  };

  const handleFilterChange = <K extends keyof ParticipantsFilters>(
    key: K,
    value: ParticipantsFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportCSV = async () => {
    if (!data) return;
    setExportLoading(true);
    try {
      // Fetch all pages for export
      const allParticipants: CourseParticipant[] = [];
      let page = 1;
      while (true) {
        const chunk = await getCourseParticipants(courseId, { ...filters, page, page_size: 100 });
        allParticipants.push(...chunk.results);
        if (!chunk.has_next) break;
        page++;
      }

      const headers = ['Nome', 'Email', 'CPF', 'Setor', 'Cargo', 'Status', 'Progresso (%)', 'Nota', 'Conclusão', 'Último Acesso'];
      const rows = allParticipants.map((p) => [
        p.name,
        p.email,
        formatCPF(p.cpf),
        p.sector_name || '—',
        p.position || '—',
        STATUS_LABEL[p.status],
        p.completion_percentage,
        p.exam_score !== null ? p.exam_score : '—',
        formatDate(p.completed_at),
        formatDateTime(p.last_access),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `participantes-${course?.name ?? courseId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível exportar.', variant: 'destructive' });
    } finally {
      setExportLoading(false);
    }
  };

  const isFiltered =
    filters.search !== '' ||
    filters.cpf !== '' ||
    filters.sector !== '' ||
    filters.status !== 'all';

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-zinc-800" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-xl bg-zinc-800" />
        <TableSkeleton />
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="text-zinc-100">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/cursos/${courseId}`)}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar ao curso
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Participantes</h1>
            {course && (
              <p className="mt-0.5 text-sm text-zinc-400">{course.name}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={exportLoading || !data || data.count === 0}
            className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Download className="mr-2 h-4 w-4" />
            {exportLoading ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SummaryCard
              label="Total"
              value={summary.total}
              sub="participantes"
              icon={<Users className="h-5 w-5 text-zinc-400" />}
              color="text-white"
            />
            <SummaryCard
              label="Concluíram"
              value={summary.completed}
              sub={`de ${summary.total}`}
              icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
              color="text-green-400"
            />
            <SummaryCard
              label="Em Andamento"
              value={summary.in_progress}
              sub="iniciados"
              icon={<Clock className="h-5 w-5 text-amber-400" />}
              color="text-amber-400"
            />
            <SummaryCard
              label="Pendentes"
              value={summary.pending}
              sub="não iniciados"
              icon={<XCircle className="h-5 w-5 text-zinc-400" />}
              color="text-zinc-300"
            />
            <div className="col-span-2 lg:col-span-1 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm text-zinc-400">Conclusão</p>
              <p className="mt-1 text-3xl font-bold text-violet-400">{summary.completion_percentage}%</p>
              <Progress
                value={summary.completion_percentage}
                className="mt-3 h-1.5 bg-zinc-800"
              />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Search by name */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Buscar por nome ou email..."
                defaultValue={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500"
              />
            </div>

            {/* Search by CPF */}
            <div className="w-full sm:w-44">
              <Input
                placeholder="Buscar por CPF..."
                defaultValue={filters.cpf}
                onChange={(e) => handleFilterChange('cpf', e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500"
              />
            </div>

            {/* Sector filter */}
            <Select
              value={filters.sector || '__all__'}
              onValueChange={(v) => handleFilterChange('sector', v === '__all__' ? '' : v)}
            >
              <SelectTrigger className="w-full sm:w-44 bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-violet-500">
                <SelectValue placeholder="Todos os setores" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="__all__" className="text-zinc-300 focus:bg-zinc-800">Todos os setores</SelectItem>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-zinc-300 focus:bg-zinc-800">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={filters.status}
              onValueChange={(v) => handleFilterChange('status', v as ParticipantsFilters['status'])}
            >
              <SelectTrigger className="w-full sm:w-44 bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-violet-500">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all" className="text-zinc-300 focus:bg-zinc-800">Todos</SelectItem>
                <SelectItem value="completed" className="text-green-400 focus:bg-zinc-800">Concluído</SelectItem>
                <SelectItem value="in_progress" className="text-amber-400 focus:bg-zinc-800">Em Andamento</SelectItem>
                <SelectItem value="pending" className="text-zinc-400 focus:bg-zinc-800">Pendente</SelectItem>
              </SelectContent>
            </Select>

            {/* Ordering */}
            <Select
              value={filters.ordering}
              onValueChange={(v) => handleFilterChange('ordering', v as ParticipantsFilters['ordering'])}
            >
              <SelectTrigger className="w-full sm:w-44 bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-violet-500">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="name" className="text-zinc-300 focus:bg-zinc-800">Nome A-Z</SelectItem>
                <SelectItem value="-name" className="text-zinc-300 focus:bg-zinc-800">Nome Z-A</SelectItem>
                <SelectItem value="recent" className="text-zinc-300 focus:bg-zinc-800">Mais recentes</SelectItem>
                <SelectItem value="pending_first" className="text-zinc-300 focus:bg-zinc-800">Pendentes primeiro</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-zinc-400 hover:text-zinc-100 whitespace-nowrap"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Count */}
        {data && (
          <p className="text-sm text-zinc-500">
            {data.count === 0
              ? 'Nenhum participante encontrado'
              : `${data.count} participante${data.count !== 1 ? 's' : ''} encontrado${data.count !== 1 ? 's' : ''}`}
            {data.total_pages > 1 && ` — página ${data.current_page} de ${data.total_pages}`}
          </p>
        )}

        {/* Table */}
        {isTableLoading ? (
          <TableSkeleton />
        ) : !data || data.results.length === 0 ? (
          <EmptyState filtered={isFiltered} />
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            {/* Sticky header */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Participante</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">CPF</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Setor</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Cargo</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Progresso</th>
                    {course?.has_final_exam && (
                      <th className="px-4 py-3 text-left font-medium text-zinc-400">Nota</th>
                    )}
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Conclusão</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Último Acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                  {data.results.map((participant) => (
                    <ParticipantRow
                      key={participant.user_id}
                      participant={participant}
                      showExam={course?.has_final_exam ?? false}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Mostrando {(filters.page - 1) * filters.page_size + 1}–
              {Math.min(filters.page * filters.page_size, data.count)} de {data.count}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={!data.has_previous}
                className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {/* Page numbers */}
              {Array.from({ length: data.total_pages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - filters.page) <= 2)
                .map((p) => (
                  <Button
                    key={p}
                    variant={p === filters.page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(p)}
                    className={cn(
                      'w-9 border-zinc-700',
                      p === filters.page
                        ? 'bg-violet-600 text-white hover:bg-violet-700 border-violet-600'
                        : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    {p}
                  </Button>
                ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={!data.has_next}
                className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function ParticipantRow({
  participant,
  showExam,
}: {
  participant: CourseParticipant;
  showExam: boolean;
}) {
  const initials = participant.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <tr className="group hover:bg-zinc-900/60 transition-colors">
      {/* Name + email */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
            {initials}
          </div>
          <div>
            <p className="font-medium text-zinc-100">{participant.name}</p>
            <p className="text-xs text-zinc-500">{participant.email}</p>
          </div>
        </div>
      </td>

      {/* CPF */}
      <td className="px-4 py-3 text-zinc-400 tabular-nums">
        {formatCPF(participant.cpf)}
      </td>

      {/* Sector */}
      <td className="px-4 py-3 text-zinc-400">
        {participant.sector_name ?? '—'}
      </td>

      {/* Position */}
      <td className="px-4 py-3 text-zinc-400">
        {participant.position ?? '—'}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={participant.status} />
      </td>

      {/* Progress */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Progress
            value={participant.completion_percentage}
            className="h-1.5 w-20 bg-zinc-800"
          />
          <span className="text-xs text-zinc-400 tabular-nums w-9">
            {participant.completion_percentage}%
          </span>
        </div>
      </td>

      {/* Exam score */}
      {showExam && (
        <td className="px-4 py-3 text-zinc-400 tabular-nums">
          {participant.exam_score !== null ? (
            <span
              className={cn(
                'font-medium',
                participant.exam_passed ? 'text-green-400' : 'text-red-400'
              )}
            >
              {participant.exam_score}%
            </span>
          ) : (
            '—'
          )}
        </td>
      )}

      {/* Completed at */}
      <td className="px-4 py-3 text-zinc-400 text-xs tabular-nums">
        {formatDate(participant.completed_at)}
      </td>

      {/* Last access */}
      <td className="px-4 py-3 text-zinc-400 text-xs tabular-nums">
        {formatDateTime(participant.last_access)}
      </td>
    </tr>
  );
}
