from django.contrib import admin
from .models import Course, Lesson, Question, CourseProgress, LessonProgress, Certificate


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1
    fields = ['name', 'youtube_url', 'order', 'is_active']
    ordering = ['order']


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1
    fields = ['text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'order']
    ordering = ['order']


@admin.action(description='Ativar cursos selecionados')
def ativar_cursos(modeladmin, request, queryset):
    queryset.update(is_active=True)


@admin.action(description='Inativar cursos selecionados')
def inativar_cursos(modeladmin, request, queryset):
    queryset.update(is_active=False)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['name', 'sector', 'get_tags', 'has_final_exam', 'workload_hours', 'is_active', 'created_at']
    list_filter = ['is_active', 'has_final_exam', 'sector', 'tags', 'created_at']
    search_fields = ['name', 'description', 'created_by']
    filter_horizontal = ['tags']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    actions = [ativar_cursos, inativar_cursos]
    inlines = [LessonInline, QuestionInline]

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'description', 'sector', 'tags', 'is_active')
        }),
        ('Configurações do Curso', {
            'fields': ('workload_hours', 'has_final_exam', 'passing_score')
        }),
        ('Auditoria', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    def get_tags(self, obj):
        return ", ".join([tag.name for tag in obj.tags.all()])
    get_tags.short_description = 'Tags'

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user.email
        obj.updated_by = request.user.email
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        """Save formsets (inlines) with audit fields"""
        instances = formset.save(commit=False)
        for instance in instances:
            if not instance.pk:
                instance.created_by = request.user.email
            instance.updated_by = request.user.email
            instance.save()
        formset.save_m2m()


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['name', 'course', 'order', 'is_active', 'created_at']
    list_filter = ['is_active', 'course', 'created_at']
    search_fields = ['name', 'course__name']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    ordering = ['course', 'order']

    fieldsets = (
        ('Informações da Aula', {
            'fields': ('course', 'name', 'youtube_url', 'order', 'is_active')
        }),
        ('Auditoria', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user.email
        obj.updated_by = request.user.email
        super().save_model(request, obj, form, change)


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['get_question_preview', 'course', 'correct_option', 'order']
    list_filter = ['course', 'correct_option']
    search_fields = ['text', 'course__name']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    ordering = ['course', 'order']

    fieldsets = (
        ('Questão', {
            'fields': ('course', 'text', 'order')
        }),
        ('Alternativas', {
            'fields': ('option_a', 'option_b', 'option_c', 'option_d', 'correct_option')
        }),
        ('Auditoria', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    def get_question_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    get_question_preview.short_description = 'Questão'

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user.email
        obj.updated_by = request.user.email
        super().save_model(request, obj, form, change)


@admin.register(CourseProgress)
class CourseProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'completion_percentage', 'exam_score', 'exam_passed', 'completed_at']
    list_filter = ['exam_passed', 'course', 'created_at']
    search_fields = ['user__email', 'course__name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-updated_at']

    fieldsets = (
        ('Informações', {
            'fields': ('user', 'course')
        }),
        ('Progresso', {
            'fields': ('completion_percentage', 'exam_score', 'exam_passed', 'completed_at')
        }),
        ('Auditoria', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'lesson', 'is_completed', 'completed_at']
    list_filter = ['is_completed', 'lesson__course', 'created_at']
    search_fields = ['user__email', 'lesson__name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-updated_at']


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'validation_code', 'issued_at']
    list_filter = ['course', 'issued_at']
    search_fields = ['user__email', 'course__name', 'validation_code']
    readonly_fields = ['validation_code', 'issued_at', 'created_at']
    ordering = ['-issued_at']

    fieldsets = (
        ('Informações', {
            'fields': ('user', 'course', 'validation_code')
        }),
        ('Certificado', {
            'fields': ('pdf_file', 'issued_at')
        }),
        ('Auditoria', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
