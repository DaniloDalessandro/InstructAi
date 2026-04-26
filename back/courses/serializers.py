from rest_framework import serializers
from .models import Course, Lesson, Question, CourseProgress, LessonProgress, Certificate
from sectors.serializers import SectorSerializer
from tags.serializers import TagSerializer
from access.permissions import get_user_permissions


class LessonSerializer(serializers.ModelSerializer):
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

    def get_youtube_video_id(self, obj):
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


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer para Questão"""

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

    def get_can_generate_certificate(self, obj):
        """Verifica se pode gerar certificado"""
        return obj.can_generate_certificate()


class CourseSerializer(serializers.ModelSerializer):
    """Serializer para Curso"""
    sector_detail = SectorSerializer(source='sector', read_only=True)
    tags_detail = TagSerializer(many=True, source='tags', read_only=True)
    total_lessons = serializers.SerializerMethodField()
    lessons = LessonSerializer(many=True, read_only=True)
    questions = QuestionSerializer(many=True, read_only=True)
    user_permissions = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'name', 'description', 'sector', 'sector_detail',
            'tags', 'tags_detail', 'has_final_exam', 'passing_score',
            'workload_hours', 'exam_duration_minutes', 'is_active', 'total_lessons', 'lessons', 'questions',
            'created_at', 'updated_at', 'created_by', 'updated_by',
            'user_permissions',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_lessons', 'user_permissions']

    def get_total_lessons(self, obj):
        """Retorna o total de aulas ativas"""
        return obj.get_total_lessons()

    def get_user_permissions(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return get_user_permissions(request.user, obj)
        return {"can_edit": False, "can_delete": False, "can_manage_access": False}

    def create(self, validated_data):
        """Set created_by and handle many-to-many"""
        tags = validated_data.pop('tags', [])

        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user.email

        validated_data['is_active'] = True

        course = Course.objects.create(**validated_data)

        if tags:
            course.tags.set(tags)

        return course

    def update(self, instance, validated_data):
        """Set updated_by and handle many-to-many"""
        tags = validated_data.pop('tags', None)

        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user.email

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tags is not None:
            instance.tags.set(tags)

        return instance


class CourseListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para lista de cursos"""
    sector_detail = SectorSerializer(source='sector', read_only=True)
    tags_detail = TagSerializer(many=True, source='tags', read_only=True)
    total_lessons = serializers.SerializerMethodField()
    first_lesson_video_id = serializers.SerializerMethodField()
    user_progress = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'name', 'description', 'sector', 'sector_detail',
            'tags', 'tags_detail', 'total_lessons', 'first_lesson_video_id',
            'user_progress', 'workload_hours', 'is_active'
        ]

    def get_total_lessons(self, obj):
        """Retorna o total de aulas ativas"""
        return obj.get_total_lessons()

    def get_first_lesson_video_id(self, obj):
        """Retorna o ID do vídeo da primeira aula para thumbnail"""
        first_lesson = obj.lessons.filter(is_active=True).order_by('order').first()
        if first_lesson:
            return first_lesson.get_youtube_video_id()
        return None

    def get_user_progress(self, obj):
        """Retorna o progresso do usuário no curso"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
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
            'validation_code', 'pdf_file', 'pdf_url', 'issued_at', 'created_at'
        ]
        read_only_fields = ['id', 'validation_code', 'issued_at', 'created_at', 'pdf_url']

    def get_pdf_url(self, obj):
        """Retorna a URL completa do PDF"""
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
            return obj.pdf_file.url
        return None
