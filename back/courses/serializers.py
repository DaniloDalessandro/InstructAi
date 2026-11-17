from rest_framework import serializers
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field, inline_serializer
from .models import Course, Lesson, Question, CourseProgress, LessonProgress, Certificate
from sectors.serializers import SectorSerializer
from tags.serializers import TagSerializer
from access.permissions import get_user_permissions

_permissions_field = inline_serializer("CourseUserPermissions", {
    "can_edit": serializers.BooleanField(),
    "can_delete": serializers.BooleanField(),
    "can_manage_access": serializers.BooleanField(),
})

_user_progress_field = inline_serializer("CourseUserProgressSummary", {
    "completion_percentage": serializers.IntegerField(),
    "exam_passed": serializers.BooleanField(),
    "completed_at": serializers.DateTimeField(allow_null=True),
})


class CourseChildSerializer(serializers.ModelSerializer):
    def validate(self, data):
        from rest_framework.exceptions import PermissionDenied
        course = data.get('course') or getattr(self.instance, 'course', None)
        request = self.context.get('request')
        if request and course and not get_user_permissions(request.user, course)['can_edit']:
            raise PermissionDenied('Você não tem permissão para editar este curso.')
        return data


class LessonSerializer(CourseChildSerializer):
    """Serializer para Aula"""
    youtube_video_id = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id', 'course', 'name', 'youtube_url', 'youtube_video_id',
            'order', 'is_active', 'created_at', 'updated_at',
            'created_by', 'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'youtube_video_id']

    @extend_schema_field(OpenApiTypes.STR)
    def get_youtube_video_id(self, obj: Lesson) -> str | None:
        """Retorna o ID do vídeo do YouTube"""
        return obj.get_youtube_video_id()

    def create(self, validated_data):
        """Set created_by from request user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user.email
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Set updated_by from request user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user.email
        return super().update(instance, validated_data)


class QuestionSerializer(CourseChildSerializer):
    """Serializer para Questão"""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and not get_user_permissions(request.user, instance.course)['can_edit']:
            data.pop('correct_option', None)
        return data

    def validate(self, data):
        data = super().validate(data)
        options = data.get('options', getattr(self.instance, 'options', []))
        correct = data.get('correct_option', getattr(self.instance, 'correct_option', 0))
        if not isinstance(options, list) or not 2 <= len(options) <= 4 or any(not isinstance(option, str) or not option.strip() for option in options):
            raise serializers.ValidationError({'options':'Informe de duas a quatro alternativas preenchidas.'})
        if type(correct) is not int or not 0 <= correct < len(options):
            raise serializers.ValidationError({'correct_option':'Selecione uma alternativa correta existente.'})
        return data

    class Meta:
        model = Question
        fields = [
            'id', 'course', 'text', 'options', 'correct_option', 'order',
            'created_at', 'updated_at', 'created_by', 'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        """Set created_by from request user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user.email
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Set updated_by from request user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user.email
        return super().update(instance, validated_data)


class QuestionPublicSerializer(serializers.ModelSerializer):
    """Serializer público para Questão (sem resposta correta)"""

    class Meta:
        model = Question
        fields = ['id', 'text', 'options', 'order']
        read_only_fields = ['id']


class LessonProgressSerializer(serializers.ModelSerializer):
    """Serializer para Progresso da Aula"""
    lesson_name = serializers.CharField(source='lesson.name', read_only=True)

    class Meta:
        model = LessonProgress
        fields = [
            'id', 'user', 'lesson', 'lesson_name', 'is_completed',
            'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'lesson_name']


class CourseProgressSerializer(serializers.ModelSerializer):
    """Serializer para Progresso do Curso"""
    course_name = serializers.CharField(source='course.name', read_only=True)
    can_generate_certificate = serializers.SerializerMethodField()

    class Meta:
        model = CourseProgress
        fields = [
            'id', 'user', 'course', 'course_name', 'completion_percentage',
            'exam_score', 'exam_passed', 'completed_at', 'can_generate_certificate',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'course_name', 'can_generate_certificate']

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_can_generate_certificate(self, obj: CourseProgress) -> bool:
        """Verifica se pode gerar certificado"""
        return obj.can_generate_certificate()


class CourseSerializer(serializers.ModelSerializer):
    """Serializer para Curso"""
    sector_detail = SectorSerializer(source='sector', read_only=True)
    tags_detail = TagSerializer(many=True, source='tags', read_only=True)
    allowed_sectors_detail = SectorSerializer(many=True, source='allowed_sectors', read_only=True)
    total_lessons = serializers.SerializerMethodField()
    lessons = LessonSerializer(many=True, read_only=True)
    questions = QuestionSerializer(many=True, read_only=True)
    user_permissions = serializers.SerializerMethodField()
    availability_status = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'name', 'description', 'sector', 'sector_detail',
            'tags', 'tags_detail', 'has_final_exam', 'passing_score',
            'workload_hours', 'exam_duration_minutes', 'is_active', 'total_lessons', 'lessons', 'questions',
            'available_for_all_sectors', 'allowed_sectors', 'allowed_sectors_detail',
            'available_from', 'available_until',
            'send_email_notification', 'notification_sent_at',
            'availability_status',
            'created_at', 'updated_at', 'created_by', 'updated_by',
            'user_permissions',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'total_lessons',
            'user_permissions', 'notification_sent_at', 'availability_status',
        ]

    @extend_schema_field(OpenApiTypes.INT)
    def get_total_lessons(self, obj: Course) -> int:
        return obj.get_total_lessons()

    @extend_schema_field(OpenApiTypes.STR)
    def get_availability_status(self, obj: Course) -> str:
        return obj.get_availability_status()

    @extend_schema_field(_permissions_field)
    def get_user_permissions(self, obj: Course) -> dict[str, bool]:
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return get_user_permissions(request.user, obj)
        return {"can_edit": False, "can_delete": False, "can_manage_access": False}

    def validate(self, data):
        available_from = data.get('available_from')
        available_until = data.get('available_until')
        if available_from and available_until and available_until <= available_from:
            raise serializers.ValidationError(
                {'available_until': 'A data de término deve ser posterior à data de início.'}
            )
        return data

    def create(self, validated_data):
        """Set created_by and handle many-to-many"""
        tags = validated_data.pop('tags', [])
        allowed_sectors = validated_data.pop('allowed_sectors', [])

        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user.email

        validated_data['is_active'] = True

        course = Course.objects.create(**validated_data)

        if tags:
            course.tags.set(tags)
        if allowed_sectors:
            course.allowed_sectors.set(allowed_sectors)

        return course

    def update(self, instance, validated_data):
        """Set updated_by and handle many-to-many"""
        tags = validated_data.pop('tags', None)
        allowed_sectors = validated_data.pop('allowed_sectors', None)

        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user.email

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tags is not None:
            instance.tags.set(tags)
        if allowed_sectors is not None:
            instance.allowed_sectors.set(allowed_sectors)

        return instance


class CourseListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para lista de cursos"""
    sector_detail = SectorSerializer(source='sector', read_only=True)
    tags_detail = TagSerializer(many=True, source='tags', read_only=True)
    total_lessons = serializers.SerializerMethodField()
    first_lesson_video_id = serializers.SerializerMethodField()
    user_progress = serializers.SerializerMethodField()
    availability_status = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'name', 'description', 'sector', 'sector_detail',
            'tags', 'tags_detail', 'total_lessons', 'first_lesson_video_id',
            'user_progress', 'workload_hours', 'is_active',
            'available_from', 'available_until', 'availability_status',
        ]

    @extend_schema_field(OpenApiTypes.INT)
    def get_total_lessons(self, obj: Course) -> int:
        return obj.get_total_lessons()

    @extend_schema_field(OpenApiTypes.STR)
    def get_availability_status(self, obj: Course) -> str:
        return obj.get_availability_status()

    @extend_schema_field(OpenApiTypes.STR)
    def get_first_lesson_video_id(self, obj: Course) -> str | None:
        """Retorna o ID do vídeo da primeira aula para thumbnail"""
        first_lesson = obj.lessons.filter(is_active=True).order_by('order').first()
        if first_lesson:
            return first_lesson.get_youtube_video_id()
        return None

    @extend_schema_field(_user_progress_field)
    def get_user_progress(self, obj: Course) -> dict[str, object] | None:
        """Retorna o progresso do usuário no curso"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            try:
                progress = CourseProgress.objects.get(user=request.user, course=obj)
                return {
                    'completion_percentage': progress.completion_percentage,
                    'exam_passed': progress.exam_passed,
                    'completed_at': progress.completed_at
                }
            except CourseProgress.DoesNotExist:
                return {
                    'completion_percentage': 0,
                    'exam_passed': False,
                    'completed_at': None
                }
        return None


class CertificateSerializer(serializers.ModelSerializer):
    """Serializer para Certificado"""
    course_name = serializers.CharField(source='course.name', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            'id', 'user', 'user_name', 'course', 'course_name',
            'validation_code', 'pdf_file', 'pdf_url', 'issued_at', 'created_at', 'issuer_snapshot'
        ]
        read_only_fields = ['id', 'validation_code', 'issued_at', 'created_at', 'pdf_url', 'issuer_snapshot']

    @extend_schema_field(OpenApiTypes.URI)
    def get_pdf_url(self, obj: Certificate) -> str | None:
        """Retorna a URL completa do PDF"""
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
            return obj.pdf_file.url
        return None
