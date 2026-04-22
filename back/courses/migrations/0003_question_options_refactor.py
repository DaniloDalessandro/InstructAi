from django.db import migrations, models


LETTER_TO_INDEX = {'A': 0, 'B': 1, 'C': 2, 'D': 3}


def migrate_options_forward(apps, schema_editor):
    Question = apps.get_model('courses', 'Question')
    for question in Question.objects.all():
        raw_options = [
            question.option_a,
            question.option_b,
            question.option_c,
            question.option_d,
        ]
        # Keep only non-empty options to allow fewer than 4 alternatives
        options = [opt for opt in raw_options if opt and opt.strip()]
        question.options = options

        letter = (question.correct_option or 'A').upper()
        question.correct_index = LETTER_TO_INDEX.get(letter, 0)

        question.save()


def migrate_options_backward(apps, schema_editor):
    INDEX_TO_LETTER = {v: k for k, v in LETTER_TO_INDEX.items()}
    Question = apps.get_model('courses', 'Question')
    for question in Question.objects.all():
        options = question.options or []
        question.option_a = options[0] if len(options) > 0 else ''
        question.option_b = options[1] if len(options) > 1 else ''
        question.option_c = options[2] if len(options) > 2 else ''
        question.option_d = options[3] if len(options) > 3 else ''
        question.correct_option = INDEX_TO_LETTER.get(question.correct_index, 'A')
        question.save()


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0002_course_exam_duration_minutes'),
    ]

    operations = [
        # Step 1 — add new columns alongside the existing ones
        migrations.AddField(
            model_name='question',
            name='options',
            field=models.JSONField(default=list, verbose_name='Opções'),
        ),
        migrations.AddField(
            model_name='question',
            name='correct_index',
            field=models.IntegerField(default=0, verbose_name='Índice da Alternativa Correta (temporário)'),
        ),

        # Step 2 — populate new columns from old ones
        migrations.RunPython(migrate_options_forward, reverse_code=migrate_options_backward),

        # Step 3 — drop old fixed-option columns
        migrations.RemoveField(model_name='question', name='option_a'),
        migrations.RemoveField(model_name='question', name='option_b'),
        migrations.RemoveField(model_name='question', name='option_c'),
        migrations.RemoveField(model_name='question', name='option_d'),

        # Step 4 — drop the old correct_option CharField
        migrations.RemoveField(model_name='question', name='correct_option'),

        # Step 5 — rename correct_index to correct_option
        migrations.RenameField(
            model_name='question',
            old_name='correct_index',
            new_name='correct_option',
        ),
    ]
