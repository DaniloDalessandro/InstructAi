from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count, Q
from django.utils import timezone
from .models import Course, Lesson, Question, CourseProgress, LessonProgress, Certificate, CourseReminderLog


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1
    fields = ['name', 'youtube_url', 'order', 'is_active']
    ordering = ['order']


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1
    fields = ['text', 'options', 'correct_option', 'order']
    ordering = ['order']


@admin.action(description='Ativar cursos selecionados')
def ativar_cursos(modeladmin, request, queryset):
    queryset.update(is_active=True)


@admin.action(description='Inativar cursos selecionados')
def inativar_cursos(modeladmin, request, queryset):
    queryset.update(is_active=False)


@admin.action(description='🤖 Indexar na base de conhecimento da Alice')
def indexar_cursos_alice(modeladmin, request, queryset):
    from documents.tasks import index_course
    count = 0
    for course in queryset:
        index_course.delay(course.id)
        count += 1
    modeladmin.message_user(request, f'{count} curso(s) enviado(s) para indexação na Alice.')


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['name', 'sector', 'get_tags', 'has_final_exam', 'workload_hours', 'is_active', 'alice_status_badge', 'created_at']
    list_filter = ['is_active', 'has_final_exam', 'sector', 'tags', 'created_at']
    search_fields = ['name', 'description', 'created_by']
    filter_horizontal = ['tags']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'alice_status_badge']
    actions = [ativar_cursos, inativar_cursos, indexar_cursos_alice]
    inlines = [LessonInline, QuestionInline]

    def alice_status_badge(self, obj):
        from documents.models import KnowledgeDocument
        doc = KnowledgeDocument.objects.filter(source_type='course', source_id=str(obj.id)).first()
        if not doc:
            return format_html('<span style="color:#8a8f98;font-size:11px">Não indexado</span>')
        colors = {'indexed': '#10b981', 'processing': '#5e6ad2', 'pending': '#f59e0b', 'error': '#e5484d'}
        labels = {'indexed': '✓ Indexado', 'processing': '⟳ Processando', 'pending': '⏳ Pendente', 'error': '✗ Erro'}
        color = colors.get(doc.status, '#8a8f98')
        label = labels.get(doc.status, doc.status)
        extra = f' ({doc.chunk_count} chunks)' if doc.status == 'indexed' else ''
        return format_html('<span style="color:{};font-size:11px;font-weight:500">{}{}</span>', color, label, extra)
    alice_status_badge.short_description = 'Alice'

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'description', 'sector', 'tags', 'is_active')
        }),
        ('Configurações do Curso', {
            'fields': ('workload_hours', 'has_final_exam', 'passing_score')
        }),
        ('Disponibilidade e Lembretes', {
            'fields': (
                'available_for_all_sectors', 'allowed_sectors',
                'available_from', 'available_until',
                'reminders_enabled',
            ),
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


# ── Ações do painel de lembretes ──────────────────────────────────────────────

@admin.action(description='Reenviar lembretes selecionados')
def reenviar_lembretes(modeladmin, request, queryset):
    from courses.tasks import resend_reminder
    groups = {}
    for log in queryset.select_related('course', 'user'):
        key = (log.course_id, log.reminder_type)
        groups.setdefault(key, []).append(log.user_id)

    for (course_id, reminder_type), user_ids in groups.items():
        resend_reminder.delay(course_id, reminder_type, user_ids)

    modeladmin.message_user(
        request,
        f'{queryset.count()} lembrete(s) enfileirado(s) para reenvio.',
    )


@admin.register(CourseReminderLog)
class CourseReminderLogAdmin(admin.ModelAdmin):
    list_display  = [
        'sent_at_display', 'course_link', 'user_display',
        'reminder_badge', 'status_badge', 'error_preview',
    ]
    list_filter   = ['reminder_type', 'status', 'course', 'sent_at']
    search_fields = ['user__email', 'user__name', 'course__name']
    readonly_fields = [
        'course', 'user', 'reminder_type', 'sent_at', 'status', 'error_message',
    ]
    ordering  = ['-sent_at']
    actions   = [reenviar_lembretes]
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    # ── Colunas customizadas ──────────────────────────────────────────────────

    def sent_at_display(self, obj):
        local = timezone.localtime(obj.sent_at)
        return format_html(
            '<span style="font-size:12px">{}</span>',
            local.strftime('%d/%m/%Y %H:%M'),
        )
    sent_at_display.short_description = 'Enviado em'
    sent_at_display.admin_order_field = 'sent_at'

    def course_link(self, obj):
        return format_html(
            '<span style="font-size:12px;font-weight:500">{}</span>',
            obj.course.name,
        )
    course_link.short_description = 'Curso'
    course_link.admin_order_field = 'course__name'

    def user_display(self, obj):
        return format_html(
            '<span style="font-size:12px;font-weight:500">{}</span>'
            '<br><span style="font-size:11px;color:#8a8f98">{}</span>',
            obj.user.name or '—',
            obj.user.email,
        )
    user_display.short_description = 'Usuário'
    user_display.admin_order_field = 'user__email'

    def reminder_badge(self, obj):
        colors = {'72h': '#5e6ad2', '48h': '#f59e0b', '24h': '#e5484d'}
        color = colors.get(obj.reminder_type, '#8a8f98')
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 9px;border-radius:4px;'
            'font-size:11px;font-weight:700">{}</span>',
            color, obj.get_reminder_type_display(),
        )
    reminder_badge.short_description = 'Lembrete'
    reminder_badge.admin_order_field = 'reminder_type'

    def status_badge(self, obj):
        if obj.status == 'sent':
            return format_html(
                '<span style="background:#10b981;color:#fff;padding:2px 9px;'
                'border-radius:4px;font-size:11px;font-weight:600">Enviado</span>'
            )
        return format_html(
            '<span style="background:#e5484d;color:#fff;padding:2px 9px;'
            'border-radius:4px;font-size:11px;font-weight:600">Falhou</span>'
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    def error_preview(self, obj):
        if not obj.error_message:
            return format_html('<span style="color:#8a8f98;font-size:11px">—</span>')
        preview = obj.error_message[:80] + ('…' if len(obj.error_message) > 80 else '')
        return format_html('<span style="color:#e5484d;font-size:11px">{}</span>', preview)
    error_preview.short_description = 'Erro'

    # ── Painel de estatísticas no topo da listagem ───────────────────���────────

    def changelist_view(self, request, extra_context=None):
        from django.db.models import Count

        stats = CourseReminderLog.objects.aggregate(
            total=Count('id'),
            sent=Count('id', filter=Q(status='sent')),
            failed=Count('id', filter=Q(status='failed')),
            last_72h=Count('id', filter=Q(reminder_type='72h', status='sent')),
            last_48h=Count('id', filter=Q(reminder_type='48h', status='sent')),
            last_24h=Count('id', filter=Q(reminder_type='24h', status='sent')),
        )

        # Última execução da task
        from django_redis import get_redis_connection
        last_run = None
        try:
            rc = get_redis_connection('default')
            val = rc.get('course_reminders:last_run')
            if val:
                last_run = val.decode()
        except Exception:
            pass

        extra_context = extra_context or {}
        extra_context['reminder_stats'] = stats
        extra_context['reminder_last_run'] = last_run
        return super().changelist_view(request, extra_context=extra_context)

    class Media:
        css = {'all': []}  # Placeholder para override de template se necessário
