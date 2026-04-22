from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Course, Lesson, Question, CourseProgress, LessonProgress, Certificate
from .serializers import (
    CourseSerializer, CourseListSerializer, LessonSerializer,
    QuestionSerializer, QuestionPublicSerializer,
    CourseProgressSerializer, LessonProgressSerializer, CertificateSerializer
)
from .permissions import IsOwnerOrReadOnly


class CourseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Course model
    """
    queryset = Course.objects.all().prefetch_related('tags', 'lessons', 'questions')
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'sector', 'tags', 'has_final_exam']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Use different serializer for list"""
        if self.action == 'list':
            return CourseListSerializer
        return CourseSerializer

    def get_queryset(self):
        """Filter active courses by default"""
        queryset = Course.objects.all().prefetch_related('tags', 'lessons', 'questions').select_related('sector')
        is_active = self.request.query_params.get('is_active', None)

        if is_active is None:
            queryset = queryset.filter(is_active=True)
        elif is_active.lower() in ['true', '1', 'yes']:
            queryset = queryset.filter(is_active=True)
        elif is_active.lower() in ['false', '0', 'no']:
            queryset = queryset.filter(is_active=False)

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Get user progress for this course"""
        course = self.get_object()
        progress, created = CourseProgress.objects.get_or_create(
            user=request.user,
            course=course
        )
        serializer = CourseProgressSerializer(progress)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def lessons_progress(self, request, pk=None):
        """Get user progress for all lessons in this course"""
        course = self.get_object()
        lessons = course.lessons.filter(is_active=True).order_by('order')
        progress_data = []

        for lesson in lessons:
            progress, created = LessonProgress.objects.get_or_create(
                user=request.user,
                lesson=lesson
            )
            progress_data.append({
                'lesson_id': lesson.id,
                'lesson_name': lesson.name,
                'lesson_order': lesson.order,
                'youtube_url': lesson.youtube_url,
                'youtube_video_id': lesson.get_youtube_video_id(),
                'is_completed': progress.is_completed,
                'completed_at': progress.completed_at
            })

        return Response(progress_data)

    @action(detail=True, methods=['get'])
    def exam(self, request, pk=None):
        """Get exam questions for this course (without correct answers)"""
        course = self.get_object()

        if not course.has_final_exam:
            return Response(
                {'error': 'Este curso não possui prova final'},
                status=status.HTTP_400_BAD_REQUEST
            )

        questions = course.questions.all().order_by('order')
        serializer = QuestionPublicSerializer(questions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def submit_exam(self, request, pk=None):
        """Submit exam answers and calculate score"""
        course = self.get_object()

        if not course.has_final_exam:
            return Response(
                {'error': 'Este curso não possui prova final'},
                status=status.HTTP_400_BAD_REQUEST
            )

        answers = request.data.get('answers', {})  # {question_id: index_int}
        questions = course.questions.all()

        if len(answers) != questions.count():
            return Response(
                {'error': 'Você deve responder todas as questões'},
                status=status.HTTP_400_BAD_REQUEST
            )

        correct_count = 0
        question_results = {}
        for question in questions:
            q_id = str(question.id)
            if q_id in answers:
                user_answer = int(answers[q_id])
                is_correct = user_answer == question.correct_option
                if is_correct:
                    correct_count += 1
                question_results[q_id] = {
                    'correct': is_correct,
                    'your_answer': user_answer,
                    'correct_answer': question.correct_option,
                }

        score = int((correct_count / questions.count()) * 100)
        passed = score >= course.passing_score

        # Update course progress
        progress, created = CourseProgress.objects.get_or_create(
            user=request.user,
            course=course
        )
        progress.exam_score = score
        progress.exam_passed = passed
        progress.save()

        return Response({
            'score': score,
            'passed': passed,
            'correct_count': correct_count,
            'total_questions': questions.count(),
            'passing_score': course.passing_score,
            'question_results': question_results,
        })


class LessonViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Lesson model
    """
    queryset = Lesson.objects.all().select_related('course')
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['course', 'is_active']
    ordering_fields = ['order', 'created_at']
    ordering = ['order']

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark lesson as completed"""
        lesson = self.get_object()

        # Create or update lesson progress
        progress, created = LessonProgress.objects.get_or_create(
            user=request.user,
            lesson=lesson
        )

        if not progress.is_completed:
            progress.is_completed = True
            progress.completed_at = timezone.now()
            progress.save()

            # Update course completion percentage
            self._update_course_progress(lesson.course, request.user)

        serializer = LessonProgressSerializer(progress)
        return Response(serializer.data)

    def _update_course_progress(self, course, user):
        """Calculate and update course completion percentage"""
        total_lessons = course.lessons.filter(is_active=True).count()
        if total_lessons == 0:
            # Curso sem aulas: considera 100% se só tem prova
            progress, _ = CourseProgress.objects.get_or_create(user=user, course=course)
            progress.completion_percentage = 100
            if not course.has_final_exam or progress.exam_passed:
                if not progress.completed_at:
                    from django.utils import timezone
                    progress.completed_at = timezone.now()
            progress.save()
            return

        completed_lessons = LessonProgress.objects.filter(
            user=user,
            lesson__course=course,
            lesson__is_active=True,
            is_completed=True
        ).count()

        completion_percentage = int((completed_lessons / total_lessons) * 100)

        progress, created = CourseProgress.objects.get_or_create(
            user=user,
            course=course
        )
        progress.completion_percentage = completion_percentage

        # Mark as completed if 100%
        if completion_percentage == 100 and not progress.completed_at:
            if not course.has_final_exam or progress.exam_passed:
                progress.completed_at = timezone.now()

        progress.save()


class QuestionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Question model
    """
    queryset = Question.objects.all().select_related('course')
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['course']
    ordering_fields = ['order', 'created_at']
    ordering = ['order']


class CourseProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for CourseProgress model (read-only)
    """
    serializer_class = CourseProgressSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course', 'exam_passed']

    def get_queryset(self):
        """Return only current user's progress"""
        return CourseProgress.objects.filter(user=self.request.user).select_related('course')


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Certificate model
    """
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course']

    def get_queryset(self):
        """Return only current user's certificates"""
        return Certificate.objects.filter(user=self.request.user).select_related('course')

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate certificate for a course"""
        course_id = request.data.get('course_id')

        if not course_id:
            return Response(
                {'error': 'course_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Curso não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user has completed the course
        try:
            progress = CourseProgress.objects.get(user=request.user, course=course)
        except CourseProgress.DoesNotExist:
            return Response(
                {'error': 'Você ainda não iniciou este curso'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not progress.can_generate_certificate():
            return Response(
                {'error': 'Você ainda não concluiu todos os requisitos do curso'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if certificate already exists
        certificate, created = Certificate.objects.get_or_create(
            user=request.user,
            course=course
        )

        if created:
            # TODO: Generate PDF certificate
            # For now, just create the record
            pass

        serializer = CertificateSerializer(certificate, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
