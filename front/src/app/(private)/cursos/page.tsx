'use client';

import { useState, useEffect, useMemo } from 'react';
import { CourseCard } from '@/components/courses/CourseCard';
import { getCourses } from '@/lib/api/courses';
import { getTags } from '@/lib/api/tags';
import { getSectors } from '@/lib/api/sectors';
import { toast } from '@/hooks/use-toast';
import type { CourseListItem } from '@/types/course.types';
import type { Tag } from '@/types/tag.types';
import type { Sector } from '@/types/sector.types';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import CourseStepperForm from '@/components/forms/CourseStepperForm';
import { Badge } from '@/components/ui/badge';

type CourseStatus = 'all' | 'not_started' | 'in_progress' | 'completed';

export default function CursosPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<CourseStatus>('all');

  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [coursesResponse, tagsResponse, sectorsResponse] = await Promise.all([
        getCourses({ is_active: 'true' }),
        getTags({ is_active: 'true', page_size: 100 }),
        getSectors({ is_active: 'true', page_size: 100 }),
      ]);

      setCourses(coursesResponse.results);
      setTags(tagsResponse.results);
      setSectors(sectorsResponse.results);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCourseStatus = (course: CourseListItem): CourseStatus => {
    if (!course.user_progress || course.user_progress.completion_percentage === 0) {
      return 'not_started';
    }

    if (course.user_progress.completed_at) {
      return 'completed';
    }

    return 'in_progress';
  };

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          course.name.toLowerCase().includes(searchLower) ||
          course.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Tags filter
      if (selectedTags.length > 0) {
        const hasTag = selectedTags.some((tagId) => course.tags.includes(tagId));
        if (!hasTag) return false;
      }

      // Sector filter
      if (selectedSector && selectedSector !== 'all') {
        if (course.sector !== selectedSector) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const courseStatus = getCourseStatus(course);
        if (courseStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [courses, searchTerm, selectedTags, selectedSector, statusFilter]);

  const handleAccessCourse = (course: CourseListItem) => {
    router.push(`/cursos/${course.id}`);
  };

  const handleCourseCreated = () => {
    fetchData();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setSelectedSector('');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchTerm || selectedTags.length > 0 || selectedSector || statusFilter !== 'all';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header padronizado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cursos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Explore os cursos disponíveis</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} size="sm" className="h-9 shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Curso
        </Button>
      </div>

      {/* Barra de busca + Filtros — compactados em uma única área */}
      <div className="flex flex-col gap-3 p-4 rounded-xl border border-border/60 bg-muted/20">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cursos por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CourseStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="not_started">Não iniciado</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>

            {/* Tags Filter */}
            <MultiSelect
              options={tags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                color: tag.color,
              }))}
              selected={selectedTags}
              onChange={setSelectedTags}
              placeholder="Todas as tags"
              emptyText="Nenhuma tag encontrada"
            />

            {/* Sector Filter */}
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos os setores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector.id} value={sector.id}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="shrink-0 h-9"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Contador de resultados dentro do bloco de filtros */}
        {!isLoading && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              {filteredCourses.length === courses.length ? (
                <><span className="font-medium text-foreground">{courses.length}</span> {courses.length === 1 ? 'curso' : 'cursos'}</>
              ) : (
                <><span className="font-medium text-foreground">{filteredCourses.length}</span> de <span className="font-medium text-foreground">{courses.length}</span> {courses.length === 1 ? 'curso' : 'cursos'}</>
              )}
            </p>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-[11px] h-5">
                Filtros ativos
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        /* Skeleton durante carregamento */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border rounded-xl bg-card p-5 space-y-3 animate-pulse">
              <div className="h-5 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-4/5" />
              <div className="h-2 bg-muted rounded-full w-full mt-4" />
              <div className="flex gap-2 pt-1">
                <div className="h-8 bg-muted rounded-lg flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        /* Empty state amigável */
        <div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-muted/20 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
            <Plus className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {hasActiveFilters ? 'Nenhum curso encontrado com os filtros aplicados' : 'Nenhum curso disponível no momento'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters ? 'Tente ajustar ou limpar os filtros' : 'Crie o primeiro curso para começar'}
            </p>
          </div>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Limpar filtros
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsFormOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo Curso
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} onAccess={handleAccessCourse} />
          ))}
        </div>
      )}

      {/* Course Stepper Form */}
      <CourseStepperForm open={isFormOpen} handleClose={() => setIsFormOpen(false)} onSuccess={handleCourseCreated} />
    </div>
  );
}
