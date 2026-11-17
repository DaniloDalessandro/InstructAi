from datetime import timedelta

from django.utils import timezone
from django.db.models import Q, Count, Avg
from django.db.models.functions import TruncDate
from rest_framework import viewsets, filters, status, serializers as s
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import (
    extend_schema, extend_schema_view, OpenApiParameter, OpenApiResponse, inline_serializer,
)
from drf_spectacular.types import OpenApiTypes
from .models import Course, Lesson, Question, CourseProgress, LessonProgress, Certificate, IssuingCompany
from .serializers import (
    CourseSerializer, CourseListSerializer, LessonSerializer,
    QuestionSerializer, QuestionPublicSerializer,
    CourseProgressSerializer, LessonProgressSerializer, CertificateSerializer
)
from access.permissions import ContentPermission, CanManageAccess

_detail_msg = inline_serializer("CourseDetailMsg", {"detail": s.CharField()})
_error_msg = inline_serializer("CourseErrorMsg", {"error": s.CharField()})
_shared_admins_response = inline_serializer("CourseSharedAdmins", {
    "shared_admins": inline_serializer("CourseAdminInfo", {
        "id": s.IntegerField(),
        "email": s.EmailField(),
        "name": s.CharField(),
    }, many=True),
})


@extend_schema_view(
    list=extend_schema(
        tags=["Cursos"],
        summary="Lista cursos",
        parameters=[
            OpenApiParameter("is_active", OpenApiTypes.BOOL, description="Filtra por status (padrão: true)"),
            OpenApiParameter("sector", OpenApiTypes.INT, description="Filtra por setor"),
            OpenApiParameter("tags", OpenApiTypes.INT, description="Filtra por tag"),
            OpenApiParameter("has_final_exam", OpenApiTypes.BOOL, description="Filtra cursos com prova"),
            OpenApiParameter("search", OpenApiTypes.STR, description="Busca por nome ou descrição"),
        ],
    ),
    retrieve=extend_schema(tags=["Cursos"], summary="Detalha curso"),
    create=extend_schema(tags=["Cursos"], summary="Cria curso"),
    update=extend_schema(tags=["Cursos"], summary="Atualiza curso"),
    partial_update=extend_schema(tags=["Cursos"], summary="Atualiza curso parcialmente"),
    destroy=extend_schema(tags=["Cursos"], summary="Remove curso"),
)
class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all().prefetch_related('tags', 'lessons', 'questions')
    permission_classes = [IsAuthenticated, ContentPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'sector', 'tags', 'has_final_exam']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        return CourseSerializer

    def get_queryset(self):
        """
        Retorna cursos filtrados por visibilidade do usuário:
        - Admins (is_staff/is_superuser): veem tudo
        - Owners / shared_admins: sempre veem seus cursos
        - Usuários comuns: respeitam filtro de setor e janela de datas
        """
        user = self.request.user
        now = timezone.now()

        base = (
            Course.objects
            .prefetch_related('tags', 'lessons', 'questions', 'allowed_sectors')
            .select_related('sector')
        )

        # Filtro is_active
        is_active_param = self.request.query_params.get('is_active', None)
        if is_active_param is None:
            base = base.filter(is_active=True)
        elif is_active_param.lower() in ['true', '1', 'yes']:
            base = base.filter(is_active=True)
        elif is_active_param.lower() in ['false', '0', 'no']:
            base = base.filter(is_active=False)

        # Admins do sistema veem tudo
        if user.is_staff or user.is_superuser:
            return base.order_by('-created_at')

        # Condição de setor: todos os setores OU setor do usuário está na lista
        user_sector_id = getattr(user, 'sector_id', None)
        if user_sector_id:
            sector_q = Q(available_for_all_sectors=True) | Q(allowed_sectors=user_sector_id)
        else:
            sector_q = Q(available_for_all_sectors=True)

        # Condição de data: dentro do período ou sem período
        time_q = (
            Q(available_from__isnull=True) | Q(available_from__lte=now)
        ) & (
            Q(available_until__isnull=True) | Q(available_until__gte=now)
        )

        # Owners e shared_admins bypassam filtros de setor/data
        owned_q = Q(owner=user) | Q(shared_admins=user)

        visibility_q = owned_q | (sector_q & time_q)
        return base.filter(visibility_q).distinct().order_by('-created_at')

    def perform_create(self, serializer):
        from access.models import log_action
        instance = serializer.save(owner=self.request.user)
        log_action(self.request.user, 'create', 'course', instance, request=self.request)

    def perform_update(self, serializer):
        from access.models import log_action
        instance = serializer.save()
        log_action(self.request.user, 'update', 'course', instance, request=self.request)

    def perform_destroy(self, instance):
        from access.models import log_action
        log_action(self.request.user, 'delete', 'course', instance, request=self.request)
        instance.delete()

    @extend_schema(
        tags=["Cursos"],
        summary="Gerencia administradores delegados do curso",
        request=inline_serializer("CourseShareRequest", {
            "add": s.ListField(child=s.EmailField(), required=False),
            "remove": s.ListField(child=s.EmailField(), required=False),
        }),
        responses={200: _shared_admins_response},
    )
    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticated, CanManageAccess])
    def share(self, request, pk=None):
        """
        GET  — lista os administradores delegados.
        POST — { "add": ["email@..."], "remove": ["email@..."] }
        """
        from django.contrib.auth import get_user_model
        from access.models import log_action

        course = self.get_object()
        User = get_user_model()

        if request.method == 'GET':
            admins = course.shared_admins.values('id', 'email', 'name')
            return Response({'shared_admins': list(admins)})

        errors = []
        for email in request.data.get('add', []):
            try:
                user = User.objects.get(email=email)
                if user == course.owner:
                    errors.append(f'{email} já é o dono do curso.')
                    continue
                course.shared_admins.add(user)
                log_action(request.user, 'grant_admin', 'course', course,
                           {'target_user': user.email}, request)
            except User.DoesNotExist:
                errors.append(f'Usuário {email} não encontrado.')

        for email in request.data.get('remove', []):
            try:
                user = User.objects.get(email=email)
                course.shared_admins.remove(user)
                log_action(request.user, 'revoke_admin', 'course', course,
                           {'target_user': user.email}, request)
            except User.DoesNotExist:
                pass

        admins = course.shared_admins.values('id', 'email', 'name')
        data = {'shared_admins': list(admins)}
        if errors:
            data['errors'] = errors
        return Response(data)

    @extend_schema(
        tags=["Cursos"],
        summary="Envia ou agenda notificação por e-mail para usuários elegíveis",
        responses={
            200: inline_serializer("NotificationResult", {
                "detail": s.CharField(),
                "recipient_count": s.IntegerField(),
                "scheduled": s.BooleanField(),
                "scheduled_for": s.DateTimeField(allow_null=True),
            }),
        },
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanManageAccess])
    def send_notification(self, request, pk=None):
        """
        Envia (ou agenda) notificação por e-mail para usuários elegíveis.
        Se o curso tem available_from no futuro, agenda a tarefa para essa data.
        Caso contrário, dispara imediatamente.
        """
        from .tasks import send_course_notification
        from django.contrib.auth import get_user_model

        course = self.get_object()
        User = get_user_model()
        now = timezone.now()

        recipients = User.objects.filter(is_active=True).exclude(email='')
        if not course.available_for_all_sectors:
            allowed = course.allowed_sectors.all()
            if allowed.exists():
                recipients = recipients.filter(sector__in=allowed)
        recipient_count = recipients.count()

        if recipient_count == 0:
            return Response(
                {'detail': 'Nenhum usuário elegível encontrado para envio.'},
                status=status.HTTP_200_OK,
            )

        # Agendar ou disparar imediatamente
        scheduled = False
        if course.available_from and course.available_from > now:
            send_course_notification.apply_async(
                args=[course.id],
                eta=course.available_from,
            )
            scheduled = True
        else:
            send_course_notification.delay(course.id)

        return Response({
            'detail': (
                f'Notificação agendada para {course.available_from.strftime("%d/%m/%Y %H:%M")}.'
                if scheduled
                else f'Notificação disparada para {recipient_count} usuário(s).'
            ),
            'recipient_count': recipient_count,
            'scheduled': scheduled,
            'scheduled_for': course.available_from.isoformat() if scheduled else None,
        })

    @extend_schema(
        tags=["Cursos"],
        summary="Lista participantes do curso com status de progresso (admin)",
        parameters=[
            OpenApiParameter("search", OpenApiTypes.STR, description="Busca por nome ou e-mail"),
            OpenApiParameter("cpf", OpenApiTypes.STR, description="Filtra por CPF"),
            OpenApiParameter("sector", OpenApiTypes.INT, description="Filtra por setor"),
            OpenApiParameter("status", OpenApiTypes.STR, enum=["all", "completed", "in_progress", "pending"]),
            OpenApiParameter("ordering", OpenApiTypes.STR, enum=["name", "-name", "recent", "pending_first"]),
            OpenApiParameter("page", OpenApiTypes.INT),
            OpenApiParameter("page_size", OpenApiTypes.INT, description="Máx 100"),
        ],
    )
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, CanManageAccess], filter_backends=[])
    def participants(self, request, pk=None):
        from django.contrib.auth import get_user_model
        from django.db.models import (
            Subquery, OuterRef, Value, IntegerField, BooleanField,
            Q, Count, Case, When
        )
        from django.db.models.functions import Coalesce
        from django.core.paginator import Paginator

        course = self.get_object()
        User = get_user_model()
        has_exam = course.has_final_exam

        # Subqueries para buscar progresso do usuário neste curso
        progress_qs = CourseProgress.objects.filter(course=course, user=OuterRef('pk'))

        users = (
            User.objects.filter(is_active=True)
            .select_related('sector')
            .annotate(
                completion=Coalesce(
                    Subquery(progress_qs.values('completion_percentage')[:1]),
                    Value(0),
                    output_field=IntegerField(),
                ),
                exam_passed_val=Coalesce(
                    Subquery(progress_qs.values('exam_passed')[:1]),
                    Value(False),
                    output_field=BooleanField(),
                ),
                exam_score_val=Subquery(progress_qs.values('exam_score')[:1]),
                completed_at_val=Subquery(progress_qs.values('completed_at')[:1]),
                last_access_val=Subquery(progress_qs.values('updated_at')[:1]),
            )
        )

        # Filtros
        search = request.query_params.get('search', '').strip()
        if search:
            users = users.filter(Q(name__icontains=search) | Q(email__icontains=search))

        cpf_param = request.query_params.get('cpf', '').strip()
        if cpf_param:
            users = users.filter(cpf__icontains=cpf_param)

        sector_id = request.query_params.get('sector', '').strip()
        if sector_id:
            users = users.filter(sector_id=sector_id)

        # Condições de status
        if has_exam:
            completed_q = Q(completion=100) & Q(exam_passed_val=True)
        else:
            completed_q = Q(completion=100)
        in_progress_q = Q(completion__gt=0) & ~completed_q
        pending_q = Q(completion=0)

        # Resumo (antes do filtro de status)
        summary = users.aggregate(
            total=Count('id'),
            completed=Count('id', filter=completed_q),
            in_progress=Count('id', filter=in_progress_q),
            pending=Count('id', filter=pending_q),
        )
        total = summary['total']
        completed_count = summary['completed']
        completion_pct = round(completed_count / total * 100, 1) if total > 0 else 0.0

        # Filtro por status
        status_filter = request.query_params.get('status', 'all')
        if status_filter == 'completed':
            users = users.filter(completed_q)
        elif status_filter == 'in_progress':
            users = users.filter(in_progress_q)
        elif status_filter == 'pending':
            users = users.filter(pending_q)

        # Ordenação
        ordering_map = {
            'name': 'name',
            '-name': '-name',
            'recent': '-last_access_val',
            'pending_first': 'completion',
        }
        ordering = request.query_params.get('ordering', 'name')
        users = users.order_by(ordering_map.get(ordering, 'name'))

        # Paginação
        try:
            page_size = min(int(request.query_params.get('page_size', 20)), 100)
        except (ValueError, TypeError):
            page_size = 20
        try:
            page_number = max(int(request.query_params.get('page', 1)), 1)
        except (ValueError, TypeError):
            page_number = 1
        paginator = Paginator(users, page_size)
        page_obj = paginator.get_page(page_number)

        def get_status(user):
            if has_exam:
                if user.completion == 100 and user.exam_passed_val:
                    return 'completed'
            else:
                if user.completion == 100:
                    return 'completed'
            if user.completion > 0:
                return 'in_progress'
            return 'pending'

        results = [
            {
                'user_id': user.id,
                'name': user.name,
                'email': user.email,
                'cpf': user.cpf or None,
                'sector_id': user.sector_id,
                'sector_name': user.sector.name if user.sector else None,
                'position': user.position or None,
                'status': get_status(user),
                'completion_percentage': user.completion,
                'exam_score': user.exam_score_val,
                'exam_passed': user.exam_passed_val,
                'completed_at': user.completed_at_val,
                'last_access': user.last_access_val,
            }
            for user in page_obj
        ]

        return Response({
            'summary': {
                'total': total,
                'completed': completed_count,
                'in_progress': summary['in_progress'],
                'pending': summary['pending'],
                'completion_percentage': completion_pct,
            },
            'count': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': page_number,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'results': results,
        })

    @extend_schema(tags=["Cursos"], summary="Retorna progresso do usuário autenticado no curso",
                   responses={200: CourseProgressSerializer})
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        course = self.get_object()
        progress, created = CourseProgress.objects.get_or_create(
            user=request.user,
            course=course
        )
        serializer = CourseProgressSerializer(progress)
        return Response(serializer.data)

    @extend_schema(tags=["Cursos"], summary="Retorna progresso por aula do usuário autenticado")
    @action(detail=True, methods=['get'])
    def lessons_progress(self, request, pk=None):
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

    @extend_schema(tags=["Cursos"], summary="Retorna questões da prova final (sem gabarito)",
                   responses={200: QuestionPublicSerializer(many=True), 400: _error_msg})
    @action(detail=True, methods=['get'])
    def exam(self, request, pk=None):
        course = self.get_object()

        if not course.has_final_exam:
            return Response(
                {'error': 'Este curso não possui prova final'},
                status=status.HTTP_400_BAD_REQUEST
            )

        questions = course.questions.all().order_by('order')
        serializer = QuestionPublicSerializer(questions, many=True)
        return Response(serializer.data)

    @extend_schema(
        tags=["Cursos"],
        summary="Submete respostas da prova e calcula nota",
        request=inline_serializer("ExamSubmit", {
            "answers": s.DictField(
                child=s.IntegerField(),
                help_text="Mapa {question_id: índice_da_alternativa}",
            ),
        }),
        responses={
            200: inline_serializer("ExamResult", {
                "score": s.IntegerField(),
                "passed": s.BooleanField(),
                "correct_count": s.IntegerField(),
                "total_questions": s.IntegerField(),
                "passing_score": s.IntegerField(),
                "question_results": s.DictField(),
            }),
            400: _error_msg,
        },
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit_exam(self, request, pk=None):
        course = self.get_object()

        if not course.has_final_exam:
            return Response(
                {'error': 'Este curso não possui prova final'},
                status=status.HTTP_400_BAD_REQUEST
            )

        answers = request.data.get('answers', {})
        questions = course.questions.all()
        total_questions = questions.count()

        if total_questions == 0:
            return Response(
                {'error': 'Este curso não possui questões cadastradas.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        question_map = {str(question.id): question for question in questions}
        if not isinstance(answers, dict) or set(answers) - set(question_map):
            return Response({'error': 'Respostas inválidas para esta prova.'}, status=status.HTTP_400_BAD_REQUEST)
        for question_id, answer in answers.items():
            if type(answer) is not int or not 0 <= answer < len(question_map[question_id].options):
                return Response({'error': 'Alternativa inválida.'}, status=status.HTTP_400_BAD_REQUEST)

        correct_count = 0
        question_results = {}
        for question in questions:
            q_id = str(question.id)
            user_answer = answers.get(q_id)
            is_correct = user_answer == question.correct_option
            if is_correct:
                correct_count += 1
            question_results[q_id] = {
                'correct': is_correct,
                'your_answer': user_answer,
                'correct_answer': question.correct_option,
            }

        score = int((correct_count / total_questions) * 100)
        passed = score >= course.passing_score

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


@extend_schema_view(
    list=extend_schema(
        tags=["Aulas"],
        summary="Lista aulas",
        parameters=[
            OpenApiParameter("course", OpenApiTypes.INT, description="Filtra por curso"),
            OpenApiParameter("is_active", OpenApiTypes.BOOL),
        ],
    ),
    retrieve=extend_schema(tags=["Aulas"], summary="Detalha aula"),
    create=extend_schema(tags=["Aulas"], summary="Cria aula"),
    update=extend_schema(tags=["Aulas"], summary="Atualiza aula"),
    partial_update=extend_schema(tags=["Aulas"], summary="Atualiza aula parcialmente"),
    destroy=extend_schema(tags=["Aulas"], summary="Remove aula"),
)
class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all().select_related('course')
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated, ContentPermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['course', 'is_active']
    ordering_fields = ['order', 'created_at']
    ordering = ['order']

    def get_queryset(self):
        from .visibility import visible_courses
        return super().get_queryset().filter(course__in=visible_courses(self.request.user))


    @extend_schema(tags=["Aulas"], summary="Marca aula como concluída",
                   responses={200: LessonProgressSerializer})
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def complete(self, request, pk=None):
        lesson = self.get_object()

        progress, created = LessonProgress.objects.get_or_create(
            user=request.user,
            lesson=lesson
        )

        if not progress.is_completed:
            progress.is_completed = True
            progress.completed_at = timezone.now()
            progress.save()

            self._update_course_progress(lesson.course, request.user)

        serializer = LessonProgressSerializer(progress)
        return Response(serializer.data)

    def _update_course_progress(self, course, user):
        total_lessons = course.lessons.filter(is_active=True).count()
        if total_lessons == 0:
            # Curso sem aulas: considera 100% se só tem prova
            progress, _ = CourseProgress.objects.get_or_create(user=user, course=course)
            progress.completion_percentage = 100
            if not course.has_final_exam or progress.exam_passed:
                if not progress.completed_at:
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

        if completion_percentage == 100 and not progress.completed_at:
            if not course.has_final_exam or progress.exam_passed:
                progress.completed_at = timezone.now()

        progress.save()


@extend_schema_view(
    list=extend_schema(
        tags=["Questões"],
        summary="Lista questões de prova",
        parameters=[OpenApiParameter("course", OpenApiTypes.INT, description="Filtra por curso")],
    ),
    retrieve=extend_schema(tags=["Questões"], summary="Detalha questão"),
    create=extend_schema(tags=["Questões"], summary="Cria questão"),
    update=extend_schema(tags=["Questões"], summary="Atualiza questão"),
    partial_update=extend_schema(tags=["Questões"], summary="Atualiza questão parcialmente"),
    destroy=extend_schema(tags=["Questões"], summary="Remove questão"),
)
class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all().select_related('course')
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated, ContentPermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['course']
    ordering_fields = ['order', 'created_at']
    ordering = ['order']

    def get_queryset(self):
        from .visibility import visible_courses
        return super().get_queryset().filter(course__in=visible_courses(self.request.user))



@extend_schema_view(
    list=extend_schema(
        tags=["Progresso"],
        summary="Lista progresso do usuário em todos os cursos",
        parameters=[
            OpenApiParameter("course", OpenApiTypes.INT),
            OpenApiParameter("exam_passed", OpenApiTypes.BOOL),
        ],
    ),
    retrieve=extend_schema(tags=["Progresso"], summary="Detalha progresso em um curso"),
)
class CourseProgressViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourseProgressSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course', 'exam_passed']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CourseProgress.objects.none()
        if not self.request.user.is_authenticated:
            return CourseProgress.objects.none()
        return CourseProgress.objects.filter(user=self.request.user).select_related('course')


@extend_schema_view(
    list=extend_schema(
        tags=["Certificados"],
        summary="Lista certificados do usuário",
        parameters=[OpenApiParameter("course", OpenApiTypes.INT)],
    ),
    retrieve=extend_schema(tags=["Certificados"], summary="Detalha certificado"),
)
class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Certificate.objects.none()
        if not self.request.user.is_authenticated:
            return Certificate.objects.none()
        return Certificate.objects.filter(user=self.request.user).select_related('course')

    @extend_schema(
        tags=["Certificados"],
        summary="Gera certificado para um curso concluído",
        request=inline_serializer("CertificateGenerate", {"course_id": s.IntegerField()}),
        responses={201: CertificateSerializer, 400: _error_msg, 404: _error_msg},
    )
    @action(detail=False, methods=['post'])
    def generate(self, request):
        from .tasks import generate_certificate_pdf

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

        if not IssuingCompany.objects.filter(pk=1).exists():
            return Response({'error': 'Cadastre a empresa emissora antes de emitir certificados.'}, status=status.HTTP_400_BAD_REQUEST)

        certificate, created = Certificate.objects.get_or_create(
            user=request.user,
            course=course
        )

        # Gera (ou re-gera) o PDF se não existir
        if not certificate.pdf_file:
            generate_certificate_pdf.delay(certificate.id)

        serializer = CertificateSerializer(certificate, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["Certificados"],
        summary="Re-gera o PDF de um certificado existente",
        responses={200: CertificateSerializer, 403: _error_msg},
    )
    @action(detail=True, methods=['post'])
    def regenerate_pdf(self, request, pk=None):
        from .tasks import generate_certificate_pdf

        certificate = self.get_object()

        if certificate.user != request.user and not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Sem permissão para re-gerar este certificado'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Remove o arquivo antigo para forçar a regeneração
        if certificate.pdf_file:
            try:
                certificate.pdf_file.delete(save=True)
            except Exception:
                pass

        generate_certificate_pdf.delay(certificate.id)

        serializer = CertificateSerializer(certificate, context={'request': request})
        return Response(serializer.data)


_dashboard_response = inline_serializer("DashboardStats", {
    "courses": inline_serializer("CourseStats", {
        "total": s.IntegerField(), "active": s.IntegerField(), "with_exam": s.IntegerField(),
    }),
    "enrollments": inline_serializer("EnrollmentStats", {
        "total": s.IntegerField(), "completed": s.IntegerField(),
        "in_progress": s.IntegerField(), "not_started": s.IntegerField(),
    }),
    "exams": inline_serializer("ExamStats", {
        "submitted": s.IntegerField(), "passed": s.IntegerField(),
        "approval_rate": s.IntegerField(), "avg_score": s.FloatField(),
    }),
    "certificates": inline_serializer("CertStats", {"total": s.IntegerField()}),
    "activity": inline_serializer("DayActivity", {
        "day": s.CharField(), "date": s.DateField(), "value": s.IntegerField(),
    }, many=True),
    "top_courses": inline_serializer("TopCourse", {
        "name": s.CharField(), "enrollments": s.IntegerField(),
    }, many=True),
})


@extend_schema_view(
    get=extend_schema(
        tags=["Dashboard"],
        summary="Estatísticas agregadas de cursos (admin)",
        description="Retorna totais de cursos, matrículas, provas, certificados e atividade dos últimos 7 dias.",
        responses={200: _dashboard_response},
    )
)
class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        now = timezone.now()
        seven_days_ago = now - timedelta(days=6)

        # ── Cursos ───────────────────────────────────────────
        total_courses = Course.objects.count()
        active_courses = Course.objects.filter(is_active=True).count()
        courses_with_exam = Course.objects.filter(has_final_exam=True, is_active=True).count()

        # ── Matrículas / progresso ────────────────────────────
        total_enrollments = CourseProgress.objects.count()
        completed = CourseProgress.objects.filter(completion_percentage=100).count()
        in_progress = CourseProgress.objects.filter(
            completion_percentage__gt=0, completion_percentage__lt=100
        ).count()

        # ── Aprovações em provas ──────────────────────────────
        exams_submitted = CourseProgress.objects.filter(exam_score__isnull=False).count()
        exams_passed = CourseProgress.objects.filter(exam_passed=True).count()
        approval_rate = round(exams_passed / exams_submitted * 100) if exams_submitted > 0 else 0

        avg_exam_score = CourseProgress.objects.filter(
            exam_score__isnull=False
        ).aggregate(avg=Avg('exam_score'))['avg']
        avg_exam_score = round(avg_exam_score or 0, 1)

        # ── Certificados ──────────────────────────────────────
        total_certificates = Certificate.objects.count()

        # ── Atividade dos últimos 7 dias (aulas concluídas por dia) ──
        activity_qs = (
            LessonProgress.objects
            .filter(is_completed=True, completed_at__gte=seven_days_ago)
            .annotate(day=TruncDate('completed_at'))
            .values('day')
            .annotate(value=Count('id'))
            .order_by('day')
        )
        activity_map = {row['day'].isoformat(): row['value'] for row in activity_qs}

        day_labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        activity = []
        for i in range(7):
            d = (seven_days_ago + timedelta(days=i)).date()
            activity.append({
                'day': day_labels[d.weekday() if d.weekday() != 6 else 6]
                       if d.weekday() != 6 else 'Dom',
                'date': d.isoformat(),
                'value': activity_map.get(d.isoformat(), 0),
            })
        # Corrige label de domingo (isoweekday: seg=0..dom=6)
        weekday_map = {0: 'Seg', 1: 'Ter', 2: 'Qua', 3: 'Qui', 4: 'Sex', 5: 'Sáb', 6: 'Dom'}
        activity = []
        for i in range(7):
            d = (seven_days_ago + timedelta(days=i)).date()
            activity.append({
                'day': weekday_map[d.weekday()],
                'date': d.isoformat(),
                'value': activity_map.get(d.isoformat(), 0),
            })

        # ── Cursos mais populares (mais matrículas) ───────────
        top_courses = (
            Course.objects
            .filter(is_active=True)
            .annotate(enrollments=Count('user_progress'))
            .order_by('-enrollments')[:5]
            .values('name', 'enrollments')
        )

        return Response({
            'courses': {
                'total': total_courses,
                'active': active_courses,
                'with_exam': courses_with_exam,
            },
            'enrollments': {
                'total': total_enrollments,
                'completed': completed,
                'in_progress': in_progress,
                'not_started': total_enrollments - completed - in_progress,
            },
            'exams': {
                'submitted': exams_submitted,
                'passed': exams_passed,
                'approval_rate': approval_rate,
                'avg_score': avg_exam_score,
            },
            'certificates': {
                'total': total_certificates,
            },
            'activity': activity,
            'top_courses': list(top_courses),
        })
