'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { CourseListItem } from '@/types/course.types';
import { cn } from '@/lib/utils/utils';

interface CourseCardProps {
  course: CourseListItem;
  onAccess: (course: CourseListItem) => void;
}

type CourseStatus = 'not_started' | 'in_progress' | 'completed';

const statusConfig: Record<
  CourseStatus,
  { label: string; className: string }
> = {
  not_started: {
    label: 'Não iniciado',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  in_progress: {
    label: 'Em andamento',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  },
  completed: {
    label: 'Concluído',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  },
};

export function CourseCard({ course, onAccess }: CourseCardProps) {
  const getCourseStatus = (course: CourseListItem): CourseStatus => {
    if (!course.user_progress || course.user_progress.completion_percentage === 0) {
      return 'not_started';
    }

    if (course.user_progress.completed_at) {
      return 'completed';
    }

    return 'in_progress';
  };

  const progress = course.user_progress?.completion_percentage || 0;
  const status = getCourseStatus(course);
  const statusInfo = statusConfig[status];

  return (
    <Card
      className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50"
      onClick={() => onAccess(course)}
    >
      <CardHeader className="pb-4">
        {/* Course Name */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-base leading-tight line-clamp-2 flex-1 group-hover:text-primary transition-colors">
            {course.name}
          </h3>

          {/* Status Badge */}
          <Badge className={cn('shrink-0 text-xs', statusInfo.className)}>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Sector and Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {/* Sector */}
          <Badge variant="outline" className="text-xs font-normal">
            {course.sector_detail.name}
          </Badge>

          {/* Tags */}
          {course.tags_detail && course.tags_detail.length > 0 && (
            <>
              {course.tags_detail.slice(0, 2).map((tag) => (
                <Badge
                  key={tag.id}
                  style={{
                    backgroundColor: tag.color,
                    color: '#ffffff',
                  }}
                  className="text-xs font-normal"
                >
                  {tag.name}
                </Badge>
              ))}
              {course.tags_detail.length > 2 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  +{course.tags_detail.length - 2}
                </Badge>
              )}
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className={cn(
              "font-semibold",
              status === 'completed' && "text-green-600 dark:text-green-400",
              status === 'in_progress' && "text-blue-600 dark:text-blue-400",
              status === 'not_started' && "text-muted-foreground"
            )}>
              {Math.round(progress)}%
            </span>
          </div>
          <Progress
            value={progress}
            className={cn(
              "h-2",
              status === 'completed' && "[&>div]:bg-green-600",
              status === 'in_progress' && "[&>div]:bg-blue-600"
            )}
          />
        </div>

        {/* Additional Info */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span>{course.total_lessons} aulas</span>
          <span>•</span>
          <span>{course.workload_hours}h</span>
        </div>
      </CardContent>
    </Card>
  );
}
